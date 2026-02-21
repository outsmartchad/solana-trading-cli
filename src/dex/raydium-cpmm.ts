/**
 * Raydium CPMM (Constant Product AMM) DEX Adapter
 *
 * Implements IDexAdapter for Raydium's CPMM program (CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C).
 * Supports buy, sell, snipe, findPool, getPrice, and buildSwapIxs.
 *
 * Ported from: 100x-algo-bots/trading-modules/raydium-cpmm/
 */

import {
  PublicKey,
  TransactionInstruction,
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
  requireTokenMint,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";
import { registerAdapter } from "./index";
import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

// ---------------------------------------------------------------------------
// Program constants
// ---------------------------------------------------------------------------

const RAYDIUM_CPMM_PROGRAM_ID = new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const WSOL_MINT_PK = new PublicKey(WSOL_MINT);
const USDC_MINT_PK = new PublicKey(USDC_MINT);

// Discriminators from on-chain program
const SWAP_BASE_IN_DISCRIMINATOR = Uint8Array.from([143, 190, 90, 218, 196, 30, 51, 222]);

// PDA seeds
const AUTH_SEED = Buffer.from("vault_and_lp_mint_auth_seed", "utf8");
const AMM_CONFIG_SEED = Buffer.from("amm_config", "utf8");
const POOL_SEED = Buffer.from("pool", "utf8");
const POOL_VAULT_SEED = Buffer.from("pool_vault", "utf8");
const OBSERVATION_STATE_SEED = Buffer.from("observation", "utf8");

// ---------------------------------------------------------------------------
// PDA helpers
// ---------------------------------------------------------------------------

function u16ToBytes(num: number): Uint8Array {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

function getPoolAuthorityPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([AUTH_SEED], RAYDIUM_CPMM_PROGRAM_ID);
  return pda;
}

function getAmmConfigPdaByIndex(index: number): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [AMM_CONFIG_SEED, Buffer.from(u16ToBytes(index))],
    RAYDIUM_CPMM_PROGRAM_ID,
  );
  return pda;
}

function getPoolPda(ammConfig: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [POOL_SEED, ammConfig.toBuffer(), mintA.toBuffer(), mintB.toBuffer()],
    RAYDIUM_CPMM_PROGRAM_ID,
  );
  return pda;
}

function getPoolPdaSorted(ammConfig: PublicKey, mintA: PublicKey, mintB: PublicKey): PublicKey {
  const [token0, token1] = [mintA, mintB].sort((a, b) =>
    a.toBase58().localeCompare(b.toBase58()),
  );
  return getPoolPda(ammConfig, token0, token1);
}

function getVaultPda(poolState: PublicKey, mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [POOL_VAULT_SEED, poolState.toBuffer(), mint.toBuffer()],
    RAYDIUM_CPMM_PROGRAM_ID,
  );
  return pda;
}

function getObservationStatePda(poolState: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [OBSERVATION_STATE_SEED, poolState.toBuffer()],
    RAYDIUM_CPMM_PROGRAM_ID,
  );
  return pda;
}

// ---------------------------------------------------------------------------
// Pool helpers
// ---------------------------------------------------------------------------

async function getTokenAccountAmount(connection: Connection, tokenAccount: PublicKey): Promise<bigint> {
  const res = await connection.getTokenAccountBalance(tokenAccount);
  return BigInt(res.value.amount);
}

async function getPoolReserves(
  connection: Connection,
  poolState: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): Promise<{ base: bigint; quote: bigint }> {
  const baseVault = getVaultPda(poolState, baseMint);
  const quoteVault = getVaultPda(poolState, quoteMint);
  const [base, quote] = await Promise.all([
    getTokenAccountAmount(connection, baseVault),
    getTokenAccountAmount(connection, quoteVault),
  ]);
  return { base, quote };
}

