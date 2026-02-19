/**
 * Meteora DLMM (Dynamic Liquidity Market Maker) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/dlmm SDK for buy/snipe/findPool/getPrice.
 * Sell is empty in source module — throws UnsupportedOperationError.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-dlmm/
 *
 * IMPORTANT BUG FIX: Source code hardcodes `swapYtoX = true` which only works
 * when the user is buying (spending Y/quote to get X/base). This adapter
 * dynamically computes the swap direction based on which token is the quote.
 *
 * SDK pattern:
 *   const dlmmPool = await DLMM.create(connection, poolAddress);
 *   const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
 *   const quote = await dlmmPool.swapQuote(amount, swapYtoX, slippage, binArrays);
 *   const swapTx = await dlmmPool.swap({ inToken, outToken, ... });
 */

import BN from "bn.js";
import DLMM from "@meteora-ag/dlmm";
import {
  PublicKey,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";

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

/** Known stablecoin mints with 6 decimals */
const SIX_DECIMAL_MINTS = new Set([
  USDC_MINT,
  USDT_MINT,
  "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
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

/**
 * Determine swap direction for DLMM pool.
 *
 * DLMM pools have tokenX and tokenY. swapYtoX=true means spending Y to get X.
 * For a buy (spending quote to get base):
 *   - If quote == tokenY → swapYtoX = true  (spend Y, get X)
 *   - If quote == tokenX → swapYtoX = false (spend X, get Y)
 *
 * The source code HARDCODES swapYtoX=true which is WRONG when the quote
 * token is tokenX. This adapter fixes that bug.
 */
function determineSwapDirection(
  quoteMintStr: string,
  tokenX: PublicKey,
  tokenY: PublicKey,
): { swapYtoX: boolean; inToken: PublicKey; outToken: PublicKey } {
  const quotePk = new PublicKey(quoteMintStr);

  if (quotePk.equals(tokenY)) {
    // Quote is tokenY → spend Y, get X
    return { swapYtoX: true, inToken: tokenY, outToken: tokenX };
  } else if (quotePk.equals(tokenX)) {
    // Quote is tokenX → spend X, get Y
    return { swapYtoX: false, inToken: tokenX, outToken: tokenY };
  } else {
    // Fallback: assume tokenY is quote (matches most SOL-paired pools)
    return { swapYtoX: true, inToken: tokenY, outToken: tokenX };
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MeteoraDlmmAdapter implements IDexAdapter {
  readonly name = "meteora-dlmm";
  readonly protocol = "dlmm";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSnipe: true,
    canFindPool: false, // DLMM has no simple PDA derivation
    canGetPrice: true,
    // canSell: false — source sell.ts is empty
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

    const dlmmPool = await DLMM.create(connection, poolPk);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    // Dynamically determine swap direction (fixes source bug)
    const { swapYtoX, inToken, outToken } = determineSwapDirection(
      quoteMintStr,
      dlmmPool.tokenX.publicKey,
      dlmmPool.tokenY.publicKey,
    );

    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    const swapQuote = await dlmmPool.swapQuote(
      inputAmount,
      swapYtoX,
      new BN(slippageBps),
      binArrays,
    );

    const swapTx = await dlmmPool.swap({
      inToken,
      binArraysPubkey: swapQuote.binArraysPubkey,
      inAmount: inputAmount,
      lbPair: dlmmPool.pubkey,
      user: wallet.publicKey,
      minOutAmount: swapQuote.minOutAmount ?? new BN(0),
      outToken,
    });

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

  // ----- Core: sell (not supported — source sell.ts is empty) -----

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ----- Snipe -----

  async snipe(params: SnipeParams): Promise<SwapResult> {
    const { tokenMint, amountSol, poolAddress, quoteMint: quoteMintParam, tipSol, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;
    const poolPk = new PublicKey(poolAddress);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    const dlmmPool = await DLMM.create(connection, poolPk);

    // Dynamically determine swap direction (fixes source bug)
    const { swapYtoX, inToken, outToken } = determineSwapDirection(
      quoteMintStr,
      dlmmPool.tokenX.publicKey,
      dlmmPool.tokenY.publicKey,
    );

    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
    const swapQuote = await dlmmPool.swapQuote(
      inputAmount,
      swapYtoX,
      new BN(15 * 100), // 15% slippage for snipe (matches source)
      binArrays,
    );

    const swapTx = await dlmmPool.swap({
      inToken,
      binArraysPubkey: swapQuote.binArraysPubkey,
      inAmount: inputAmount,
      lbPair: dlmmPool.pubkey,
      user: wallet.publicKey,
      minOutAmount: new BN(0), // unlimited slippage for snipe
      outToken,
    });

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 40_000_000;

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
    if ("percentage" in params) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }

    const buyParams = params as BuyParams;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = buyParams.quoteMint ?? WSOL_MINT;

    const poolPk = buyParams.poolAddress
      ? new PublicKey(buyParams.poolAddress)
      : await this.resolvePool(buyParams.tokenMint, quoteMintStr);

    const dlmmPool = await DLMM.create(connection, poolPk);
    const inputAmount = amountToLamports(buyParams.amountSol, quoteMintStr);

    const { swapYtoX, inToken, outToken } = determineSwapDirection(
      quoteMintStr,
      dlmmPool.tokenX.publicKey,
      dlmmPool.tokenY.publicKey,
    );

    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
    const swapQuote = await dlmmPool.swapQuote(
      inputAmount,
      swapYtoX,
      new BN(15 * 100),
      binArrays,
    );

    const swapTx = await dlmmPool.swap({
      inToken,
      binArraysPubkey: swapQuote.binArraysPubkey,
      inAmount: inputAmount,
      lbPair: dlmmPool.pubkey,
      user: wallet.publicKey,
      minOutAmount: new BN(0),
      outToken,
    });

    return {
      instructions: swapTx.instructions,
      signers: [],
    };
  }

  // ----- findPool -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const poolPk = new PublicKey(baseMint); // For DLMM, baseMint is often used to search
    const quoteMintStr = quoteMint ?? WSOL_MINT;

    // DLMM doesn't have a simple PDA derivation like DAMM.
    // The SDK's DLMM.create() requires a known pool address.
    // For pool discovery, we'd need to use the DLMM program's getLbPairs() which
    // requires anchor setup. Return null — callers should provide poolAddress.
    return null;
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);
    const { binId, price: rawPrice } = await dlmmPool.getActiveBin();

    const tokenXDecimals = Number(dlmmPool.tokenX.mint.decimals);
    const tokenYDecimals = Number(dlmmPool.tokenY.mint.decimals);
    const priceFactor = Math.pow(10, tokenYDecimals - tokenXDecimals);
    const adjustedPrice = Number(rawPrice) / priceFactor;

    // Source normalizes: if price > 1, invert
    const price = adjustedPrice > 1 ? 1 / adjustedPrice : adjustedPrice;

    return {
      price,
      baseMint: dlmmPool.tokenX.publicKey.toBase58(),
      quoteMint: dlmmPool.tokenY.publicKey.toBase58(),
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

registerAdapter(new MeteoraDlmmAdapter());
