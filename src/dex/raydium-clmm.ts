/**
 * Raydium CLMM (Concentrated Liquidity Market Maker) DEX Adapter
 *
 * Implements IDexAdapter for Raydium's CLMM program (CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK).
 * Supports buy, sell, snipe, findPool, getPrice, and buildSwapIxs.
 *
 * Uses the native IX path (buy-v2.ts) for snipe and the SDK path for regular buy/sell.
 *
 * Ported from: 100x-algo-bots/trading-modules/raydium-clmm/
 */

import {
  PublicKey,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import Decimal from "decimal.js";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapResult,
  PoolInfo,
  PriceInfo,
  BuildSwapIxsResult,
  UnsupportedOperationError,
  PoolNotFoundError,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
} from "./types";
import { registerAdapter } from "./index";
import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK");
const TOKEN_PROGRAM_ID_PK = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);
const USDT_MINT_PK = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
const USD1_MINT_PK = new PublicKey("USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB");

// Swap V2 discriminator
const SWAP_V2_DISCRIMINATOR = Buffer.from([43, 4, 237, 11, 26, 201, 30, 98]);

// Tick array constants
const TICK_ARRAY_SIZE = 60;
const MIN_SQRT_PRICE_X64 = new BN("4295048016");
const MAX_SQRT_PRICE_X64 = new BN("79226673515401279992447579055");

// PDA seeds
const POOL_SEED = Buffer.from("pool", "utf8");
const POOL_VAULT_SEED = Buffer.from("pool_vault", "utf8");
const OBSERVATION_SEED = Buffer.from("observation", "utf8");
const TICK_ARRAY_SEED = Buffer.from("tick_array", "utf8");
const POOL_TICK_ARRAY_BITMAP_SEED = Buffer.from("pool_tick_array_bitmap_extension", "utf8");
const AMM_CONFIG_SEED = Buffer.from("amm_config", "utf8");

// ---------------------------------------------------------------------------
// PDA helpers (ported from raydium-clmm/utils/pda-native.ts)
// ---------------------------------------------------------------------------

function i32ToBytes(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(value, 0);
  return buf;
}

function u16ToBytes(value: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(value, 0);
  return buf;
}

function derivePda(seeds: Buffer[]): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(seeds, RAYDIUM_CLMM_PROGRAM_ID);
  return pda;
}

function derivePoolVault(poolId: PublicKey, vaultMint: PublicKey): PublicKey {
  return derivePda([POOL_VAULT_SEED, poolId.toBuffer(), vaultMint.toBuffer()]);
}

function deriveObservationState(poolId: PublicKey): PublicKey {
  return derivePda([OBSERVATION_SEED, poolId.toBuffer()]);
}

function deriveTickArray(poolId: PublicKey, startIndex: number): PublicKey {
  return derivePda([TICK_ARRAY_SEED, poolId.toBuffer(), i32ToBytes(startIndex)]);
}

function deriveTickArrayBitmapExtension(poolId: PublicKey): PublicKey {
  return derivePda([POOL_TICK_ARRAY_BITMAP_SEED, poolId.toBuffer()]);
}

function deriveAmmConfig(index: number): PublicKey {
  return derivePda([AMM_CONFIG_SEED, u16ToBytes(index)]);
}

