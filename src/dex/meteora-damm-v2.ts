/**
 * Meteora DAMM v2 (CP AMM) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/cp-amm-sdk (CpAmm) for buy/sell/snipe/findPool/getPrice.
 * This is the most complex Meteora module — supports Token-2022, pool creation,
 * position management, and fee claiming in source. The adapter focuses on
 * swap operations as defined by IDexAdapter.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-damm-v2/
 *
 * SDK pattern:
 *   const cpAmm = new CpAmm(connection);
 *   const poolState = await cpAmm.fetchPoolState(poolAddress);
 *   const swapTx = await cpAmm.swap({ payer, pool, inputTokenMint, ... });
 */

import BN from "bn.js";
import Decimal from "decimal.js";
import {
  PublicKey,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { CpAmm, SwapParams } from "@meteora-ag/cp-amm-sdk";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { MathUtil } from "@raydium-io/raydium-sdk-v2";

import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";

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

    // Calculate minimumAmountOut with slippage protection
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    // Estimate output from vault balances (simple constant-product approximation)
    const [balA, balB] = await Promise.all([
      connection.getTokenAccountBalance(poolState.tokenAVault),
      connection.getTokenAccountBalance(poolState.tokenBVault),
    ]);
    const isInputA = quoteMintPk.equals(poolState.tokenAMint);
    const reserveIn = new BN(isInputA ? balA.value.amount : balB.value.amount);
    const reserveOut = new BN(isInputA ? balB.value.amount : balA.value.amount);
    let estimatedOut = new BN(0);
    if (!reserveIn.isZero() && !reserveOut.isZero()) {
      estimatedOut = inputAmount.mul(reserveOut).div(reserveIn.add(inputAmount));
    }
    const minimumAmountOut = estimatedOut.muln(10000 - slippageBps).divn(10000);

    const swapParams: SwapParams = {
      payer: wallet.publicKey,
      pool: poolPk,
      inputTokenMint: quoteMintPk,
      outputTokenMint: baseMintPk,
      amountIn: inputAmount,
      minimumAmountOut,
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

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "buy",
      tipSol: opts?.tipSol,
      addressLookupTables: opts?.addressLookupTables,
    });

    const accepted = results.find((r) => r.accepted);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
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

    const blockhash = await connection.getLatestBlockhash();
    const results = await landTransaction(ixs, wallet, blockhash, {
      dex: this.name,
      operation: "sell",
      tipSol: opts?.tipSol,
      addressLookupTables: opts?.addressLookupTables,
    });

    const accepted = results.find((r) => r.accepted);
    // Get actual token decimals for human-readable amount
    const baseMintInfo = await connection.getAccountInfo(baseMintPk);
    const baseTokenProgramId = baseMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    let tokenDecimals = 9; // default
    try {
      const mintData = await connection.getTokenSupply(baseMintPk);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 9 */ }
    const humanAmount = Number(sellAmount.toString()) / Math.pow(10, tokenDecimals);
    return {
      txSignature: accepted?.signature ?? "",
      confirmed: !!accepted?.accepted,
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
