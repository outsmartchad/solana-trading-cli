/**
 * Meteora DAMM v2 (CP AMM) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/cp-amm-sdk (CpAmm) for buy/sell/snipe/findPool/getPrice
 * plus LP operations: addLiquidity (create position), removeLiquidity (close
 * position), and claimFees.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-damm-v2/
 *
 * SDK pattern:
 *   const cpAmm = new CpAmm(connection);
 *   const poolState = await cpAmm.fetchPoolState(poolAddress);
 *   const swapTx = await cpAmm.swap({ payer, pool, inputTokenMint, ... });
 *   const addTx = cpAmm.createPositionAndAddLiquidity({ ... });
 *   const removeTx = cpAmm.removeAllLiquidityAndClosePosition({ ... });
 *   const claimTx = cpAmm.claimPositionFee2({ ... });
 */

import BN from "bn.js";
import Decimal from "decimal.js";
import {
  PublicKey,
  Keypair,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  CpAmm,
  SwapParams,
  PoolState,
  PositionState,
  PoolFeesParams,
  BaseFee,
  LIQUIDITY_SCALE,
  getTokenProgram as sdkGetTokenProgram,
  getSqrtPriceFromPrice,
  getPriceFromSqrtPrice,
  getBaseFeeParams,
  getDynamicFeeParams,
  calculateTransferFeeIncludedAmount,
  ActivationType,
  BaseFeeMode,
  BIN_STEP_BPS_DEFAULT,
  BIN_STEP_BPS_U128_DEFAULT,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
} from "@meteora-ag/cp-amm-sdk";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  unpackMint,
} from "@solana/spl-token";
import { MathUtil } from "@raydium-io/raydium-sdk-v2";

import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

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
  AddLiquidityParams,
  RemoveLiquidityParams,
  CreateCustomPoolParams,
  CreateConfigPoolParams,
  LpPositionInfo,
  TxResult,
  UnsupportedOperationError,
  PoolNotFoundError,
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAMM_PROGRAM_ID = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");

/** Known stablecoin mints with 6 decimals */
const SIX_DECIMAL_MINTS = new Set([
  USDC_MINT,
  USDT_MINT,
  "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB", // USD1
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

function amountToLamports(amount: number, quoteMintStr: string): BN {
  const decimals = quoteDecimals(quoteMintStr);
  return new BN(Math.floor(amount * Math.pow(10, decimals)));
}

/** Map token flag to token program ID (0=SPL, 1=Token-2022) */
function getTokenProgram(flag: number): PublicKey {
  return flag === 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
}

/** Convert sqrtPriceX64 to human price */
function sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal {
  return MathUtil.x64ToDecimal(sqrtPriceX64)
    .pow(2)
    .mul(Decimal.pow(10, decimalsA - decimalsB));
}

/**
 * Calculate initial sqrt price from reserves and sqrt bounds.
 * Ported from source: meteora-damm-v2/buy.ts calculateInitSqrtPrice()
 */
function calculateInitSqrtPrice(
  tokenAAmount: BN,
  tokenBAmount: BN,
  minSqrtPrice: BN,
  maxSqrtPrice: BN,
): BN {
  if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
    throw new Error("Amount cannot be zero");
  }

  const amountADecimal = new Decimal(tokenAAmount.toString());
  const amountBDecimal = new Decimal(tokenBAmount.toString());
  const minSqrtPriceDecimal = new Decimal(minSqrtPrice.toString()).div(Decimal.pow(2, 64));
  const maxSqrtPriceDecimal = new Decimal(maxSqrtPrice.toString()).div(Decimal.pow(2, 64));

  const x = new Decimal(1).div(maxSqrtPriceDecimal);
  const y = amountBDecimal.div(amountADecimal);
  const xy = x.mul(y);

  const paMinusXY = minSqrtPriceDecimal.sub(xy);
  const xyMinusPa = xy.sub(minSqrtPriceDecimal);
  const fourY = new Decimal(4).mul(y);
  const discriminant = xyMinusPa.mul(xyMinusPa).add(fourY);
  const sqrtDiscriminant = discriminant.sqrt();

  const result = paMinusXY
    .add(sqrtDiscriminant)
    .div(new Decimal(2))
    .mul(Decimal.pow(2, 64));

  return new BN(result.floor().toFixed());
}

// PDA derivation helpers (from source utils/pda.ts)

function getFirstKey(key1: PublicKey, key2: PublicKey): Buffer {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  return Buffer.compare(buf1, buf2) === 1 ? buf1 : buf2;
}

function getSecondKey(key1: PublicKey, key2: PublicKey): Buffer {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  return Buffer.compare(buf1, buf2) === 1 ? buf2 : buf1;
}

function deriveCustomizablePoolAddress(tokenAMint: PublicKey, tokenBMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("cpool"), getFirstKey(tokenAMint, tokenBMint), getSecondKey(tokenAMint, tokenBMint)],
    DAMM_PROGRAM_ID,
  )[0];
}

function derivePoolAddress(config: PublicKey, tokenAMint: PublicKey, tokenBMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), config.toBuffer(), getFirstKey(tokenAMint, tokenBMint), getSecondKey(tokenAMint, tokenBMint)],
    DAMM_PROGRAM_ID,
  )[0];
}