function derivePoolId(ammConfig: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey {
  return derivePda([POOL_SEED, ammConfig.toBuffer(), mintA.toBuffer(), mintB.toBuffer()]);
}

// ---------------------------------------------------------------------------
// Pool state decoder (ported from raydium-clmm/utils/pool-state.ts)
// ---------------------------------------------------------------------------

interface ClmmPoolState {
  bump: number;
  ammConfig: PublicKey;
  owner: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  observationKey: PublicKey;
  mintDecimals0: number;
  mintDecimals1: number;
  tickSpacing: number;
  liquidity: BN;
  sqrtPriceX64: BN;
  tickCurrent: number;
  status: number;
  tickArrayBitmap: BN[];
}

function decodeClmmPoolState(data: Buffer): ClmmPoolState {
  let offset = 8; // skip discriminator

  const bump = data.readUInt8(offset); offset += 1;
  const ammConfig = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const tokenMint0 = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const tokenMint1 = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const tokenVault0 = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const tokenVault1 = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const observationKey = new PublicKey(data.slice(offset, offset + 32)); offset += 32;

  const mintDecimals0 = data.readUInt8(offset); offset += 1;
  const mintDecimals1 = data.readUInt8(offset); offset += 1;
  const tickSpacing = data.readUInt16LE(offset); offset += 2;
  const liquidity = new BN(data.slice(offset, offset + 16), "le"); offset += 16;
  const sqrtPriceX64 = new BN(data.slice(offset, offset + 16), "le"); offset += 16;
  const tickCurrent = data.readInt32LE(offset); offset += 4;

  // Skip padding3 (u16), padding4 (u16)
  offset += 4;
  // Skip fee_growth_global_0_x64 (u128), fee_growth_global_1_x64 (u128)
  offset += 32;
  // Skip protocol_fees_token_0 (u64), protocol_fees_token_1 (u64)
  offset += 16;
  // Skip swap_in_amount_token_0 (u128), swap_out_amount_token_1 (u128), swap_in_amount_token_1 (u128), swap_out_amount_token_0 (u128)
  offset += 64;

  const status = data.readUInt8(offset); offset += 1;
  // Skip padding (7 bytes)
  offset += 7;
  // Skip rewardInfos: 3 * 169 = 507 bytes
  offset += 507;

  // tickArrayBitmap: 16 u64 values
  const tickArrayBitmap: BN[] = [];
  for (let i = 0; i < 16; i++) {
    tickArrayBitmap.push(new BN(data.slice(offset, offset + 8), "le"));
    offset += 8;
  }

  return {
    bump, ammConfig, owner, tokenMint0, tokenMint1, tokenVault0, tokenVault1,
    observationKey, mintDecimals0, mintDecimals1, tickSpacing, liquidity,
    sqrtPriceX64, tickCurrent, status, tickArrayBitmap,
  };
}

async function fetchClmmPoolState(connection: Connection, poolId: PublicKey): Promise<ClmmPoolState> {
  const accountInfo = await connection.getAccountInfo(poolId);
  if (!accountInfo) throw new Error(`Pool state account not found: ${poolId.toBase58()}`);
  if (!accountInfo.owner.equals(RAYDIUM_CLMM_PROGRAM_ID)) {
    throw new Error(`Invalid account owner for pool state: ${accountInfo.owner.toBase58()}`);
  }
  return decodeClmmPoolState(accountInfo.data);
}

// ---------------------------------------------------------------------------
// Tick array helpers
// ---------------------------------------------------------------------------

function tickToStartIndex(tick: number, tickSpacing: number): number {
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE;
  let startIndex = Math.floor(tick / ticksInArray) * ticksInArray;
  if (tick < 0 && tick % ticksInArray !== 0) {
    startIndex -= ticksInArray;
  }
  return startIndex;
}

function getNextTickArrayStartIndex(currentStartIndex: number, tickSpacing: number, zeroForOne: boolean): number {
  const ticksInArray = tickSpacing * TICK_ARRAY_SIZE;
  return zeroForOne ? currentStartIndex - ticksInArray : currentStartIndex + ticksInArray;
}

async function getTickArraysForSwap(
  connection: Connection,
  poolId: PublicKey,
  tickCurrent: number,
  tickSpacing: number,
  zeroForOne: boolean,
  maxArrays = 3,
): Promise<PublicKey[]> {
  const startIndex = tickToStartIndex(tickCurrent, tickSpacing);
  const tickArrays: PublicKey[] = [];
  let currentStart = startIndex;

  for (let i = 0; i < maxArrays; i++) {
    const tickArrayAddress = deriveTickArray(poolId, currentStart);
    try {
      const info = await connection.getAccountInfo(tickArrayAddress);
      if (info && info.owner.equals(RAYDIUM_CLMM_PROGRAM_ID)) {
        tickArrays.push(tickArrayAddress);
      }
    } catch {
      // Skip
    }
    currentStart = getNextTickArrayStartIndex(currentStart, tickSpacing, zeroForOne);
  }

  // Must have at least one tick array
  if (tickArrays.length === 0) {
    // Use the start index tick array anyway (it may get created)
    tickArrays.push(deriveTickArray(poolId, startIndex));
  }

  return tickArrays;
}

// ---------------------------------------------------------------------------
// Token program detection
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID_PK;
}

