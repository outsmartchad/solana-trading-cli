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
  LIQUIDITY_SCALE,
  getTokenProgram as sdkGetTokenProgram,
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
   * This method creates a new position NFT and deposits both tokens.
   *
   * Params:
   *   - poolAddress: the pool to add liquidity to
   *   - amountA: amount of token A in human-readable units
   *   - amountB: (optional) amount of token B in human-readable units.
   *             If omitted, auto-calculates proportional to current pool ratio.
   *
   * Ported from: 100x-algo-bots/trading-modules/meteora-damm-v2/create.ts
   *   cpAmm.createPositionAndAddLiquidity({ ... })
   */
  async addLiquidity(params: AddLiquidityParams): Promise<TxResult> {
    // DAMM v2 uses legacy amountA/amountB fields (or amountSol as fallback for amountA)
    const { poolAddress, opts } = params;
    const amountA = params.amountA ?? params.amountSol;
    const amountB = params.amountB ?? params.amountToken;
    if (amountA === undefined || amountA === 0) {
      throw new Error("amountA (or --amount-sol) is required for DAMM v2 addLiquidity");
    }
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const cpAmm = new CpAmm(connection);
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

    // Convert human amounts to lamports
    const tokenAAmount = new BN(
      new Decimal(amountA).mul(Decimal.pow(10, decimalsA)).floor().toFixed(),
    );

    let tokenBAmount: BN;
    if (amountB !== undefined) {
      tokenBAmount = new BN(
        new Decimal(amountB).mul(Decimal.pow(10, decimalsB)).floor().toFixed(),
      );
    } else {
      // Auto-calculate proportional amount from pool reserves
      const [balA, balB] = await Promise.all([
        connection.getTokenAccountBalance(poolState.tokenAVault),
        connection.getTokenAccountBalance(poolState.tokenBVault),
      ]);
      const reserveA = new BN(balA.value.amount);
      const reserveB = new BN(balB.value.amount);
      if (reserveA.isZero()) {
        throw new Error("Pool has zero token A reserves; provide amountB explicitly");
      }
      // tokenBAmount = tokenAAmount * reserveB / reserveA
      tokenBAmount = tokenAAmount.mul(reserveB).div(reserveA);
    }

    // Calculate liquidityDelta using the pool's current sqrt price
    const sqrtPrice = calculateInitSqrtPrice(
      tokenAAmount,
      tokenBAmount,
      poolState.sqrtMinPrice,
      poolState.sqrtMaxPrice,
    );

    const liquidityDelta = cpAmm.getLiquidityDelta({
      maxAmountTokenA: tokenAAmount,
      maxAmountTokenB: tokenBAmount,
      sqrtPrice,
      sqrtMinPrice: MIN_SQRT_PRICE,
      sqrtMaxPrice: MAX_SQRT_PRICE,
      tokenAInfo,
      tokenBInfo,
    });

    // Generate a new position NFT keypair
    const positionNft = Keypair.generate();

    // Slippage thresholds: accept some slippage on deposit
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const tokenAThreshold = tokenAAmount.muln(10000 - slippageBps).divn(10000);
    const tokenBThreshold = tokenBAmount.muln(10000 - slippageBps).divn(10000);

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

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "add-liquidity",
      tipSol: opts?.tipSol,
      addressLookupTables: opts?.addressLookupTables,
      extraSigners: [positionNft],
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
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

        const blockhash = await connection.getLatestBlockhash();
        const results = await landTransaction(ixs, wallet, blockhash, {
          dex: this.name,
          operation: "remove-liquidity",
          tipSol: opts?.tipSol,
          addressLookupTables: opts?.addressLookupTables,
        });

        const accepted = results.find((r) => r.accepted);
        if (accepted?.signature) lastSignature = accepted.signature;
        if (accepted?.accepted) anyConfirmed = true;
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

        const blockhash = await connection.getLatestBlockhash();
        const results = await landTransaction(ixs, wallet, blockhash, {
          dex: this.name,
          operation: "remove-liquidity",
          tipSol: opts?.tipSol,
          addressLookupTables: opts?.addressLookupTables,
        });

        const accepted = results.find((r) => r.accepted);
        if (accepted?.signature) lastSignature = accepted.signature;
        if (accepted?.accepted) anyConfirmed = true;
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

      const blockhash = await connection.getLatestBlockhash();
      const results = await landTransaction(ixs, wallet, blockhash, {
        dex: this.name,
        operation: "claim-fees",
      });

      const accepted = results.find((r) => r.accepted);
      if (accepted?.signature) lastSignature = accepted.signature;
      if (accepted?.accepted) anyConfirmed = true;
    }

    return {
      txSignature: lastSignature,
      confirmed: anyConfirmed,
    };
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
