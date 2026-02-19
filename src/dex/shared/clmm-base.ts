/**
 * Shared CLMM (Concentrated Liquidity Market Maker) Base
 *
 * This module provides the common CLMM swap logic shared by:
 *   - byreal-clmm (program: REALQqNEomY6cQGZJUGwywTBD2UmDT32rZcNnfxQ5N2)
 *   - pancakeswap-clmm (program: HpNfyc2Saw7RKkQd8nEL4khUcuPhQ7WwY1B2qjx8jxFq)
 *
 * Both are forks of the Raydium CLMM program with identical:
 *   - Account layout (pool state, tick arrays, bitmap extension)
 *   - Instruction format (swap_v2 discriminator + args)
 *   - PDA derivation seeds
 *
 * The ONLY difference is the program ID. This base module is parameterized
 * by programId so each adapter just passes its own.
 *
 * Source: 100x-algo-bots/trading-modules/byreal-clmm/ and pancakeswap-clmm/
 */

import {
  PublicKey,
  TransactionInstruction,
  Connection,
  SystemProgram,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import Decimal from "decimal.js";
import { MathUtil } from "@raydium-io/raydium-sdk-v2";

import { getWallet, getConnection } from "../../helpers/config";
import { landTransaction } from "../../transactions/landing";
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
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USD1_MINT_STR = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const SIX_DECIMAL_MINTS = new Set([USDC_MINT, USDT_MINT, USD1_MINT_STR]);

/** swap_v2 discriminator — identical across Raydium/Byreal/PancakeSwap CLMM forks */
const SWAP_V2_DISCRIMINATOR = Buffer.from([43, 4, 237, 11, 26, 201, 30, 98]);

/** Tick array constants */
const TICK_ARRAY_SIZE = 60;
const TICK_ARRAY_BITMAP_SIZE = 512;
const MAX_TICK = 443636;
const MIN_TICK = -443636;

const MIN_SQRT_PRICE_X64 = new BN("4295048016");
const MAX_SQRT_PRICE_X64 = new BN("79226673515401279992447579055");

// Extension bitmap constants
const EXTENSION_TICKARRAY_BITMAP_SIZE = 14;

// ---------------------------------------------------------------------------
// PDA derivation — CLMM pool accounts
// ---------------------------------------------------------------------------

function i32ToBytes(num: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(num, 0);
  return buf;
}

function deriveTickArray(
  programId: PublicKey,
  poolId: PublicKey,
  startIndex: number,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("tick_array"), poolId.toBuffer(), i32ToBytes(startIndex)],
    programId,
  );
  return addr;
}

function deriveTickArrayBitmapExtension(
  programId: PublicKey,
  poolId: PublicKey,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("tick_array_bitmap_extension"), poolId.toBuffer()],
    programId,
  );
  return addr;
}

function deriveObservationState(
  programId: PublicKey,
  poolId: PublicKey,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("observation"), poolId.toBuffer()],
    programId,
  );
  return addr;
}

// ---------------------------------------------------------------------------
// Pool state decoding
// ---------------------------------------------------------------------------

export interface ClmmPoolState {
  ammConfig: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  observationKey: PublicKey;
  mintDecimals0: number;
  mintDecimals1: number;
  tickSpacing: number;
  sqrtPriceX64: BN;
  tickCurrent: number;
  liquidity: BN;
  tickArrayBitmap: BN[];
}