function isStablecoin(mint: PublicKey): boolean {
  return mint.equals(USDC_MINT_PK) || mint.equals(USDT_MINT_PK) || mint.equals(USD1_MINT_PK);
}

// ---------------------------------------------------------------------------
// Price calculation
// ---------------------------------------------------------------------------

function sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): number {
  try {
    const { MathUtil } = require("@raydium-io/raydium-sdk-v2");
    const price = MathUtil.x64ToDecimal(sqrtPriceX64)
      .pow(2)
      .mul(new Decimal(10).pow(decimalsA - decimalsB));
    return Number(price.toString());
  } catch {
    // Fallback manual calculation
    const sqrtPrice = Number(sqrtPriceX64.toString()) / 2 ** 64;
    const price = sqrtPrice * sqrtPrice;
    const decimalAdj = 10 ** (decimalsA - decimalsB);
    return price * decimalAdj;
  }
}

// ---------------------------------------------------------------------------
// Native IX builder (ported from raydium-clmm/sdk.ts — swap_v2)
// ---------------------------------------------------------------------------

interface ClmmSwapIxParams {
  poolId: PublicKey;
  ammConfig: PublicKey;
  observationState: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
}

function createClmmSwapV2Ix(
  poolParams: ClmmSwapIxParams,
  payer: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  amount: bigint,
  otherAmountThreshold: bigint,
  sqrtPriceLimitX64: BN,
  isBaseInput: boolean,
  tickArrays: PublicKey[],
  inputVaultMint: PublicKey,
  outputVaultMint: PublicKey,
  tickArrayBitmapExtension: PublicKey,
): TransactionInstruction {
  const inputVault = isBaseInput ? poolParams.tokenVault0 : poolParams.tokenVault1;
  const outputVault = isBaseInput ? poolParams.tokenVault1 : poolParams.tokenVault0;

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolParams.ammConfig, isSigner: false, isWritable: false },
    { pubkey: poolParams.poolId, isSigner: false, isWritable: true },
    { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: inputVault, isSigner: false, isWritable: true },
    { pubkey: outputVault, isSigner: false, isWritable: true },
    { pubkey: poolParams.observationState, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID_PK, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: inputVaultMint, isSigner: false, isWritable: false },
    { pubkey: outputVaultMint, isSigner: false, isWritable: false },
    { pubkey: tickArrayBitmapExtension, isSigner: false, isWritable: true },
    { pubkey: tickArrays[0], isSigner: false, isWritable: true },
  ];

  // Additional tick arrays as remaining accounts
  const remainingAccounts = tickArrays.slice(1).map((ta) => ({
    pubkey: ta,
    isSigner: false,
    isWritable: true,
  }));

  // Data: discriminator (8) + amount (8) + threshold (8) + sqrtPriceLimit (16) + isBaseInput (1) = 41 bytes
  const data = Buffer.alloc(41);
  let offset = 0;
  SWAP_V2_DISCRIMINATOR.copy(data, offset); offset += 8;
  data.writeBigUInt64LE(amount, offset); offset += 8;
  data.writeBigUInt64LE(otherAmountThreshold, offset); offset += 8;
  const sqrtPriceBytes = sqrtPriceLimitX64.toArrayLike(Buffer, "le", 16);
  sqrtPriceBytes.copy(data, offset); offset += 16;
  data.writeUInt8(isBaseInput ? 1 : 0, offset);

  return new TransactionInstruction({
    keys: [...accounts, ...remainingAccounts],
    programId: RAYDIUM_CLMM_PROGRAM_ID,
    data,
  });
}

// ---------------------------------------------------------------------------
// Pool discovery
// ---------------------------------------------------------------------------

const COMMON_AMM_CONFIG = new PublicKey("E64NGkDLLCdQ2yFNPcavaKptrEgmiQaNykUuLC1Qgwyp");