function computeSwapOutAmount(
  xReserve: bigint,
  yReserve: bigint,
  xIn: bigint,
  feeBps = 25n,
): bigint {
  const feeDen = 10_000n;
  const xInAfterFee = (xIn * (feeDen - feeBps)) / feeDen;
  const k = xReserve * yReserve;
  const newX = xReserve + xInAfterFee;
  const newY = k / newX;
  return yReserve - newY;
}

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) throw new Error(`Mint account not found: ${mint.toBase58()}`);
  if (mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

async function getTokenBalance(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
): Promise<{ amount: bigint; decimals: number }> {
  const tokenProgram = await getTokenProgramForMint(connection, mint);
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    tokenProgram.equals(TOKEN_2022_PROGRAM_ID),
    tokenProgram,
  );
  try {
    const res = await connection.getTokenAccountBalance(ata);
    return {
      amount: BigInt(res.value.amount),
      decimals: res.value.decimals,
    };
  } catch {
    return { amount: 0n, decimals: 0 };
  }
}

// ---------------------------------------------------------------------------
// SDK instruction builder (ported from raydium-cpmm/sdk.ts)
// ---------------------------------------------------------------------------

interface CpmmSdkConfig {
  ammConfig: PublicKey;
  poolState: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  baseTokenProgram: PublicKey;
  quoteTokenProgram: PublicKey;
}

function createCpmmBuyIx(
  cfg: CpmmSdkConfig,
  payer: PublicKey,
  outputMint: PublicKey,
  userInputAta: PublicKey,
  userOutputAta: PublicKey,
  amountIn: bigint,
  minOut: bigint,
): TransactionInstruction {
  const obs = getObservationStatePda(cfg.poolState);
  const authority = getPoolAuthorityPda();

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: cfg.ammConfig, isSigner: false, isWritable: false },
    { pubkey: cfg.poolState, isSigner: false, isWritable: true },
    { pubkey: userInputAta, isSigner: false, isWritable: true },
    { pubkey: userOutputAta, isSigner: false, isWritable: true },
    { pubkey: cfg.quoteVault, isSigner: false, isWritable: true },
    { pubkey: cfg.baseVault, isSigner: false, isWritable: true },
    { pubkey: cfg.quoteTokenProgram, isSigner: false, isWritable: false },
    { pubkey: cfg.baseTokenProgram, isSigner: false, isWritable: false },
    { pubkey: cfg.quoteMint, isSigner: false, isWritable: false },
    { pubkey: outputMint, isSigner: false, isWritable: false },
    { pubkey: obs, isSigner: false, isWritable: true },
  ];

  const data = Buffer.alloc(24);
  data.set(SWAP_BASE_IN_DISCRIMINATOR, 0);
  data.writeBigUInt64LE(amountIn, 8);
  data.writeBigUInt64LE(minOut, 16);

  return new TransactionInstruction({ keys: accounts, programId: RAYDIUM_CPMM_PROGRAM_ID, data });
}

function createCpmmSellIx(
  cfg: CpmmSdkConfig,
  payer: PublicKey,
  inputMint: PublicKey,
  userInputAta: PublicKey,
  userOutputAta: PublicKey,
  amountIn: bigint,
  minOut: bigint,
): TransactionInstruction {
  const obs = getObservationStatePda(cfg.poolState);
  const authority = getPoolAuthorityPda();

  const accounts = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: cfg.ammConfig, isSigner: false, isWritable: false },
    { pubkey: cfg.poolState, isSigner: false, isWritable: true },
    { pubkey: userInputAta, isSigner: false, isWritable: true },
    { pubkey: userOutputAta, isSigner: false, isWritable: true },
    { pubkey: cfg.baseVault, isSigner: false, isWritable: true },
    { pubkey: cfg.quoteVault, isSigner: false, isWritable: true },
    { pubkey: cfg.baseTokenProgram, isSigner: false, isWritable: false },
    { pubkey: cfg.quoteTokenProgram, isSigner: false, isWritable: false },
    { pubkey: inputMint, isSigner: false, isWritable: false },
    { pubkey: cfg.quoteMint, isSigner: false, isWritable: false },
    { pubkey: obs, isSigner: false, isWritable: true },
  ];

  const data = Buffer.alloc(24);
  data.set(SWAP_BASE_IN_DISCRIMINATOR, 0);
  data.writeBigUInt64LE(amountIn, 8);
  data.writeBigUInt64LE(minOut, 16);

  return new TransactionInstruction({ keys: accounts, programId: RAYDIUM_CPMM_PROGRAM_ID, data });
}