function decodePoolState(data: Buffer): ClmmPoolState {
  let offset = 8; // skip discriminator

  // Bump [1 byte]
  offset += 1;

  // ammConfig [32 bytes]
  const ammConfig = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // owner [32 bytes]
  offset += 32;

  // tokenMint0 [32 bytes]
  const tokenMint0 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenMint1 [32 bytes]
  const tokenMint1 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenVault0 [32 bytes]
  const tokenVault0 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // tokenVault1 [32 bytes]
  const tokenVault1 = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // observationKey [32 bytes]
  const observationKey = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // mintDecimals0 [1 byte]
  const mintDecimals0 = data.readUInt8(offset);
  offset += 1;

  // mintDecimals1 [1 byte]
  const mintDecimals1 = data.readUInt8(offset);
  offset += 1;

  // tickSpacing [2 bytes]
  const tickSpacing = data.readUInt16LE(offset);
  offset += 2;

  // liquidity [16 bytes]
  const liquidity = new BN(data.subarray(offset, offset + 16), "le");
  offset += 16;

  // sqrtPriceX64 [16 bytes]
  const sqrtPriceX64 = new BN(data.subarray(offset, offset + 16), "le");
  offset += 16;

  // tickCurrent [4 bytes]
  const tickCurrent = data.readInt32LE(offset);
  offset += 4;

  // padding [4 bytes]
  offset += 4;

  // feeGrowthGlobal0X64 [16]
  offset += 16;
  // feeGrowthGlobal1X64 [16]
  offset += 16;
  // protocolFeesToken0 [8]
  offset += 8;
  // protocolFeesToken1 [8]
  offset += 8;
  // swapInAmountToken0 [16]
  offset += 16;
  // swapOutAmountToken1 [16]
  offset += 16;
  // swapInAmountToken1 [16]
  offset += 16;
  // swapOutAmountToken0 [16]
  offset += 16;

  // status [1 byte]
  offset += 1;
  // padding [7 bytes]
  offset += 7;

  // rewardInfos [3 * 169 bytes = 507 bytes]
  offset += 507;

  // tickArrayBitmap [16 * 16 bytes = 256 bytes]
  const tickArrayBitmap: BN[] = [];
  for (let i = 0; i < 16; i++) {
    tickArrayBitmap.push(new BN(data.subarray(offset, offset + 16), "le"));
    offset += 16;
  }

  return {
    ammConfig,
    tokenMint0,
    tokenMint1,
    tokenVault0,
    tokenVault1,
    observationKey,
    mintDecimals0,
    mintDecimals1,
    tickSpacing,
    sqrtPriceX64,
    tickCurrent,
    liquidity,
    tickArrayBitmap,
  };
}

async function fetchClmmPoolState(
  connection: Connection,
  poolId: PublicKey,
  programId: PublicKey,
): Promise<ClmmPoolState> {
  const accountInfo = await connection.getAccountInfo(poolId);
  if (!accountInfo) {
    throw new Error(`CLMM pool not found: ${poolId.toBase58()}`);
  }
  if (accountInfo.owner.toBase58() !== programId.toBase58()) {
    throw new Error(
      `Pool ${poolId.toBase58()} owner ${accountInfo.owner.toBase58()} does not match expected program ${programId.toBase58()}`,
    );
  }
  return decodePoolState(accountInfo.data);
}

// ---------------------------------------------------------------------------
// Tick array bitmap extension
// ---------------------------------------------------------------------------

interface ExBitmapInfo {
  poolId: PublicKey;
  exBitmapAddress: PublicKey;
  positiveTickArrayBitmap: BN[][];
  negativeTickArrayBitmap: BN[][];
}

async function getTickArrayBitmapExtension(
  programId: PublicKey,
  poolId: PublicKey,
  connection: Connection,
): Promise<ExBitmapInfo> {
  const exBitmapAddress = deriveTickArrayBitmapExtension(programId, poolId);
  const accountInfo = await connection.getAccountInfo(exBitmapAddress);

  if (!accountInfo) {
    // Graceful fallback — return empty bitmaps (pancakeswap pattern)
    const emptyBitmaps: BN[][] = [];
    for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
      emptyBitmaps.push(Array(8).fill(new BN(0)));
    }
    return {
      poolId,
      exBitmapAddress,
      positiveTickArrayBitmap: emptyBitmaps,
      negativeTickArrayBitmap: emptyBitmaps,
    };
  }

  const data = accountInfo.data;
  let offset = 8 + 32; // discriminator + poolId

  // positiveTickArrayBitmap [14 * 8 * 8 = 896 bytes]
  const positiveTickArrayBitmap: BN[][] = [];
  for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
    const row: BN[] = [];
    for (let j = 0; j < 8; j++) {
      row.push(new BN(data.subarray(offset, offset + 8), "le"));
      offset += 8;
    }
    positiveTickArrayBitmap.push(row);
  }

  // negativeTickArrayBitmap [14 * 8 * 8 = 896 bytes]
  const negativeTickArrayBitmap: BN[][] = [];
  for (let i = 0; i < EXTENSION_TICKARRAY_BITMAP_SIZE; i++) {
    const row: BN[] = [];
    for (let j = 0; j < 8; j++) {
      row.push(new BN(data.subarray(offset, offset + 8), "le"));
      offset += 8;
    }
    negativeTickArrayBitmap.push(row);
  }

  return {
    poolId,
    exBitmapAddress,
    positiveTickArrayBitmap,
    negativeTickArrayBitmap,
  };
}