async function discoverClmmPool(
  connection: Connection,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): Promise<PublicKey | null> {
  // Try the common AMM config with both mint orderings
  const candidates = [
    derivePoolId(COMMON_AMM_CONFIG, baseMint, quoteMint),
    derivePoolId(COMMON_AMM_CONFIG, quoteMint, baseMint),
  ];

  for (const poolId of candidates) {
    try {
      const info = await connection.getAccountInfo(poolId);
      if (info && info.owner.equals(RAYDIUM_CLMM_PROGRAM_ID)) {
        return poolId;
      }
    } catch {
      // skip
    }
  }

  // Try via Raydium API as fallback
  try {
    const { Raydium } = await import("@raydium-io/raydium-sdk-v2");
    const raydium = await Raydium.load({
      connection,
      disableLoadToken: true,
    });
    const pools = await raydium.api.fetchPoolByMints({
      mint1: quoteMint.toBase58(),
      mint2: baseMint.toBase58(),
    });
    for (const obj of pools) {
      if (obj.type === "Concentrated") {
        return new PublicKey(obj.id);
      }
    }
  } catch {
    // API unavailable
  }

  return null;
}

// ---------------------------------------------------------------------------
// Token balance helper
// ---------------------------------------------------------------------------

async function getTokenBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<{ amount: bigint; decimals: number }> {
  const tokenProgram = await getTokenProgramForMint(connection, mint);
  const ata = await getAssociatedTokenAddress(
    mint, owner, tokenProgram.equals(TOKEN_2022_PROGRAM_ID), tokenProgram,
  );
  try {
    const res = await connection.getTokenAccountBalance(ata);
    return { amount: BigInt(res.value.amount), decimals: res.value.decimals };
  } catch {
    return { amount: 0n, decimals: 0 };
  }
}

// ---------------------------------------------------------------------------
// Build swap instructions (shared between snipe and buildSwapIxs)
// ---------------------------------------------------------------------------

async function buildClmmSwapInstructions(
  connection: Connection,
  wallet: Keypair,
  tokenMint: PublicKey,
  quoteMintPk: PublicKey,
  poolId: PublicKey,
  amountIn: bigint,
  minOut: bigint,
  priorityFee: number,
  includeComputeBudget: boolean,
): Promise<TransactionInstruction[]> {
  const poolState = await fetchClmmPoolState(connection, poolId);

  // Detect base token program
  const baseTokenProgram = await getTokenProgramForMint(connection, tokenMint);

  // Determine swap direction
  // We're buying tokenMint with quoteMint, so input is quoteMint
  const isBaseInput = poolState.tokenMint0.equals(quoteMintPk);
  const zeroForOne = isBaseInput;

  // Calculate sqrt price limit
  let sqrtPriceLimitX64: BN;
  if (isBaseInput) {
    sqrtPriceLimitX64 = MIN_SQRT_PRICE_X64.add(new BN(1));
  } else {
    sqrtPriceLimitX64 = MAX_SQRT_PRICE_X64.sub(new BN(1));
  }

  // Get tick arrays
  const tickArrays = await getTickArraysForSwap(
    connection, poolId, poolState.tickCurrent, poolState.tickSpacing, zeroForOne,
  );

  // Build ATAs
  const inputMintTokenProgram = await getTokenProgramForMint(connection, quoteMintPk);
  const inputAta = await getAssociatedTokenAddress(
    quoteMintPk, wallet.publicKey, inputMintTokenProgram.equals(TOKEN_2022_PROGRAM_ID), inputMintTokenProgram,
  );
  const outputAta = await getAssociatedTokenAddress(
    tokenMint, wallet.publicKey, baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID), baseTokenProgram,
  );

  const tickArrayBitmapExt = deriveTickArrayBitmapExtension(poolId);
  const observationState = deriveObservationState(poolId);

  // Determine input/output vault mints
  const inputVaultMint = isBaseInput ? poolState.tokenMint0 : poolState.tokenMint1;
  const outputVaultMint = isBaseInput ? poolState.tokenMint1 : poolState.tokenMint0;

  const poolParams: ClmmSwapIxParams = {
    poolId,
    ammConfig: poolState.ammConfig,
    observationState,
    tokenVault0: poolState.tokenVault0,
    tokenVault1: poolState.tokenVault1,
    tokenMint0: poolState.tokenMint0,
    tokenMint1: poolState.tokenMint1,
  };

  const swapIx = createClmmSwapV2Ix(
    poolParams,
    wallet.publicKey,
    inputAta,
    outputAta,
    amountIn,
    minOut,
    sqrtPriceLimitX64,
    isBaseInput,
    tickArrays,
    inputVaultMint,
    outputVaultMint,
    tickArrayBitmapExt,
  );

  // Build instruction list
  const ixs: TransactionInstruction[] = [];

  if (includeComputeBudget) {
    ixs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
  }

  ixs.push(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk, inputMintTokenProgram,
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, outputAta, wallet.publicKey, tokenMint,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID_PK,
    ),
  );

  // WSOL wrapping
  if (quoteMintPk.equals(WSOL_MINT_PK)) {
    const lamports = Number(amountIn);
    ixs.push(
      SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
      createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID_PK),
    );
  }

  ixs.push(swapIx);

  // Close WSOL ATA
  if (quoteMintPk.equals(WSOL_MINT_PK)) {
    ixs.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID_PK));
  }

  return ixs;
}