function derivePositionAddress(positionNft: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), positionNft.toBuffer()],
    DAMM_PROGRAM_ID,
  )[0];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MeteoraDammV2Adapter implements IDexAdapter {
  readonly name = "meteora-damm-v2";
  readonly protocol = "damm-v2";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: true,
    canGetPrice: true,
    canAddLiquidity: true,
    canRemoveLiquidity: true,
    canClaimFees: true,
    canListPositions: true,
    canCreatePool: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const { tokenMint, amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const poolPk = poolAddress
      ? new PublicKey(poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

    const cpAmm = new CpAmm(connection);
    const poolState = await cpAmm.fetchPoolState(poolPk);

    const baseMintPk = new PublicKey(tokenMint);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    const swapParams: SwapParams = {
      payer: wallet.publicKey,
      pool: poolPk,
      inputTokenMint: quoteMintPk,
      outputTokenMint: baseMintPk,
      amountIn: inputAmount,
      minimumAmountOut: new BN(0),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      referralTokenAccount: null,
    };

    const swapTx = await cpAmm.swap(swapParams);

    // Ensure output token ATA exists before swap
    const baseMintAccInfo = await connection.getAccountInfo(baseMintPk);
    const baseTokenProgram = baseMintAccInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    const outputAta = await getAssociatedTokenAddress(
      baseMintPk, wallet.publicKey, false, baseTokenProgram,
    );
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey, outputAta, wallet.publicKey, baseMintPk, baseTokenProgram,
    );

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createAtaIx,
      ...swapTx.instructions,
    ];

    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress: poolPk.toBase58(),
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const { tokenMint, percentage, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const poolPk = poolAddress
      ? new PublicKey(poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

    const baseMintPk = new PublicKey(tokenMint);
    const quoteMintPk = new PublicKey(quoteMintStr);

    // Determine token program for baseMint
    const baseMintAccInfo = await connection.getAccountInfo(baseMintPk);
    if (!baseMintAccInfo) {
      throw new Error(`Token mint not found: ${tokenMint}`);
    }
    const baseTokenProgram = baseMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    // Get token balance
    const ata = await getAssociatedTokenAddress(baseMintPk, wallet.publicKey, false, baseTokenProgram);
    const tokenAccount = await getAccount(connection, ata, "confirmed", baseTokenProgram);
    const balance = tokenAccount.amount;

    // Calculate sell amount based on percentage
    const sellAmount = new BN(
      Math.floor((Number(balance) * percentage) / 100).toString(),
    );

    if (sellAmount.isZero()) {
      throw new Error(`No balance to sell for ${tokenMint}`);
    }

    const cpAmm = new CpAmm(connection);
    const poolState = await cpAmm.fetchPoolState(poolPk);

    const swapParams: SwapParams = {
      payer: wallet.publicKey,
      pool: poolPk,
      inputTokenMint: baseMintPk,
      outputTokenMint: quoteMintPk,
      amountIn: sellAmount,
      minimumAmountOut: new BN(0),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      referralTokenAccount: null,
    };

    const swapTx = await cpAmm.swap(swapParams);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...swapTx.instructions,
    ];

    const rpcResult = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    // Get actual token decimals for human-readable amount
    let tokenDecimals = 9; // default
    try {
      const mintData = await connection.getTokenSupply(baseMintPk);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 9 */ }
    const humanAmount = Number(sellAmount.toString()) / Math.pow(10, tokenDecimals);
    return {
      txSignature: rpcResult.txSignature,
      confirmed: rpcResult.confirmed,
      amountIn: humanAmount,
      amountInToken: tokenMint,
      dex: this.name,
      poolAddress: poolPk.toBase58(),
    };
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    const poolPk = new PublicKey(poolAddress);
    const baseMintPk = new PublicKey(tokenMint);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    const cpAmm = new CpAmm(connection);
    const poolState = await cpAmm.fetchPoolState(poolPk);

    const swapParams: SwapParams = {
      payer: wallet.publicKey,
      pool: poolPk,
      inputTokenMint: quoteMintPk,
      outputTokenMint: baseMintPk,
      amountIn: inputAmount,
      minimumAmountOut: new BN(0), // unlimited slippage for snipe
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      referralTokenAccount: null,
    };

    const swapTx = await cpAmm.swap(swapParams);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 40_000_000; // high priority for snipe

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...swapTx.instructions,
    ];

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "snipe",
      tipSol,
      addressLookupTables: opts?.addressLookupTables,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- buildSwapIxs -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const cpAmm = new CpAmm(connection);

    if ("percentage" in params) {
      // Sell path
      const sellParams = params as SellParams;
      const quoteMintStr = sellParams.quoteMint ?? WSOL_MINT;
      const poolPk = sellParams.poolAddress
        ? new PublicKey(sellParams.poolAddress)
        : await this.resolvePool(sellParams.tokenMint, quoteMintStr);

      const baseMintPk = new PublicKey(sellParams.tokenMint);
      const quoteMintPk = new PublicKey(quoteMintStr);

      // Get balance
      const baseMintAccInfo = await connection.getAccountInfo(baseMintPk);
      const baseTokenProgram =
        baseMintAccInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
      const ata = await getAssociatedTokenAddress(baseMintPk, wallet.publicKey, false, baseTokenProgram);
      const tokenAccount = await getAccount(connection, ata, "confirmed", baseTokenProgram);
      const sellAmount = new BN(
        Math.floor((Number(tokenAccount.amount) * sellParams.percentage) / 100).toString(),
      );

      const poolState = await cpAmm.fetchPoolState(poolPk);
      const swapTx = await cpAmm.swap({
        payer: wallet.publicKey,
        pool: poolPk,
        inputTokenMint: baseMintPk,
        outputTokenMint: quoteMintPk,
        amountIn: sellAmount,
        minimumAmountOut: new BN(0),
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
        referralTokenAccount: null,
      });

      return { instructions: swapTx.instructions, signers: [] };
    }

    // Buy path
    const buyParams = params as BuyParams;
    const quoteMintStr = buyParams.quoteMint ?? WSOL_MINT;
    const poolPk = buyParams.poolAddress
      ? new PublicKey(buyParams.poolAddress)
      : await this.resolvePool(buyParams.tokenMint, quoteMintStr);

    const baseMintPk = new PublicKey(buyParams.tokenMint);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const inputAmount = amountToLamports(buyParams.amountSol, quoteMintStr);

    const poolState = await cpAmm.fetchPoolState(poolPk);
    const swapTx = await cpAmm.swap({
      payer: wallet.publicKey,
      pool: poolPk,
      inputTokenMint: quoteMintPk,
      outputTokenMint: baseMintPk,
      amountIn: inputAmount,
      minimumAmountOut: new BN(0),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      referralTokenAccount: null,
    });

    return { instructions: swapTx.instructions, signers: [] };
  }

  // ----- findPool -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = new PublicKey(quoteMint ?? WSOL_MINT);
    const cpAmm = new CpAmm(connection);

    // Try customizable pool PDA first (most common)
    const customPoolAddr = deriveCustomizablePoolAddress(baseMintPk, quoteMintPk);
    try {
      const poolState = await cpAmm.fetchPoolState(customPoolAddr);
      if (poolState) {
        return {
          address: customPoolAddr.toBase58(),
          dex: this.name,
          protocol: this.protocol,
          baseMint,
          quoteMint: quoteMint ?? WSOL_MINT,
          baseDecimals: 0, // CpAmm poolState doesn't directly expose decimals
          quoteDecimals: 0,
        };
      }
    } catch {
      // Not found at customizable PDA — fall through
    }

    // Could iterate config-based pools but that's expensive (requires getAllConfigs).
    // For now, return null — callers should provide poolAddress when possible.
    return null;
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);
    const cpAmm = new CpAmm(connection);

    const poolState = await cpAmm.fetchPoolState(poolPk);
    const sqrtMaxPrice = poolState.sqrtMaxPrice;
    const sqrtMinPrice = poolState.sqrtMinPrice;

    // Fetch vault balances for price calculation
    const [balA, balB] = await Promise.all([
      connection.getTokenAccountBalance(poolState.tokenAVault),
      connection.getTokenAccountBalance(poolState.tokenBVault),
    ]);

    const tokenAAmount = new BN(balA.value.amount);
    const tokenBAmount = new BN(balB.value.amount);
    const decimalsA = balA.value.decimals;
    const decimalsB = balB.value.decimals;

    let price: number;
    if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
      price = 0;
    } else {
      const sqrtPriceX64 = calculateInitSqrtPrice(tokenAAmount, tokenBAmount, sqrtMinPrice, sqrtMaxPrice);
      const priceDecimal = sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB);
      const rawPrice = Number(priceDecimal);
      // Source normalizes: if price > 1, invert
      price = rawPrice > 1 ? 1 / rawPrice : rawPrice;
    }

    return {
      price,
      baseMint: poolState.tokenAMint.toBase58(),
      quoteMint: poolState.tokenBMint.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ----- LP: addLiquidity -----

  /**
   * Add liquidity to an existing DAMM v2 pool by creating a new position.
   *
   * DAMM v2 uses full-range positions (MIN_SQRT_PRICE → MAX_SQRT_PRICE).
   *
   * The correct pattern (from zodiac/operator meteora-executor.ts):
   *   1. Read the pool's actual sqrtPrice from on-chain state
   *   2. Compute both token amounts proportionally from pool vault reserves
   *   3. Pass both amounts + pool's sqrtPrice to getLiquidityDelta()
   *
   * The SDK's getLiquidityDelta is the black box — give it both max amounts
   * + the current sqrtPrice, it figures out the correct liquidity delta.
   */
  async addLiquidity(params: AddLiquidityParams): Promise<TxResult> {
    const { poolAddress, opts } = params;
    const inputAmountSol = params.amountSol ?? params.amountA;
    const inputAmountToken = params.amountToken ?? params.amountB;

    if ((inputAmountSol === undefined || inputAmountSol === 0) &&
        (inputAmountToken === undefined || inputAmountToken === 0)) {
      throw new Error("At least one of --amount-sol or --amount-token is required for DAMM v2 addLiquidity");
    }

    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const cpAmm = new CpAmm(connection);
    const poolState = await cpAmm.fetchPoolState(poolPk);

    // Pool's current sqrt price from on-chain state — the ground truth
    const currentSqrtPrice = poolState.sqrtPrice;

    // Fetch decimals for both tokens
    const tokenAMint = poolState.tokenAMint;
    const tokenBMint = poolState.tokenBMint;
    const tokenAProgram = sdkGetTokenProgram(poolState.tokenAFlag);
    const tokenBProgram = sdkGetTokenProgram(poolState.tokenBFlag);

    const [tokenAMintInfo, tokenBMintInfo] = await Promise.all([
      connection.getAccountInfo(tokenAMint),
      connection.getAccountInfo(tokenBMint),
    ]);

    if (!tokenAMintInfo || !tokenBMintInfo) {
      throw new Error("Failed to fetch mint account info");
    }

    const mintA = unpackMint(tokenAMint, tokenAMintInfo, tokenAMintInfo.owner);
    const mintB = unpackMint(tokenBMint, tokenBMintInfo, tokenBMintInfo.owner);
    const decimalsA = mintA.decimals;
    const decimalsB = mintB.decimals;

    // Detect Token-2022 transfer fees
    let tokenAInfo: { mint: typeof mintA; currentEpoch: number } | undefined;
    let tokenBInfo: { mint: typeof mintB; currentEpoch: number } | undefined;

    if (tokenAMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      tokenAInfo = { mint: mintA, currentEpoch: epochInfo.epoch };
    }
    if (tokenBMintInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      tokenBInfo = { mint: mintB, currentEpoch: epochInfo.epoch };
    }

    // Read pool vault balances for proportional calculation
    const [balA, balB] = await Promise.all([
      connection.getTokenAccountBalance(poolState.tokenAVault),
      connection.getTokenAccountBalance(poolState.tokenBVault),
    ]);
    const reserveA = new BN(balA.value.amount);
    const reserveB = new BN(balB.value.amount);

    // Compute both token amounts. When only one side is given,
    // derive the other proportionally from pool vault reserves.
    let tokenAAmount: BN;
    let tokenBAmount: BN;

    if (inputAmountSol !== undefined && inputAmountSol > 0 &&
        inputAmountToken !== undefined && inputAmountToken > 0) {
      // Both sides provided explicitly
      tokenAAmount = new BN(
        new Decimal(inputAmountSol).mul(Decimal.pow(10, decimalsA)).floor().toFixed(),
      );
      tokenBAmount = new BN(
        new Decimal(inputAmountToken).mul(Decimal.pow(10, decimalsB)).floor().toFixed(),
      );
    } else if (inputAmountSol !== undefined && inputAmountSol > 0) {
      // Only SOL provided — figure out which side SOL is, derive the other
      const solIsTokenA = tokenAMint.toBase58() === WSOL_MINT;

      if (solIsTokenA) {
        tokenAAmount = new BN(
          new Decimal(inputAmountSol).mul(Decimal.pow(10, decimalsA)).floor().toFixed(),
        );
        // Derive B proportionally: tokenBAmount = tokenAAmount * reserveB / reserveA
        if (reserveA.isZero()) throw new Error("Pool has zero token A reserves");
        tokenBAmount = tokenAAmount.mul(reserveB).div(reserveA);
      } else {
        // SOL is token B
        tokenBAmount = new BN(
          new Decimal(inputAmountSol).mul(Decimal.pow(10, decimalsB)).floor().toFixed(),
        );
        // Derive A proportionally: tokenAAmount = tokenBAmount * reserveA / reserveB
        if (reserveB.isZero()) throw new Error("Pool has zero token B reserves");
        tokenAAmount = tokenBAmount.mul(reserveA).div(reserveB);
      }
    } else {
      // Only token amount provided — figure out which side is non-SOL
      const solIsTokenA = tokenAMint.toBase58() === WSOL_MINT;

      if (solIsTokenA) {
        // Non-SOL token is B side
        tokenBAmount = new BN(
          new Decimal(inputAmountToken!).mul(Decimal.pow(10, decimalsB)).floor().toFixed(),
        );
        if (reserveB.isZero()) throw new Error("Pool has zero token B reserves");
        tokenAAmount = tokenBAmount.mul(reserveA).div(reserveB);
      } else {
        // Non-SOL token is A side (or neither is SOL — treat token as A)
        tokenAAmount = new BN(
          new Decimal(inputAmountToken!).mul(Decimal.pow(10, decimalsA)).floor().toFixed(),
        );
        if (reserveA.isZero()) throw new Error("Pool has zero token A reserves");
        tokenBAmount = tokenAAmount.mul(reserveB).div(reserveA);
      }
    }

    // Compute liquidityDelta using the pool's actual on-chain sqrtPrice
    // This is the same pattern as zodiac/operator meteora-executor.ts
    const liquidityDelta = cpAmm.getLiquidityDelta({
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: tokenBAmount,
      sqrtPrice: currentSqrtPrice,
      sqrtMinPrice: MIN_SQRT_PRICE,
      sqrtMaxPrice: MAX_SQRT_PRICE,
      tokenAInfo,
      tokenBInfo,
    });

    if (liquidityDelta.isZero()) {
      throw new Error("Computed liquidityDelta is zero — amount too small for this pool");
    }

    // Generate a new position NFT keypair
    const positionNft = Keypair.generate();

    // Slippage thresholds
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const tokenAThreshold = tokenAAmount.muln(10000 - slippageBps).divn(10000);
    const tokenBThreshold = tokenBAmount.muln(10000 - slippageBps).divn(10000);

    console.log(`  tokenA:    ${tokenAAmount.toString()} (${tokenAMint.toBase58().slice(0, 8)}...)`);
    console.log(`  tokenB:    ${tokenBAmount.toString()} (${tokenBMint.toBase58().slice(0, 8)}...)`);
    console.log(`  liqDelta:  ${liquidityDelta.toString()}`);

    const addLiqTx = await cpAmm.createPositionAndAddLiquidity({
      owner: wallet.publicKey,
      pool: poolPk,
      positionNft: positionNft.publicKey,
      liquidityDelta,
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: tokenBAmount,
      tokenAAmountThreshold: tokenAThreshold,
      tokenBAmountThreshold: tokenBThreshold,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
    });

    const computeLimit = opts?.computeUnitLimit ?? 400_000;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...addLiqTx.instructions,
    ];

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
      extraSigners: [positionNft],
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
    };
  }

  // ----- LP: removeLiquidity -----

  /**
   * Remove liquidity from all DAMM v2 positions on a pool.
   *
   * Uses getPositionsByUser() to discover positions on-chain (no database
   * dependency), then calls removeAllLiquidityAndClosePosition() for each.
   *
   * Params:
   *   - poolAddress: the pool to remove liquidity from
   *   - percentage: 100 = remove all, <100 = partial (only full removal
   *     supported by the SDK's close-position method — partial uses removeLiquidity)
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/pool.ts
   *   removeAllLiquidityAndCloseAllPositions()
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<TxResult> {
    const { poolAddress, percentage, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const cpAmm = new CpAmm(connection);

    // Discover user positions on-chain — no database needed
    const userPositions = await cpAmm.getPositionsByUser(wallet.publicKey);

    // Filter to positions belonging to this pool
    const poolPositions = userPositions.filter(
      (p) => p.positionState.pool.toBase58() === poolAddress,
    );

    if (poolPositions.length === 0) {
      throw new Error(`No positions found for pool ${poolAddress}`);
    }

    const poolState = await cpAmm.fetchPoolState(poolPk);
    const currentSlot = await connection.getSlot();
    const currentPoint = new BN(currentSlot);

    let lastSignature = "";
    let anyConfirmed = false;

    for (const pos of poolPositions) {
      const positionState = await cpAmm.fetchPositionState(pos.position);

      // Check total liquidity
      const totalLiquidity = positionState.unlockedLiquidity
        .add(positionState.vestedLiquidity)
        .add(positionState.permanentLockedLiquidity);

      if (totalLiquidity.isZero()) {
        continue; // skip empty positions
      }

      // Skip permanently locked positions — cannot close
      if (!positionState.permanentLockedLiquidity.isZero()) {
        console.log(`Skipping position ${pos.position.toBase58()} — has permanent locked liquidity`);
        continue;
      }

      const computeLimit = opts?.computeUnitLimit ?? 400_000;
      const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

      if (percentage >= 100) {
        // Full removal + close position
        const closeTx = await cpAmm.removeAllLiquidityAndClosePosition({
          owner: wallet.publicKey,
          position: pos.position,
          positionNftAccount: pos.positionNftAccount,
          positionState,
          poolState,
          tokenAAmountThreshold: new BN(0),
          tokenBAmountThreshold: new BN(0),
          currentPoint,
          vestings: [],
        });

        const ixs: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
          ...closeTx.instructions,
        ];

        // Submit via RPC send+confirm
        const result = await sendAndConfirmVtx(connection, ixs, wallet, {
          addressLookupTables: opts?.addressLookupTables,
        });

        if (result.txSignature) lastSignature = result.txSignature;
        if (result.confirmed) anyConfirmed = true;
      } else {
        // Partial removal — calculate proportional liquidityDelta
        const removableLiquidity = positionState.unlockedLiquidity.add(positionState.vestedLiquidity);
        const liquidityDelta = removableLiquidity.muln(percentage).divn(100);

        if (liquidityDelta.isZero()) {
          continue;
        }

        const removeTx = await cpAmm.removeLiquidity({
          owner: wallet.publicKey,
          position: pos.position,
          pool: poolPk,
          positionNftAccount: pos.positionNftAccount,
          liquidityDelta,
          tokenAAmountThreshold: new BN(0),
          tokenBAmountThreshold: new BN(0),
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: sdkGetTokenProgram(poolState.tokenAFlag),
          tokenBProgram: sdkGetTokenProgram(poolState.tokenBFlag),
          vestings: [],
          currentPoint,
        });

        const ixs: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
          ...removeTx.instructions,
        ];

        // Submit via RPC send+confirm
        const result = await sendAndConfirmVtx(connection, ixs, wallet, {
          addressLookupTables: opts?.addressLookupTables,
        });

        if (result.txSignature) lastSignature = result.txSignature;
        if (result.confirmed) anyConfirmed = true;
      }
    }

    return {
      txSignature: lastSignature,
      confirmed: anyConfirmed,
    };
  }

  // ----- LP: claimFees -----

  /**
   * Claim unclaimed fees from all DAMM v2 positions on a pool.
   *
   * Uses getPositionsByUser() + on-chain fee math (no database dependency).
   * Iterates all positions for the given pool, skips those with zero fees.
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/pool.ts
   *   claimAllPositionFees() + getUnClaimLpFee()
   */
  async claimFees(poolAddress: string, _positionAddress?: string): Promise<TxResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const cpAmm = new CpAmm(connection);
    const userPositions = await cpAmm.getPositionsByUser(wallet.publicKey);

    // Filter to positions belonging to this pool
    const poolPositions = userPositions.filter(
      (p) => p.positionState.pool.toBase58() === poolAddress,
    );

    if (poolPositions.length === 0) {
      throw new Error(`No positions found for pool ${poolAddress}`);
    }

    const poolState = await cpAmm.fetchPoolState(poolPk);

    let lastSignature = "";
    let anyConfirmed = false;

    for (const pos of poolPositions) {
      const positionState = await cpAmm.fetchPositionState(pos.position);

      // Calculate unclaimed fees using on-chain math
      // Ported from source getUnClaimLpFee()
      const totalPositionLiquidity = positionState.unlockedLiquidity
        .add(positionState.vestedLiquidity)
        .add(positionState.permanentLockedLiquidity);

      const feeAPerTokenStored = new BN(
        Buffer.from(poolState.feeAPerLiquidity).reverse(),
      ).sub(new BN(Buffer.from(positionState.feeAPerTokenCheckpoint).reverse()));

      const feeBPerTokenStored = new BN(
        Buffer.from(poolState.feeBPerLiquidity).reverse(),
      ).sub(new BN(Buffer.from(positionState.feeBPerTokenCheckpoint).reverse()));

      const feeA = positionState.feeAPending.add(
        totalPositionLiquidity.mul(feeAPerTokenStored).shrn(LIQUIDITY_SCALE),
      );
      const feeB = positionState.feeBPending.add(
        totalPositionLiquidity.mul(feeBPerTokenStored).shrn(LIQUIDITY_SCALE),
      );

      // Skip if no fees to claim
      if (feeA.isZero() && feeB.isZero()) {
        continue;
      }

      const claimTx = await cpAmm.claimPositionFee2({
        owner: wallet.publicKey,
        pool: poolPk,
        position: pos.position,
        receiver: wallet.publicKey,
        positionNftAccount: pos.positionNftAccount,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAProgram: sdkGetTokenProgram(poolState.tokenAFlag),
        tokenBProgram: sdkGetTokenProgram(poolState.tokenBFlag),
      });

      const ixs: TransactionInstruction[] = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS }),
        ...claimTx.instructions,
      ];

      // Submit via RPC send+confirm
      const result = await sendAndConfirmVtx(connection, ixs, wallet);

      if (result.txSignature) lastSignature = result.txSignature;
      if (result.confirmed) anyConfirmed = true;
    }

    return {
      txSignature: lastSignature,
      confirmed: anyConfirmed,
    };
  }

  // ----- Pool creation: createCustomPool -----

  /**
   * Create a DAMM v2 pool with full fee configuration (custom pool).
   *
   * Uses `cpAmm.createCustomPool()` — allows setting fee schedule, price range,
   * activation params, dynamic fee, and collect-fee mode.
   *
   * This is the primary method for token launches. Creates a customizable pool
   * with MIN_SQRT_PRICE → MAX_SQRT_PRICE full-range liquidity.
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/create.ts
   *   createDammV2BalancedPool()
   */
  async createCustomPool(params: CreateCustomPoolParams): Promise<TxResult> {
    const {
      baseMint,
      quoteMint: quoteMintParam,
      baseAmount,
      quoteAmount,
      poolFees,
      collectFeeMode = 1,
      activationType = 1,
      activationPoint = null,
      hasAlphaVault = false,
      opts,
    } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = new PublicKey(quoteMintStr);

    // Fetch mint info for both tokens
    const [baseMintAccInfo, quoteMintAccInfo] = await Promise.all([
      connection.getAccountInfo(baseMintPk),
      connection.getAccountInfo(quoteMintPk),
    ]);

    if (!baseMintAccInfo) throw new Error(`Base mint not found: ${baseMint}`);
    if (!quoteMintAccInfo) throw new Error(`Quote mint not found: ${quoteMintStr}`);

    const baseMintData = unpackMint(baseMintPk, baseMintAccInfo, baseMintAccInfo.owner);
    const quoteMintData = unpackMint(quoteMintPk, quoteMintAccInfo, quoteMintAccInfo.owner);
    const baseDecimals = baseMintData.decimals;
    const quoteDecimalCount = quoteDecimals(quoteMintStr);

    const baseTokenProgram = baseMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    const quoteTokenProgram = quoteMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    // Detect Token-2022 transfer fees
    let baseTokenInfo: { mint: typeof baseMintData; currentEpoch: number } | undefined;
    let quoteTokenInfo: { mint: typeof quoteMintData; currentEpoch: number } | undefined;

    if (baseMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      baseTokenInfo = { mint: baseMintData, currentEpoch: epochInfo.epoch };
    }
    if (quoteMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      quoteTokenInfo = { mint: quoteMintData, currentEpoch: epochInfo.epoch };
    }

    // Convert human amounts to lamports
    let tokenAAmount = new BN(
      new Decimal(baseAmount).mul(Decimal.pow(10, baseDecimals)).floor().toFixed(),
    );
    let tokenBAmount = new BN(
      new Decimal(quoteAmount).mul(Decimal.pow(10, quoteDecimalCount)).floor().toFixed(),
    );

    // Subtract transfer fees for Token-2022 tokens
    if (baseTokenInfo) {
      tokenAAmount = tokenAAmount.sub(
        calculateTransferFeeIncludedAmount(tokenAAmount, baseTokenInfo.mint, baseTokenInfo.currentEpoch).transferFee,
      );
    }
    if (quoteTokenInfo) {
      tokenBAmount = tokenBAmount.sub(
        calculateTransferFeeIncludedAmount(tokenBAmount, quoteTokenInfo.mint, quoteTokenInfo.currentEpoch).transferFee,
      );
    }

    const cpAmm = new CpAmm(connection);

    // Calculate initial sqrt price
    const initPrice = params.initPrice ?? quoteAmount / baseAmount;
    const initSqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), baseDecimals, quoteDecimalCount);

    // Full-range liquidity
    const minSqrtPrice = MIN_SQRT_PRICE;
    const maxSqrtPrice = MAX_SQRT_PRICE;

    const liquidityDelta = cpAmm.getLiquidityDelta({
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: tokenBAmount,
      sqrtPrice: initSqrtPrice,
      sqrtMinPrice: minSqrtPrice,
      sqrtMaxPrice: maxSqrtPrice,
      tokenAInfo: baseTokenInfo,
    });

    // Build fee params
    const {
      maxBaseFeeBps,
      minBaseFeeBps,
      numberOfPeriod,
      totalDuration,
      feeSchedulerMode,
      useDynamicFee,
      dynamicFeeConfig,
    } = poolFees;

    let dynamicFee: any = null;
    if (useDynamicFee) {
      if (dynamicFeeConfig) {
        dynamicFee = {
          binStep: BIN_STEP_BPS_DEFAULT,
          binStepU128: BIN_STEP_BPS_U128_DEFAULT,
          filterPeriod: dynamicFeeConfig.filterPeriod,
          decayPeriod: dynamicFeeConfig.decayPeriod,
          reductionFactor: dynamicFeeConfig.reductionFactor,
          variableFeeControl: dynamicFeeConfig.variableFeeControl,
          maxVolatilityAccumulator: dynamicFeeConfig.maxVolatilityAccumulator,
        };
      } else {
        dynamicFee = getDynamicFeeParams(minBaseFeeBps);
      }
    }

    const baseFee: BaseFee = getBaseFeeParams(
      {
        baseFeeMode:
          feeSchedulerMode === 0
            ? BaseFeeMode.FeeTimeSchedulerLinear
            : BaseFeeMode.FeeTimeSchedulerExponential,
        feeTimeSchedulerParam: {
          startingFeeBps: maxBaseFeeBps,
          endingFeeBps: minBaseFeeBps,
          numberOfPeriod,
          totalDuration,
        },
      },
      quoteDecimalCount,
      ActivationType.Timestamp,
    );

    const poolFeesParams: PoolFeesParams = {
      baseFee,
      padding: [],
      dynamicFee,
    };

    const positionNft = Keypair.generate();

    const {
      tx: initCustomPoolTx,
      pool,
      position,
    } = await cpAmm.createCustomPool({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      positionNft: positionNft.publicKey,
      tokenAMint: baseMintPk,
      tokenBMint: quoteMintPk,
      tokenAAmount,
      tokenBAmount,
      sqrtMinPrice: minSqrtPrice,
      sqrtMaxPrice: maxSqrtPrice,
      liquidityDelta,
      initSqrtPrice,
      poolFees: poolFeesParams,
      hasAlphaVault,
      activationType,
      collectFeeMode,
      activationPoint: activationPoint != null ? new BN(activationPoint) : null,
      tokenAProgram: baseTokenProgram,
      tokenBProgram: quoteTokenProgram,
    });

    const computeLimit = opts?.computeUnitLimit ?? 400_000;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...initCustomPoolTx.instructions,
    ];

    console.log(`  pool:      ${pool.toBase58()}`);
    console.log(`  position:  ${position.toBase58()}`);
    console.log(`  price:     ${getPriceFromSqrtPrice(initSqrtPrice, baseDecimals, quoteDecimalCount)}`);

    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
      extraSigners: [positionNft],
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      poolAddress: pool.toBase58(),
      positionAddress: position.toBase58(),
      dex: this.name,
    };
  }

  // ----- Pool creation: createConfigPool -----

  /**
   * Create a DAMM v2 pool using a pre-existing on-chain config.
   *
   * Uses `cpAmm.createPool()` — simpler, less customizable. The config
   * determines the fee schedule and price range boundaries.
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/create.ts
   *   createDammV2Pool()
   */
  async createConfigPool(params: CreateConfigPoolParams): Promise<TxResult> {
    const {
      baseMint,
      quoteMint: quoteMintParam,
      baseAmount,
      quoteAmount,
      configAddress,
      activationPoint = null,
      lockLiquidity = false,
      opts,
    } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const configPk = new PublicKey(configAddress);

    // Fetch mint info
    const [baseMintAccInfo, quoteMintAccInfo] = await Promise.all([
      connection.getAccountInfo(baseMintPk),
      connection.getAccountInfo(quoteMintPk),
    ]);

    if (!baseMintAccInfo) throw new Error(`Base mint not found: ${baseMint}`);
    if (!quoteMintAccInfo) throw new Error(`Quote mint not found: ${quoteMintStr}`);

    const baseMintData = unpackMint(baseMintPk, baseMintAccInfo, baseMintAccInfo.owner);
    const quoteMintData = unpackMint(quoteMintPk, quoteMintAccInfo, quoteMintAccInfo.owner);
    const baseDecimals = baseMintData.decimals;
    const quoteDecimalCount = quoteDecimals(quoteMintStr);

    const baseTokenProgram = baseMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    const quoteTokenProgram = quoteMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    // Token-2022 transfer fee detection
    let baseTokenInfo: { mint: typeof baseMintData; currentEpoch: number } | undefined;
    let quoteTokenInfo: { mint: typeof quoteMintData; currentEpoch: number } | undefined;

    if (baseMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      baseTokenInfo = { mint: baseMintData, currentEpoch: epochInfo.epoch };
    }
    if (quoteMintAccInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      const epochInfo = await connection.getEpochInfo();
      quoteTokenInfo = { mint: quoteMintData, currentEpoch: epochInfo.epoch };
    }

    let tokenAAmount = new BN(
      new Decimal(baseAmount).mul(Decimal.pow(10, baseDecimals)).floor().toFixed(),
    );
    let tokenBAmount = new BN(
      new Decimal(quoteAmount).mul(Decimal.pow(10, quoteDecimalCount)).floor().toFixed(),
    );

    if (baseTokenInfo) {
      tokenAAmount = tokenAAmount.sub(
        calculateTransferFeeIncludedAmount(tokenAAmount, baseTokenInfo.mint, baseTokenInfo.currentEpoch).transferFee,
      );
    }
    if (quoteTokenInfo) {
      tokenBAmount = tokenBAmount.sub(
        calculateTransferFeeIncludedAmount(tokenBAmount, quoteTokenInfo.mint, quoteTokenInfo.currentEpoch).transferFee,
      );
    }

    const cpAmm = new CpAmm(connection);

    // Fetch config state to get its price range
    const configState = await cpAmm.fetchConfigState(configPk);

    // Calculate initial sqrt price
    const initPrice = params.initPrice ?? quoteAmount / baseAmount;
    const initSqrtPrice = getSqrtPriceFromPrice(initPrice.toString(), baseDecimals, quoteDecimalCount);

    // Use config's price range for liquidity delta
    const liquidityDelta = cpAmm.getLiquidityDelta({
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: tokenBAmount,
      sqrtPrice: initSqrtPrice,
      sqrtMinPrice: configState.sqrtMinPrice,
      sqrtMaxPrice: configState.sqrtMaxPrice,
      tokenAInfo: baseTokenInfo,
    });

    const positionNft = Keypair.generate();

    const initPoolTx = await cpAmm.createPool({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      config: configPk,
      positionNft: positionNft.publicKey,
      tokenAMint: baseMintPk,
      tokenBMint: quoteMintPk,
      tokenAAmount,
      tokenBAmount,
      liquidityDelta,
      initSqrtPrice,
      activationPoint: activationPoint != null ? new BN(activationPoint) : null,
      tokenAProgram: baseTokenProgram,
      tokenBProgram: quoteTokenProgram,
      isLockLiquidity: lockLiquidity,
    });

    // Derive addresses for logging
    const pool = derivePoolAddress(configPk, baseMintPk, quoteMintPk);
    const position = derivePositionAddress(positionNft.publicKey);

    const computeLimit = opts?.computeUnitLimit ?? 400_000;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...initPoolTx.instructions,
    ];

    console.log(`  pool:      ${pool.toBase58()}`);
    console.log(`  position:  ${position.toBase58()}`);
    console.log(`  config:    ${configAddress}`);
    console.log(`  price:     ${getPriceFromSqrtPrice(initSqrtPrice, baseDecimals, quoteDecimalCount)}`);

    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
      extraSigners: [positionNft],
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      poolAddress: pool.toBase58(),
      positionAddress: position.toBase58(),
      dex: this.name,
    };
  }

  // ----- LP: listPositions -----

  /**
   * List all DAMM v2 positions owned by the user on a specific pool.
   *
   * Uses `getPositionsByUser()` to discover positions on-chain, then
   * calculates unclaimed fees for each position.
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/pool.ts
   *   fetchPositionsByUser()
   */
  async listPositions(poolAddress: string): Promise<LpPositionInfo[]> {
    const connection = getConnection();
    const wallet = getWallet();

    const cpAmm = new CpAmm(connection);
    const userPositions = await cpAmm.getPositionsByUser(wallet.publicKey);

    // Filter to positions belonging to this pool
    const poolPositions = userPositions.filter(
      (p) => p.positionState.pool.toBase58() === poolAddress,
    );

    if (poolPositions.length === 0) {
      return [];
    }

    const poolPk = new PublicKey(poolAddress);
    const poolState = await cpAmm.fetchPoolState(poolPk);

    // Fetch decimals for both tokens
    const tokenAMint = poolState.tokenAMint;
    const tokenBMint = poolState.tokenBMint;
    const tokenAProgram = sdkGetTokenProgram(poolState.tokenAFlag);
    const tokenBProgram = sdkGetTokenProgram(poolState.tokenBFlag);

    const [tokenAMintInfo, tokenBMintInfo] = await Promise.all([
      connection.getAccountInfo(tokenAMint),
      connection.getAccountInfo(tokenBMint),
    ]);

    const mintA = unpackMint(tokenAMint, tokenAMintInfo!, tokenAMintInfo!.owner);
    const mintB = unpackMint(tokenBMint, tokenBMintInfo!, tokenBMintInfo!.owner);
    const decimalsA = mintA.decimals;
    const decimalsB = mintB.decimals;

    const results: LpPositionInfo[] = [];

    for (const pos of poolPositions) {
      const positionState = await cpAmm.fetchPositionState(pos.position);

      // Calculate unclaimed fees (same math as claimFees)
      const totalPositionLiquidity = positionState.unlockedLiquidity
        .add(positionState.vestedLiquidity)
        .add(positionState.permanentLockedLiquidity);

      const feeAPerTokenStored = new BN(
        Buffer.from(poolState.feeAPerLiquidity).reverse(),
      ).sub(new BN(Buffer.from(positionState.feeAPerTokenCheckpoint).reverse()));

      const feeBPerTokenStored = new BN(
        Buffer.from(poolState.feeBPerLiquidity).reverse(),
      ).sub(new BN(Buffer.from(positionState.feeBPerTokenCheckpoint).reverse()));

      const feeA = positionState.feeAPending.add(
        totalPositionLiquidity.mul(feeAPerTokenStored).shrn(LIQUIDITY_SCALE),
      );
      const feeB = positionState.feeBPending.add(
        totalPositionLiquidity.mul(feeBPerTokenStored).shrn(LIQUIDITY_SCALE),
      );

      const feeAHuman = Number(feeA.toString()) / Math.pow(10, decimalsA);
      const feeBHuman = Number(feeB.toString()) / Math.pow(10, decimalsB);

      // DAMM v2 uses full-range positions — lowerBinId/upperBinId not applicable
      // but we report liquidity amounts via the vault balances proportionally
      const hasLiquidity = !totalPositionLiquidity.isZero();

      results.push({
        positionAddress: pos.position.toBase58(),
        poolAddress,
        dex: this.name,
        lowerBinId: 0, // full-range — not applicable
        upperBinId: 0, // full-range — not applicable
        amountX: 0, // per-position token amounts not directly available from state
        amountY: 0,
        tokenXMint: tokenAMint.toBase58(),
        tokenYMint: tokenBMint.toBase58(),
        feeX: feeAHuman,
        feeY: feeBHuman,
        inRange: hasLiquidity,
      });
    }

    return results;
  }

  // ----- Internal helpers -----

  private async resolvePool(baseMint: string, quoteMint: string): Promise<PublicKey> {
    const pool = await this.findPool(baseMint, quoteMint);
    if (!pool) {
      throw new PoolNotFoundError(this.name, baseMint, quoteMint);
    }
    return new PublicKey(pool.address);
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new MeteoraDammV2Adapter());