// ---------------------------------------------------------------------------
// Tick array bitmap search
// ---------------------------------------------------------------------------

function tickArrayStartIndexRange(tickSpacing: number): { min: number; max: number } {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  const min = Math.ceil(MIN_TICK / ticksPerArray) * ticksPerArray;
  const max = Math.floor(MAX_TICK / ticksPerArray) * ticksPerArray;
  return { min, max };
}

function getNextTickArrayStartIndex(
  currentStartIndex: number,
  tickSpacing: number,
  zeroForOne: boolean,
): number {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  return zeroForOne
    ? currentStartIndex - ticksPerArray
    : currentStartIndex + ticksPerArray;
}

function getTickArrayStartIndexForTick(
  tick: number,
  tickSpacing: number,
): number {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  let startIndex = Math.floor(tick / ticksPerArray) * ticksPerArray;
  if (tick < 0 && tick % ticksPerArray !== 0) {
    startIndex -= ticksPerArray;
  }
  return startIndex;
}

function mergeTickArrayBitmap(
  poolBitmap: BN[],
  exPositive: BN[][],
  exNegative: BN[][],
): BN[] {
  // Pool bitmap: 16 * u64 (already 16 BN elements)
  // Extension positive: EXTENSION_TICKARRAY_BITMAP_SIZE * 8 * u64
  // Extension negative: EXTENSION_TICKARRAY_BITMAP_SIZE * 8 * u64
  // Total negative (extension) + pool bitmap (8 negative + 8 positive) + positive (extension)
  const merged: BN[] = [];

  // Negative extension (reversed)
  for (let i = exNegative.length - 1; i >= 0; i--) {
    merged.push(...exNegative[i]);
  }

  // Pool bitmap (first 8 = negative, last 8 = positive)
  merged.push(...poolBitmap);

  // Positive extension
  for (let i = 0; i < exPositive.length; i++) {
    merged.push(...exPositive[i]);
  }

  return merged;
}

function checkTickArrayIsInitialized(
  mergedBitmap: BN[],
  tickArrayStartIndex: number,
  tickSpacing: number,
): boolean {
  const ticksPerArray = tickSpacing * TICK_ARRAY_SIZE;
  if (ticksPerArray === 0) return false;
  const arrayIndex = Math.floor(tickArrayStartIndex / ticksPerArray);
  const bitmapOffset = arrayIndex + TICK_ARRAY_BITMAP_SIZE - 1;

  if (bitmapOffset < 0 || bitmapOffset >= mergedBitmap.length * 64) {
    return false;
  }

  const wordIndex = Math.floor(bitmapOffset / 64);
  const bitIndex = bitmapOffset % 64;

  if (wordIndex >= mergedBitmap.length) return false;

  const word = mergedBitmap[wordIndex];
  return !word.shrn(bitIndex).and(new BN(1)).isZero();
}

interface FirstTickArrayResult {
  isExist: boolean;
  startIndex: number;
  nextAccountMeta?: PublicKey;
}