// ---------------------------------------------------------------------------
// Build sell instructions
// ---------------------------------------------------------------------------

async function buildClmmSellInstructions(
  connection: Connection,
  wallet: Keypair,
  tokenMint: PublicKey,
  quoteMintPk: PublicKey,
  poolId: PublicKey,
  sellAmount: bigint,
  minOut: bigint,
  priorityFee: number,
  includeComputeBudget: boolean,
): Promise<TransactionInstruction[]> {
  const poolState = await fetchClmmPoolState(connection, poolId);
  const baseTokenProgram = await getTokenProgramForMint(connection, tokenMint);

  // For sell: input is tokenMint (base), output is quoteMint
  const isBaseInput = poolState.tokenMint0.equals(tokenMint);
  const zeroForOne = isBaseInput;

  let sqrtPriceLimitX64: BN;
  if (isBaseInput) {
    sqrtPriceLimitX64 = MIN_SQRT_PRICE_X64.add(new BN(1));
  } else {
    sqrtPriceLimitX64 = MAX_SQRT_PRICE_X64.sub(new BN(1));
  }

  const tickArrays = await getTickArraysForSwap(
    connection, poolId, poolState.tickCurrent, poolState.tickSpacing, zeroForOne,
  );

  const inputAta = await getAssociatedTokenAddress(
    tokenMint, wallet.publicKey, baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID), baseTokenProgram,
  );
  const quoteMintTokenProgram = await getTokenProgramForMint(connection, quoteMintPk);
  const outputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);

  const tickArrayBitmapExt = deriveTickArrayBitmapExtension(poolId);
  const observationState = deriveObservationState(poolId);

  const inputVaultMint = isBaseInput ? poolState.tokenMint0 : poolState.tokenMint1;
  const outputVaultMint = isBaseInput ? poolState.tokenMint1 : poolState.tokenMint0;

  const poolParams: ClmmSwapIxParams = {
    poolId,
    ammConfig: poolState.ammConfig,
    observationState,
    tokenVault0: poolState.tokenVault0,
    tokenVault1: poolState.tokenVault1,
    tokenMint0: poolState.tokenMint0,
    tokenMint1: poolState.tokenMint1,
  };

  const swapIx = createClmmSwapV2Ix(
    poolParams,
    wallet.publicKey,
    inputAta,
    outputAta,
    sellAmount,
    minOut,
    sqrtPriceLimitX64,
    isBaseInput,
    tickArrays,
    inputVaultMint,
    outputVaultMint,
    tickArrayBitmapExt,
  );

  const ixs: TransactionInstruction[] = [];

  if (includeComputeBudget) {
    ixs.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
  }

  ixs.push(
    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, outputAta, wallet.publicKey, quoteMintPk),
    swapIx,
  );

  return ixs;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class RaydiumClmmAdapter implements IDexAdapter {
  readonly name = "raydium-clmm";
  readonly protocol = "clmm";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Discover or use provided pool
    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverClmmPool(connection, tokenMint, quoteMintPk);
      if (!found) throw new PoolNotFoundError(this.name, params.tokenMint, params.quoteMint);
      poolId = found;
    }

    // Calculate amounts
    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));

    const ixs = await buildClmmSwapInstructions(
      connection, wallet, tokenMint, quoteMintPk, poolId,
      amountIn, 0n, priorityFee, true,
    );

    // Prepend compute unit limit
    ixs.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }));

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: params.amountSol,
      amountInToken: quoteMintPk.equals(WSOL_MINT_PK) ? "SOL" : quoteMintPk.toBase58(),
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Discover pool
    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverClmmPool(connection, tokenMint, quoteMintPk);
      if (!found) throw new PoolNotFoundError(this.name, params.tokenMint, params.quoteMint);
      poolId = found;
    }

    // Get token balance
    const balance = await getTokenBalance(connection, tokenMint, wallet.publicKey);
    const sellAmount = (balance.amount * BigInt(Math.floor(params.percentage))) / 100n;
    if (sellAmount === 0n) {
      return {
        txSignature: "",
        confirmed: false,
        amountIn: 0,
        amountInToken: params.tokenMint,
        dex: this.name,
        poolAddress: poolId.toBase58(),
      };
    }

    const ixs = await buildClmmSellInstructions(
      connection, wallet, tokenMint, quoteMintPk, poolId,
      sellAmount, 0n, priorityFee, true,
    );

    ixs.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }));

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    const humanSellAmount = Number(sellAmount) / 10 ** balance.decimals;
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanSellAmount,
      amountInToken: params.tokenMint,
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Snipe (uses native IX path from buy-v2.ts) -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const poolId = new PublicKey(params.poolAddress);
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? 1_000_000;

    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));

    const ixs = await buildClmmSwapInstructions(
      connection, wallet, tokenMint, quoteMintPk, poolId,
      amountIn, 0n, priorityFee, true,
    );

    const { blockhash } = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol: params.tipSol,
    });

    const firstAccepted = results.find((r) => r.accepted);
    return {
      txSignature: firstAccepted?.signature ?? "",
      confirmed: !!firstAccepted?.accepted,
      amountIn: params.amountSol,
      amountInToken: quoteMintPk.equals(WSOL_MINT_PK) ? "SOL" : quoteMintPk.toBase58(),
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Build swap IXs -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const isBuy = "amountSol" in params;
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;

    let poolId: PublicKey;
    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
    } else {
      const found = await discoverClmmPool(connection, tokenMint, quoteMintPk);
      if (!found) throw new PoolNotFoundError(this.name, params.tokenMint, params.quoteMint);
      poolId = found;
    }

    let instructions: TransactionInstruction[];

    if (isBuy) {
      const buyParams = params as BuyParams;
      const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
      const amountIn = BigInt(Math.floor(buyParams.amountSol * 10 ** quoteDecimals));
      instructions = await buildClmmSwapInstructions(
        connection, wallet, tokenMint, quoteMintPk, poolId,
        amountIn, 0n, 0, false,
      );
    } else {
      const sellParams = params as SellParams;
      const balance = await getTokenBalance(connection, tokenMint, wallet.publicKey);
      const sellAmount = (balance.amount * BigInt(Math.floor(sellParams.percentage))) / 100n;
      instructions = await buildClmmSellInstructions(
        connection, wallet, tokenMint, quoteMintPk, poolId,
        sellAmount, 0n, 0, false,
      );
    }

    return { instructions, signers: [] };
  }

  // ----- Pool discovery -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = quoteMint ? new PublicKey(quoteMint) : WSOL_MINT_PK;

    const poolId = await discoverClmmPool(connection, baseMintPk, quoteMintPk);
    if (!poolId) return null;

    try {
      const poolState = await fetchClmmPoolState(connection, poolId);
      const price = sqrtPriceX64ToPrice(
        poolState.sqrtPriceX64,
        poolState.mintDecimals0,
        poolState.mintDecimals1,
      );

      return {
        address: poolId.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint: poolState.tokenMint0.toBase58(),
        quoteMint: poolState.tokenMint1.toBase58(),
        baseDecimals: poolState.mintDecimals0,
        quoteDecimals: poolState.mintDecimals1,
        price,
      };
    } catch {
      return {
        address: poolId.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint,
        quoteMint: quoteMintPk.toBase58(),
        baseDecimals: 6,
        quoteDecimals: quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6,
      };
    }
  }

  // ----- Price -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const poolState = await fetchClmmPoolState(connection, poolId);

    let price = sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1,
    );

    // Normalize: if price > 1, invert (for meme tokens priced in SOL/USDC)
    if (price > 1) price = 1 / price;

    return {
      price,
      baseMint: poolState.tokenMint0.toBase58(),
      quoteMint: poolState.tokenMint1.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Register adapter
// ---------------------------------------------------------------------------

registerAdapter(new RaydiumClmmAdapter());
