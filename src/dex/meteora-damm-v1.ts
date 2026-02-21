/**
 * Meteora DAMM v1 (Dynamic AMM) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/dynamic-amm-sdk (AmmImpl) for buy/snipe/findPool/getPrice.
 * No sell in source module — sell throws UnsupportedOperationError.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-damm-v1/
 *
 * SDK pattern:
 *   const amm = await AmmImpl.create(connection, poolAddress);
 *   const quote = amm.getSwapQuote(inputMint, inputAmount, slippagePct);
 *   const swapTx = await amm.swap(user, inputMint, inputAmount, minOut);
 */

import BN from "bn.js";
import Decimal from "decimal.js";
import {
  PublicKey,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import AmmImpl from "@meteora-ag/dynamic-amm-sdk";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

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
  "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB", // USD1
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine the number of decimals for a quote mint.
 * Returns 6 for known stablecoins, 9 for SOL/unknown.
 */
function quoteDecimals(quoteMintStr: string): number {
  return SIX_DECIMAL_MINTS.has(quoteMintStr) ? 6 : 9;
}

/**
 * Convert human-readable amount to lamports BN for the given quote mint.
 */
function amountToLamports(amount: number, quoteMintStr: string): BN {
  const decimals = quoteDecimals(quoteMintStr);
  return new BN(Math.floor(amount * Math.pow(10, decimals)));
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MeteoraDammV1Adapter implements IDexAdapter {
  readonly name = "meteora-damm-v1";
  readonly protocol = "damm-v1";
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

    // Resolve pool
    const poolPk = poolAddress
      ? new PublicKey(poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

    const ammInstance = await AmmImpl.create(connection, poolPk);
    const quoteMintPk = new PublicKey(quoteMintStr);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    // Quote with slippage
    const slippagePct = (opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS) / 100; // SDK takes pct (1 = 1%)
    const swapQuote = ammInstance.getSwapQuote(quoteMintPk, inputAmount, slippagePct);

    // Build swap IX
    const swapTx = await ammInstance.swap(
      wallet.publicKey,
      quoteMintPk,
      inputAmount,
      swapQuote.minSwapOutAmount,
    );

    // Compute budget IXs
    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...swapTx.instructions,
    ];

    // Submit via RPC send+confirm
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

    // Resolve pool
    const poolPk = poolAddress
      ? new PublicKey(poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

    const ammInstance = await AmmImpl.create(connection, poolPk);
    const baseMintPk = new PublicKey(tokenMint);

    // Detect base token program
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

    // Quote with slippage — pass baseMintPk as input (selling base token)
    const slippagePct = (opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS) / 100;
    const swapQuote = ammInstance.getSwapQuote(baseMintPk, sellAmount, slippagePct);

    // Build swap IX — reversed direction (base → quote)
    const swapTx = await ammInstance.swap(
      wallet.publicKey,
      baseMintPk,
      sellAmount,
      swapQuote.minSwapOutAmount,
    );

    // Compute budget IXs
    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...swapTx.instructions,
    ];

    // Submit via RPC send+confirm
    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    // Human-readable sell amount
    let tokenDecimals = 9;
    try {
      const mintData = await connection.getTokenSupply(baseMintPk);
      tokenDecimals = mintData.value.decimals;
    } catch { /* fallback to 9 */ }
    const humanAmount = Number(sellAmount.toString()) / Math.pow(10, tokenDecimals);

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
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
    const quoteMintPk = new PublicKey(quoteMintStr);
    const inputAmount = amountToLamports(amountSol, quoteMintStr);

    const ammInstance = await AmmImpl.create(connection, poolPk);

    // Snipe uses unlimited slippage (minOut = 0) for maximum fill
    const swapTx = await ammInstance.swap(
      wallet.publicKey,
      quoteMintPk,
      inputAmount,
      new BN(0),
    );

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 20_000_000; // high priority for snipe

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...swapTx.instructions,
    ];

    // Use concurrent landing (orchestrator handles nonce prepending)
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

  // ----- buildSwapIxs (for orchestrator / nonce integration) -----

  async buildSwapIxs(params: BuyParams | SellParams): Promise<BuildSwapIxsResult> {
    if ("percentage" in params) {
      throw new UnsupportedOperationError(this.name, "buildSwapIxs(sell)");
    }

    const buyParams = params as BuyParams;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = buyParams.quoteMint ?? WSOL_MINT;
    const quoteMintPk = new PublicKey(quoteMintStr);

    const poolPk = buyParams.poolAddress
      ? new PublicKey(buyParams.poolAddress)
      : await this.resolvePool(buyParams.tokenMint, quoteMintStr);

    const ammInstance = await AmmImpl.create(connection, poolPk);
    const inputAmount = amountToLamports(buyParams.amountSol, quoteMintStr);

    // Build swap with 0 minOut (orchestrator can adjust)
    const swapTx = await ammInstance.swap(
      wallet.publicKey,
      quoteMintPk,
      inputAmount,
      new BN(0),
    );

    return {
      instructions: swapTx.instructions,
      signers: [],
    };
  }

  // ----- findPool -----

  async findPool(baseMint: string, quoteMint?: string): Promise<PoolInfo | null> {
    const connection = getConnection();
    const baseMintPk = new PublicKey(baseMint);
    const quoteMintPk = new PublicKey(quoteMint ?? WSOL_MINT);

    // DAMM v1 uses AmmImpl — try to derive customizable pool first
    // The SDK's create() will throw if the pool doesn't exist
    const poolAddress = this.deriveCustomizablePoolAddress(baseMintPk, quoteMintPk);
    try {
      const ammInstance = await AmmImpl.create(connection, poolAddress);
      const poolInfo = ammInstance.poolInfo;

      return {
        address: poolAddress.toBase58(),
        dex: this.name,
        protocol: this.protocol,
        baseMint,
        quoteMint: quoteMint ?? WSOL_MINT,
        baseDecimals: ammInstance.tokenAMint.decimals,
        quoteDecimals: ammInstance.tokenBMint.decimals,
      };
    } catch {
      // Pool not found at derived address
      return null;
    }
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);

    const ammInstance = await AmmImpl.create(connection, poolPk);
    const poolInfo = ammInstance.poolInfo;

    const tokenAAmount = new Decimal(poolInfo.tokenAAmount.toString()).div(
      Math.pow(10, ammInstance.tokenAMint.decimals),
    );
    const tokenBAmount = new Decimal(poolInfo.tokenBAmount.toString()).div(
      Math.pow(10, ammInstance.tokenBMint.decimals),
    );

    let price: number;
    if (tokenAAmount.isZero()) {
      price = 0;
    } else {
      const rawPrice = tokenBAmount.div(tokenAAmount);
      // Source normalizes: if price > 1, invert it (base token price in quote)
      price = Number(rawPrice) > 1 ? 1 / Number(rawPrice) : Number(rawPrice);
    }

    return {
      price,
      baseMint: ammInstance.tokenAMint.address.toBase58(),
      quoteMint: ammInstance.tokenBMint.address.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ----- Internal helpers -----

  /**
   * Resolve pool address — if not provided, discover via findPool().
   * Throws PoolNotFoundError if no pool found.
   */
  private async resolvePool(baseMint: string, quoteMint: string): Promise<PublicKey> {
    const pool = await this.findPool(baseMint, quoteMint);
    if (!pool) {
      throw new PoolNotFoundError(this.name, baseMint, quoteMint);
    }
    return new PublicKey(pool.address);
  }

  /**
   * Derive customizable pool address using PDA seeds.
   * Seeds: ["cpool", max(mintA, mintB), min(mintA, mintB)]
   */
  private deriveCustomizablePoolAddress(mintA: PublicKey, mintB: PublicKey): PublicKey {
    const DAMM_PROGRAM_ID = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");
    const buf1 = mintA.toBuffer();
    const buf2 = mintB.toBuffer();
    const first = Buffer.compare(buf1, buf2) === 1 ? buf1 : buf2;
    const second = Buffer.compare(buf1, buf2) === 1 ? buf2 : buf1;

    return PublicKey.findProgramAddressSync(
      [Buffer.from("cpool"), first, second],
      DAMM_PROGRAM_ID,
    )[0];
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new MeteoraDammV1Adapter());