function findFirstInitializedTickArrayFromBitmap(
  programId: PublicKey,
  poolId: PublicKey,
  poolState: {
    tickCurrent: number;
    tickSpacing: number;
    tickArrayBitmap: BN[];
    exBitmapInfo: { positiveTickArrayBitmap: BN[][]; negativeTickArrayBitmap: BN[][] };
  },
  zeroForOne: boolean,
): FirstTickArrayResult {
  const mergedBitmap = mergeTickArrayBitmap(
    poolState.tickArrayBitmap,
    poolState.exBitmapInfo.positiveTickArrayBitmap,
    poolState.exBitmapInfo.negativeTickArrayBitmap,
  );

  const currentStartIndex = getTickArrayStartIndexForTick(
    poolState.tickCurrent,
    poolState.tickSpacing,
  );

  const { min: minStart, max: maxStart } = tickArrayStartIndexRange(poolState.tickSpacing);
  const maxSearchDistance = 20;

  let searchIndex = currentStartIndex;
  for (let i = 0; i < maxSearchDistance; i++) {
    if (searchIndex < minStart || searchIndex > maxStart) break;

    if (checkTickArrayIsInitialized(mergedBitmap, searchIndex, poolState.tickSpacing)) {
      const tickArrayAddr = deriveTickArray(programId, poolId, searchIndex);
      return {
        isExist: true,
        startIndex: searchIndex,
        nextAccountMeta: tickArrayAddr,
      };
    }

    searchIndex = getNextTickArrayStartIndex(
      searchIndex,
      poolState.tickSpacing,
      zeroForOne,
    );
  }

  return { isExist: false, startIndex: currentStartIndex };
}

// Brute-force fallback: check account existence directly
async function findFirstInitializedTickArrayBruteForce(
  connection: Connection,
  programId: PublicKey,
  poolId: PublicKey,
  tickCurrent: number,
  tickSpacing: number,
  zeroForOne: boolean,
): Promise<FirstTickArrayResult> {
  const currentStartIndex = getTickArrayStartIndexForTick(tickCurrent, tickSpacing);
  const maxSearch = 10;

  // Search in primary direction
  let searchIndex = currentStartIndex;
  for (let i = 0; i < maxSearch; i++) {
    const addr = deriveTickArray(programId, poolId, searchIndex);
    const info = await connection.getAccountInfo(addr);
    if (info && info.owner.equals(programId)) {
      return { isExist: true, startIndex: searchIndex, nextAccountMeta: addr };
    }
    searchIndex = getNextTickArrayStartIndex(searchIndex, tickSpacing, zeroForOne);
  }

  // Search in opposite direction
  searchIndex = getNextTickArrayStartIndex(currentStartIndex, tickSpacing, !zeroForOne);
  for (let i = 0; i < maxSearch; i++) {
    const addr = deriveTickArray(programId, poolId, searchIndex);
    const info = await connection.getAccountInfo(addr);
    if (info && info.owner.equals(programId)) {
      return { isExist: true, startIndex: searchIndex, nextAccountMeta: addr };
    }
    searchIndex = getNextTickArrayStartIndex(searchIndex, tickSpacing, !zeroForOne);
  }

  return { isExist: false, startIndex: currentStartIndex };
}

// ---------------------------------------------------------------------------
// Pool account derivation
// ---------------------------------------------------------------------------

interface ClmmPoolAccounts {
  poolId: PublicKey;
  ammConfig: PublicKey;
  poolState: PublicKey;
  observationState: PublicKey;
  tokenVault0: PublicKey;
  tokenVault1: PublicKey;
  tokenMint0: PublicKey;
  tokenMint1: PublicKey;
}

async function deriveClmmPoolAccounts(
  connection: Connection,
  poolId: PublicKey,
  programId: PublicKey,
): Promise<ClmmPoolAccounts> {
  const poolState = await fetchClmmPoolState(connection, poolId, programId);
  const observationState = deriveObservationState(programId, poolId);

  return {
    poolId,
    ammConfig: poolState.ammConfig,
    poolState: poolId,
    observationState,
    tokenVault0: poolState.tokenVault0,
    tokenVault1: poolState.tokenVault1,
    tokenMint0: poolState.tokenMint0,
    tokenMint1: poolState.tokenMint1,
  };
}