// ---------------------------------------------------------------------------
// Pool discovery helpers
// ---------------------------------------------------------------------------

/** Try known AMM config indices (0 is most common, try others as fallback) */
const KNOWN_AMM_CONFIG_INDICES = [0, 1, 2, 3];

async function discoverCpmmPool(
  connection: Connection,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): Promise<{ poolId: PublicKey; ammConfig: PublicKey } | null> {
  for (const idx of KNOWN_AMM_CONFIG_INDICES) {
    const ammConfig = getAmmConfigPdaByIndex(idx);
    const candidates = [
      getPoolPda(ammConfig, baseMint, quoteMint),
      getPoolPda(ammConfig, quoteMint, baseMint),
      getPoolPdaSorted(ammConfig, baseMint, quoteMint),
    ];

    for (const poolId of candidates) {
      try {
        const info = await connection.getAccountInfo(poolId);
        if (info && info.owner.equals(RAYDIUM_CPMM_PROGRAM_ID)) {
          return { poolId, ammConfig };
        }
      } catch {
        // skip
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Decode pool state to get AMM config
// ---------------------------------------------------------------------------

/**
 * Decode the ammConfig pubkey from CPMM pool account data.
 * CPMM pool layout: 8-byte discriminator, then amm_config pubkey at offset 8.
 */
function decodePoolAmmConfig(data: Buffer): PublicKey {
  // Skip 8-byte discriminator, ammConfig is at offset 8
  return new PublicKey(data.slice(8, 40));
}

/**
 * Decode base and quote mints from pool account data.
 * Layout (after 8-byte discriminator):
 *   amm_config: 32 bytes (offset 8)
 *   pool_creator: 32 bytes (offset 40)
 *   token_0_vault: 32 bytes (offset 72)
 *   token_1_vault: 32 bytes (offset 104)
 *   lp_mint: 32 bytes (offset 136)
 *   token_0_mint: 32 bytes (offset 168)
 *   token_1_mint: 32 bytes (offset 200)
 *   token_0_program: 32 bytes (offset 232)
 *   token_1_program: 32 bytes (offset 264)
 */
interface CpmmPoolData {
  ammConfig: PublicKey;
  token0Mint: PublicKey;
  token1Mint: PublicKey;
  token0Program: PublicKey;
  token1Program: PublicKey;
}

function decodeCpmmPool(data: Buffer): CpmmPoolData {
  return {
    ammConfig: new PublicKey(data.slice(8, 40)),
    token0Mint: new PublicKey(data.slice(168, 200)),
    token1Mint: new PublicKey(data.slice(200, 232)),
    token0Program: new PublicKey(data.slice(232, 264)),
    token1Program: new PublicKey(data.slice(264, 296)),
  };
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class RaydiumCpmmAdapter implements IDexAdapter {
  readonly name = "raydium-cpmm";
  readonly protocol = "cpmm";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: true,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const slippageBps = params.opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Discover or use provided pool
    let poolId: PublicKey;
    let ammConfig: PublicKey;

    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
      const poolInfo = await connection.getAccountInfo(poolId);
      if (!poolInfo) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      ammConfig = decodePoolAmmConfig(poolInfo.data);
    } else {
      const result = await discoverCpmmPool(connection, tokenMintPk, quoteMintPk);
      if (!result) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      poolId = result.poolId;
      ammConfig = result.ammConfig;
    }

    // Detect base token program
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);

    // Build SDK config
    const cfg: CpmmSdkConfig = {
      ammConfig,
      poolState: poolId,
      baseMint: tokenMintPk,
      quoteMint: quoteMintPk,
      baseVault: getVaultPda(poolId, tokenMintPk),
      quoteVault: getVaultPda(poolId, quoteMintPk),
      baseTokenProgram,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    };

    // Calculate amounts
    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));

    // Get reserves for slippage calculation
    let minOut = 0n;
    try {
      const reserves = await getPoolReserves(connection, poolId, tokenMintPk, quoteMintPk);
      const estOut = computeSwapOutAmount(reserves.quote, reserves.base, amountIn);
      minOut = (estOut * BigInt(10000 - slippageBps)) / 10000n;
    } catch {
      // If reserves fail, use zero slippage protection
    }

    // Build ATAs
    const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
    const outputAta = await getAssociatedTokenAddress(
      tokenMintPk,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );

    // Build instructions
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, outputAta, wallet.publicKey, tokenMintPk,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
      ),
    ];

    // WSOL wrapping
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      const lamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL);
      ixs.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
      );
    }

    // Swap instruction
    ixs.push(createCpmmBuyIx(cfg, wallet.publicKey, tokenMintPk, inputAta, outputAta, amountIn, minOut));

    // Close WSOL ATA after swap
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID));
    }

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
    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const slippageBps = params.opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;
    const computeUnits = params.opts?.computeUnitLimit ?? 300_000;

    // Discover pool
    let poolId: PublicKey;
    let ammConfig: PublicKey;

    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
      const poolInfo = await connection.getAccountInfo(poolId);
      if (!poolInfo) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      ammConfig = decodePoolAmmConfig(poolInfo.data);
    } else {
      const result = await discoverCpmmPool(connection, tokenMintPk, quoteMintPk);
      if (!result) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      poolId = result.poolId;
      ammConfig = result.ammConfig;
    }

    // Get token balance and compute sell amount
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);
    const balance = await getTokenBalance(connection, tokenMintPk, wallet.publicKey);
    const sellAmount = (balance.amount * BigInt(Math.floor(params.percentage))) / 100n;
    if (sellAmount === 0n) {
      return {
        txSignature: "",
        confirmed: false,
        amountIn: 0,
        amountInToken: tokenMint,
        dex: this.name,
        poolAddress: poolId.toBase58(),
      };
    }

    // Compute min out
    let minOut = 0n;
    try {
      const reserves = await getPoolReserves(connection, poolId, tokenMintPk, quoteMintPk);
      const estOut = computeSwapOutAmount(reserves.base, reserves.quote, sellAmount);
      minOut = (estOut * BigInt(10000 - slippageBps)) / 10000n;
    } catch {
      // zero floor
    }

    // Build SDK config
    const cfg: CpmmSdkConfig = {
      ammConfig,
      poolState: poolId,
      baseMint: tokenMintPk,
      quoteMint: quoteMintPk,
      baseVault: getVaultPda(poolId, tokenMintPk),
      quoteVault: getVaultPda(poolId, quoteMintPk),
      baseTokenProgram,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    };

    // Build ATAs
    const inputAta = await getAssociatedTokenAddress(
      tokenMintPk,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );
    const outputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);

    // Build instructions
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, outputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, inputAta, wallet.publicKey, tokenMintPk,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
      ),
      createCpmmSellIx(cfg, wallet.publicKey, tokenMintPk, inputAta, outputAta, sellAmount, minOut),
    ];

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet);

    const humanSellAmount = Number(sellAmount) / 10 ** balance.decimals;
    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: humanSellAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress: poolId.toBase58(),
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const tokenMint = new PublicKey(params.tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;
    const poolId = new PublicKey(params.poolAddress);
    const priorityFee = params.opts?.priorityFeeMicroLamports ?? 12_000_000; // Higher for snipe

    // Fetch pool on-chain to determine ammConfig
    const poolInfo = await connection.getAccountInfo(poolId);
    if (!poolInfo || !poolInfo.owner.equals(RAYDIUM_CPMM_PROGRAM_ID)) {
      throw new PoolNotFoundError(this.name, params.tokenMint, params.quoteMint);
    }
    const poolData = decodeCpmmPool(poolInfo.data);
    const ammConfig = poolData.ammConfig;

    // Detect base token program
    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMint);

    // Build SDK config
    const cfg: CpmmSdkConfig = {
      ammConfig,
      poolState: poolId,
      baseMint: tokenMint,
      quoteMint: quoteMintPk,
      baseVault: getVaultPda(poolId, tokenMint),
      quoteVault: getVaultPda(poolId, quoteMintPk),
      baseTokenProgram,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    };

    // Calculate amounts (zero slippage for snipe)
    const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
    const amountIn = BigInt(Math.floor(params.amountSol * 10 ** quoteDecimals));
    const minOut = 0n; // Unlimited slippage for sniping

    // Build ATAs
    const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
    const outputAta = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey,
      baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
      baseTokenProgram,
    );

    // Build instruction list
    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, outputAta, wallet.publicKey, tokenMint,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
      ),
    ];

    // WSOL wrapping for snipe
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      const lamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL);
      ixs.push(
        SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
        createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
      );
    }

    // Swap
    ixs.push(createCpmmBuyIx(cfg, wallet.publicKey, tokenMint, inputAta, outputAta, amountIn, minOut));

    // Close WSOL
    if (quoteMintPk.equals(WSOL_MINT_PK)) {
      ixs.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID));
    }

    // Submit via landing layer (concurrent for snipe)
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

  // ----- Build swap instructions (for nonce/orchestrator integration) -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const isBuy = "amountSol" in params;
    const tokenMintPk = new PublicKey(tokenMint);
    const quoteMintPk = params.quoteMint ? new PublicKey(params.quoteMint) : WSOL_MINT_PK;

    // Discover pool
    let poolId: PublicKey;
    let ammConfig: PublicKey;

    if (params.poolAddress) {
      poolId = new PublicKey(params.poolAddress);
      const poolInfo = await connection.getAccountInfo(poolId);
      if (!poolInfo) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      ammConfig = decodePoolAmmConfig(poolInfo.data);
    } else {
      const result = await discoverCpmmPool(connection, tokenMintPk, quoteMintPk);
      if (!result) throw new PoolNotFoundError(this.name, tokenMint, params.quoteMint);
      poolId = result.poolId;
      ammConfig = result.ammConfig;
    }

    const baseTokenProgram = await getTokenProgramForMint(connection, tokenMintPk);

    const cfg: CpmmSdkConfig = {
      ammConfig,
      poolState: poolId,
      baseMint: tokenMintPk,
      quoteMint: quoteMintPk,
      baseVault: getVaultPda(poolId, tokenMintPk),
      quoteVault: getVaultPda(poolId, quoteMintPk),
      baseTokenProgram,
      quoteTokenProgram: TOKEN_PROGRAM_ID,
    };

    const instructions: TransactionInstruction[] = [];

    if (isBuy) {
      const buyParams = params as BuyParams;
      const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
      const amountIn = BigInt(Math.floor(buyParams.amountSol * 10 ** quoteDecimals));

      const inputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);
      const outputAta = await getAssociatedTokenAddress(
        tokenMintPk,
        wallet.publicKey,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
        baseTokenProgram,
      );

      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, inputAta, wallet.publicKey, quoteMintPk),
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey, outputAta, wallet.publicKey, tokenMintPk,
          baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
        ),
      );

      if (quoteMintPk.equals(WSOL_MINT_PK)) {
        const lamports = Math.floor(buyParams.amountSol * LAMPORTS_PER_SOL);
        instructions.push(
          SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: inputAta, lamports }),
          createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID),
        );
      }

      instructions.push(createCpmmBuyIx(cfg, wallet.publicKey, tokenMintPk, inputAta, outputAta, amountIn, 0n));

      if (quoteMintPk.equals(WSOL_MINT_PK)) {
        instructions.push(createCloseAccountInstruction(inputAta, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID));
      }
    } else {
      const sellParams = params as SellParams;
      const balance = await getTokenBalance(connection, tokenMintPk, wallet.publicKey);
      const sellAmount = (balance.amount * BigInt(Math.floor(sellParams.percentage))) / 100n;

      const inputAta = await getAssociatedTokenAddress(
        tokenMintPk,
        wallet.publicKey,
        baseTokenProgram.equals(TOKEN_2022_PROGRAM_ID),
        baseTokenProgram,
      );
      const outputAta = await getAssociatedTokenAddress(quoteMintPk, wallet.publicKey);

      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, outputAta, wallet.publicKey, quoteMintPk),
        createCpmmSellIx(cfg, wallet.publicKey, tokenMintPk, inputAta, outputAta, sellAmount, 0n),
      );
    }

    return { instructions, signers: [] };
  }

  // ----- Pool discovery -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = quoteMint ? new PublicKey(quoteMint) : WSOL_MINT_PK;

    const result = await discoverCpmmPool(connection, baseMintPk, quoteMintPk);
    if (!result) return null;

    // Get reserves for price
    try {
      const reserves = await getPoolReserves(connection, result.poolId, baseMintPk, quoteMintPk);
      const quoteDecimals = quoteMintPk.equals(WSOL_MINT_PK) ? 9 : 6;
      // Estimate base decimals from reserves (fallback to 6)
      const baseDecimals = 6;
      const baseReserveHuman = Number(reserves.base) / 10 ** baseDecimals;
      const quoteReserveHuman = Number(reserves.quote) / 10 ** quoteDecimals;
      const price = baseReserveHuman > 0 ? quoteReserveHuman / baseReserveHuman : 0;

      return {
        address: result.poolId.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint,
        quoteMint: quoteMintPk.toBase58(),
        baseDecimals,
        quoteDecimals,
        price,
      };
    } catch {
      return {
        address: result.poolId.toBase58(),
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

    const poolInfo = await connection.getAccountInfo(poolId);
    if (!poolInfo || !poolInfo.owner.equals(RAYDIUM_CPMM_PROGRAM_ID)) {
      throw new Error(`Pool not found or not a CPMM pool: ${poolAddress}`);
    }

    const poolData = decodeCpmmPool(poolInfo.data);
    const baseMint = poolData.token0Mint;
    const quoteMint = poolData.token1Mint;

    // Determine which is quote (WSOL/USDC) vs base
    let actualBase: PublicKey;
    let actualQuote: PublicKey;
    if (quoteMint.equals(WSOL_MINT_PK) || quoteMint.equals(USDC_MINT_PK)) {
      actualBase = baseMint;
      actualQuote = quoteMint;
    } else if (baseMint.equals(WSOL_MINT_PK) || baseMint.equals(USDC_MINT_PK)) {
      actualBase = quoteMint;
      actualQuote = baseMint;
    } else {
      actualBase = baseMint;
      actualQuote = quoteMint;
    }

    const reserves = await getPoolReserves(connection, poolId, actualBase, actualQuote);
    const quoteDecimals = actualQuote.equals(WSOL_MINT_PK) ? 9 : 6;
    const baseDecimals = 6; // conservative default
    const baseReserveHuman = Number(reserves.base) / 10 ** baseDecimals;
    const quoteReserveHuman = Number(reserves.quote) / 10 ** quoteDecimals;
    const price = baseReserveHuman > 0 ? quoteReserveHuman / baseReserveHuman : 0;

    return {
      price,
      baseMint: actualBase.toBase58(),
      quoteMint: actualQuote.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }
}

// ---------------------------------------------------------------------------
// Register adapter
// ---------------------------------------------------------------------------

registerAdapter(new RaydiumCpmmAdapter());