// ---------------------------------------------------------------------------
// Swap IX builder
// ---------------------------------------------------------------------------

function createClmmSwapIx(
  programId: PublicKey,
  poolAccounts: ClmmPoolAccounts,
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
  const inputVault = isBaseInput ? poolAccounts.tokenVault0 : poolAccounts.tokenVault1;
  const outputVault = isBaseInput ? poolAccounts.tokenVault1 : poolAccounts.tokenVault0;

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: poolAccounts.ammConfig, isSigner: false, isWritable: false },
    { pubkey: poolAccounts.poolState, isSigner: false, isWritable: true },
    { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: inputVault, isSigner: false, isWritable: true },
    { pubkey: outputVault, isSigner: false, isWritable: true },
    { pubkey: poolAccounts.observationState, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: inputVaultMint, isSigner: false, isWritable: false },
    { pubkey: outputVaultMint, isSigner: false, isWritable: false },
  ];

  // Remaining accounts: bitmap extension + tick arrays
  const remainingAccounts = [];
  if (tickArrayBitmapExtension) {
    remainingAccounts.push({
      pubkey: tickArrayBitmapExtension,
      isSigner: false,
      isWritable: true,
    });
  }
  for (const ta of tickArrays) {
    remainingAccounts.push({
      pubkey: ta,
      isSigner: false,
      isWritable: true,
    });
  }

  // Build instruction data (41 bytes)
  const data = Buffer.alloc(41);
  let off = 0;
  SWAP_V2_DISCRIMINATOR.copy(data, off);
  off += 8;
  data.writeBigUInt64LE(amount, off);
  off += 8;
  data.writeBigUInt64LE(otherAmountThreshold, off);
  off += 8;
  const sqrtPriceBytes = sqrtPriceLimitX64.toArrayLike(Buffer, "le", 16);
  sqrtPriceBytes.copy(data, off);
  off += 16;
  data.writeUInt8(isBaseInput ? 1 : 0, off);

  return new TransactionInstruction({
    keys: [...accounts, ...remainingAccounts],
    programId,
    data,
  });
}

// ---------------------------------------------------------------------------
// Token program detection
// ---------------------------------------------------------------------------

async function getTokenProgramForMint(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  return info.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

// ---------------------------------------------------------------------------
// Price calculation
// ---------------------------------------------------------------------------

function sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal {
  return MathUtil.x64ToDecimal(sqrtPriceX64)
    .pow(2)
    .mul(Decimal.pow(10, decimalsA - decimalsB));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

function amountToSmallestUnit(amount: number, quoteMintStr: string): bigint {
  const decimals = quoteDecimals(quoteMintStr);
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// ---------------------------------------------------------------------------
// CLMM Base Adapter
// ---------------------------------------------------------------------------

export interface ClmmAdapterConfig {
  name: string;
  protocol: string;
  programId: PublicKey;
}

export class ClmmBaseAdapter implements IDexAdapter {
  readonly name: string;
  readonly protocol: string;
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSnipe: true,
    canFindPool: false, // Requires off-chain indexing or Raydium API
    canGetPrice: true,
  });

  private readonly programId: PublicKey;

  constructor(config: ClmmAdapterConfig) {
    this.name = config.name;
    this.protocol = config.protocol;
    this.programId = config.programId;
  }

  // ---- Core: buy ----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new Error(`${this.name}: poolAddress is required (auto-discovery not yet supported)`);
    }

    const allIxs = await this.buildFullSwapTx(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      wallet,
      opts,
    );

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(allIxs, wallet, blockhash, {
      dex: this.name,
      operation: "buy",
      tipSol: opts?.tipSol,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ---- Core: sell (not supported) ----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ---- Snipe ----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const allIxs = await this.buildFullSwapTx(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
      wallet,
      opts,
    );

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(allIxs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ---- buildSwapIxs ----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    if ("percentage" in params) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }
    const { tokenMint, amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    if (!poolAddress) {
      throw new Error(`${this.name}: poolAddress is required for buildSwapIxs`);
    }

    return this.doBuildSwapIxs(tokenMint, amountSol, quoteMintStr, poolAddress);
  }

  // ---- findPool (stub) ----

  async findPool(baseMint: string, _quoteMint?: string): Promise<PoolInfo | null> {
    // CLMM pool discovery requires off-chain indexing or Raydium API.
    return null;
  }

  // ---- getPrice ----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolId = new PublicKey(poolAddress);
    const poolState = await fetchClmmPoolState(connection, poolId, this.programId);

    const price = sqrtPriceX64ToPrice(
      poolState.sqrtPriceX64,
      poolState.mintDecimals0,
      poolState.mintDecimals1,
    );
    let realPrice = Number(price.toString());
    if (realPrice > 1) realPrice = 1 / realPrice;

    return {
      price: realPrice,
      baseMint: poolState.tokenMint0.toBase58(),
      quoteMint: poolState.tokenMint1.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ---- Internal: build raw swap instructions ----

  private async doBuildSwapIxs(
    tokenMint: string,
    amountSol: number,
    quoteMintStr: string,
    poolAddress: string,
  ): Promise<BuildSwapIxsResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const poolId = new PublicKey(poolAddress);
    const baseMint = new PublicKey(tokenMint);
    const quoteMint = new PublicKey(quoteMintStr);

    // 1. Derive pool accounts
    const poolAccounts = await deriveClmmPoolAccounts(connection, poolId, this.programId);

    // 2. Fetch pool state
    const poolState = await fetchClmmPoolState(connection, poolId, this.programId);

    // 3. Determine swap direction
    const inputMint = quoteMint;
    const outputMint = baseMint;
    const isBaseInput = poolState.tokenMint0.equals(inputMint);

    // 4. Calculate amount
    const amountIn = amountToSmallestUnit(amountSol, quoteMintStr);

    // 5. Sqrt price limit
    const currentSqrtPrice = poolState.sqrtPriceX64;
    let sqrtPriceLimitX64: BN;
    if (isBaseInput) {
      const minPlusOne = MIN_SQRT_PRICE_X64.add(new BN(1));
      sqrtPriceLimitX64 = minPlusOne.lt(currentSqrtPrice)
        ? minPlusOne
        : currentSqrtPrice.sub(new BN(1));
      if (sqrtPriceLimitX64.lte(MIN_SQRT_PRICE_X64)) {
        sqrtPriceLimitX64 = MIN_SQRT_PRICE_X64.add(new BN(1));
      }
    } else {
      const maxMinusOne = MAX_SQRT_PRICE_X64.sub(new BN(1));
      sqrtPriceLimitX64 = maxMinusOne.gt(currentSqrtPrice)
        ? maxMinusOne
        : currentSqrtPrice.add(new BN(1));
      if (sqrtPriceLimitX64.gte(MAX_SQRT_PRICE_X64)) {
        sqrtPriceLimitX64 = MAX_SQRT_PRICE_X64.sub(new BN(1));
      }
    }

    // 6. Get bitmap extension
    const exBitmapInfo = await getTickArrayBitmapExtension(
      this.programId,
      poolId,
      connection,
    );

    // 7. Find initialized tick arrays
    const zeroForOne = isBaseInput;
    let firstResult = findFirstInitializedTickArrayFromBitmap(
      this.programId,
      poolId,
      {
        tickCurrent: poolState.tickCurrent,
        tickSpacing: poolState.tickSpacing,
        tickArrayBitmap: poolState.tickArrayBitmap,
        exBitmapInfo: {
          positiveTickArrayBitmap: exBitmapInfo.positiveTickArrayBitmap,
          negativeTickArrayBitmap: exBitmapInfo.negativeTickArrayBitmap,
        },
      },
      zeroForOne,
    );

    // Brute-force fallback if bitmap search fails
    if (!firstResult.isExist) {
      firstResult = await findFirstInitializedTickArrayBruteForce(
        connection,
        this.programId,
        poolId,
        poolState.tickCurrent,
        poolState.tickSpacing,
        zeroForOne,
      );
    }

    if (!firstResult.isExist || !firstResult.nextAccountMeta) {
      throw new Error(
        `No initialized tick array found for pool ${poolId.toBase58()}. ` +
        `Current tick: ${poolState.tickCurrent}, Tick spacing: ${poolState.tickSpacing}`,
      );
    }

    // Build tick array list (up to 4)
    const tickArrays: PublicKey[] = [firstResult.nextAccountMeta];
    let currentStartIndex = firstResult.startIndex;
    for (let i = 1; i < 4; i++) {
      currentStartIndex = getNextTickArrayStartIndex(
        currentStartIndex,
        poolState.tickSpacing,
        zeroForOne,
      );
      const addr = deriveTickArray(this.programId, poolId, currentStartIndex);
      const info = await connection.getAccountInfo(addr);
      if (info && info.owner.equals(this.programId)) {
        tickArrays.push(addr);
      } else {
        break;
      }
    }

    // 8. Get user ATAs
    const inputMintTokenProgram = await getTokenProgramForMint(connection, inputMint);
    const outputMintTokenProgram = await getTokenProgramForMint(connection, outputMint);

    const inputAta = await getAssociatedTokenAddress(
      inputMint,
      wallet.publicKey,
      false,
      inputMintTokenProgram,
    );
    const outputAta = await getAssociatedTokenAddress(
      outputMint,
      wallet.publicKey,
      false,
      outputMintTokenProgram,
    );

    // 9. Build swap IX
    const inputVaultMint = isBaseInput ? poolState.tokenMint0 : poolState.tokenMint1;
    const outputVaultMint = isBaseInput ? poolState.tokenMint1 : poolState.tokenMint0;

    const swapIx = createClmmSwapIx(
      this.programId,
      poolAccounts,
      wallet.publicKey,
      inputAta,
      outputAta,
      amountIn,
      BigInt(0), // unlimited slippage for raw IX
      sqrtPriceLimitX64,
      isBaseInput,
      tickArrays,
      inputVaultMint,
      outputVaultMint,
      exBitmapInfo.exBitmapAddress,
    );

    // 10. Create ATA instructions
    const createInputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      inputAta,
      wallet.publicKey,
      inputMint,
      inputMintTokenProgram,
    );
    const createOutputAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      outputAta,
      wallet.publicKey,
      outputMint,
      outputMintTokenProgram,
    );

    return {
      instructions: [createInputAtaIx, createOutputAtaIx, swapIx],
      signers: [],
    };
  }

  // ---- Internal: full transaction with WSOL wrapping + compute budget ----

  private async buildFullSwapTx(
    tokenMint: string,
    amountSol: number,
    quoteMintStr: string,
    poolAddress: string,
    wallet: Keypair,
    opts?: BuyParams["opts"],
  ): Promise<TransactionInstruction[]> {
    const { instructions: swapIxs } = await this.doBuildSwapIxs(
      tokenMint,
      amountSol,
      quoteMintStr,
      poolAddress,
    );

    const cuPrice = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const cuLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const isWSol = quoteMintStr === WSOL_MINT;

    const preIxs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
    ];

    if (isWSol) {
      const quoteMintPk = new PublicKey(quoteMintStr);
      const inputAta = await getAssociatedTokenAddress(
        quoteMintPk,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );
      const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      preIxs.push(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: inputAta,
          lamports: amountLamports,
        }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
      );

      const closeIx = createCloseAccountInstruction(
        inputAta,
        wallet.publicKey,
        wallet.publicKey,
        [],
        TOKEN_PROGRAM_ID,
      );

      return [...preIxs, ...swapIxs, closeIx];
    }

    return [...preIxs, ...swapIxs];
  }
}
