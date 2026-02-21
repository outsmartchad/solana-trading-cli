/**
 * Meteora DBC (Dynamic Bonding Curve) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/dynamic-bonding-curve-sdk for buy/sell/snipe/findPool/getPrice.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-dbc/
 *
 * Key behavior:
 * - DBC SDK's swap2() returns a Transaction with setup instructions
 *   (SystemProgram, token program IXs) that need to be filtered out since
 *   the adapter handles WSOL wrapping/unwrapping explicitly.
 * - For WSOL quotes: creates ATA, transfers SOL, syncNative, swaps, closes ATA
 * - For non-SOL quotes: simpler ATA creation + swap
 * - Token-2022 detection for base mints
 *
 * SDK pattern:
 *   const client = new DynamicBondingCurveClient(connection, 'confirmed');
 *   const poolState = await client.state.getPool(pool);
 *   const tx = await client.pool.swap2(swapParams);
 */

import BN from "bn.js";
import Decimal from "decimal.js";
import {
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  Swap2Params,
  SwapMode,
  getCurrentPoint,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAccount,
} from "@solana/spl-token";

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
  requireTokenMint,
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

/** Detect token program from on-chain account owner */
async function detectTokenProgram(mint: PublicKey): Promise<PublicKey> {
  const connection = getConnection();
  const accountInfo = await connection.getAccountInfo(mint);
  if (!accountInfo) {
    throw new Error(`Mint account not found: ${mint.toBase58()}`);
  }
  return accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

/**
 * Filter out SystemProgram and Token Program instructions from DBC SDK tx.
 * The SDK adds setup IXs that conflict with our explicit WSOL handling.
 */
function filterSdkSetupIxs(ixs: TransactionInstruction[]): TransactionInstruction[] {
  return ixs.filter((ix) => {
    const pid = ix.programId.toBase58();
    return (
      pid !== SystemProgram.programId.toBase58() &&
      pid !== TOKEN_PROGRAM_ID.toBase58() &&
      pid !== TOKEN_2022_PROGRAM_ID.toBase58()
    );
  });
}

/** Calculate price from sqrtPrice (from DBC pool state) */
function getPriceFromSqrtPrice(
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number,
): number {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128));
  return Number(price);
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MeteoraDbcAdapter implements IDexAdapter {
  readonly name = "meteora-dbc";
  readonly protocol = "dbc";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canBuy: true,
    canSell: true,
    canSnipe: true,
    canFindPool: false,
    canGetPrice: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new PoolNotFoundError(this.name, tokenMint, quoteMintStr);
    }
    const poolPk = new PublicKey(poolAddress);

    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");
    const amountIn = amountToLamports(amountSol, quoteMintStr);

    const swap2Params: Swap2Params = {
      swapMode: SwapMode.ExactIn,
      swapBaseForQuote: false,
      amountIn,
      minimumAmountOut: new BN(0),
      owner: wallet.publicKey,
      pool: poolPk,
      referralTokenAccount: null,
      payer: wallet.publicKey,
    };

    const tx = await dbcClient.pool.swap2(swap2Params);
    const filteredIxs = filterSdkSetupIxs(tx.instructions);

    // Build WSOL wrapping or direct swap instructions
    const ixs = await this.buildBuyIxs(
      wallet.publicKey,
      new PublicKey(tokenMint),
      new PublicKey(quoteMintStr),
      amountIn,
      filteredIxs,
      opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT,
      opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
    );

    const result = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    return {
      txSignature: result.txSignature,
      confirmed: result.confirmed,
      amountIn: amountSol,
      amountInToken: quoteMintStr,
      dex: this.name,
      poolAddress,
    };
  }

  // ----- Core: sell -----

  async sell(params: SellParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { percentage, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    if (!poolAddress) {
      throw new PoolNotFoundError(this.name, tokenMint, quoteMintStr);
    }
    const poolPk = new PublicKey(poolAddress);
    const baseMintPk = new PublicKey(tokenMint);

    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");

    // Get token balance
    const baseTokenProgram = await detectTokenProgram(baseMintPk);
    const ata = await getAssociatedTokenAddress(baseMintPk, wallet.publicKey, false, baseTokenProgram);
    const tokenAccount = await getAccount(connection, ata, "confirmed", baseTokenProgram);
    const sellAmount = new BN(
      Math.floor((Number(tokenAccount.amount) * percentage) / 100).toString(),
    );

    if (sellAmount.isZero()) throw new Error(`No balance to sell for ${tokenMint}`);

    const tx = await dbcClient.pool.swap2({
      swapMode: SwapMode.ExactIn,
      swapBaseForQuote: true,
      amountIn: sellAmount,
      minimumAmountOut: new BN(0),
      owner: wallet.publicKey,
      pool: poolPk,
      referralTokenAccount: null,
      payer: wallet.publicKey,
    });

    const filteredIxs = filterSdkSetupIxs(tx.instructions);
    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS;

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      ...filteredIxs,
    ];

    const rpcResult = await sendAndConfirmVtx(connection, ixs, wallet, {
      addressLookupTables: opts?.addressLookupTables,
    });

    // Convert raw amount to human-readable using actual token decimals
    let tokenDecimals = 9;
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
      poolAddress,
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
    const amountIn = amountToLamports(amountSol, quoteMintStr);

    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");
    const poolState = await dbcClient.state.getPool(poolPk);
    if (!poolState) throw new Error(`Pool not found: ${poolAddress}`);

    const swap2Params: Swap2Params = {
      swapMode: SwapMode.ExactIn,
      swapBaseForQuote: false,
      amountIn,
      minimumAmountOut: new BN(0), // unlimited slippage for snipe
      owner: wallet.publicKey,
      pool: poolPk,
      referralTokenAccount: null,
      payer: wallet.publicKey,
    };

    const tx = await dbcClient.pool.swap2(swap2Params);
    const filteredIxs = filterSdkSetupIxs(tx.instructions);

    const computeLimit = opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT;
    const priorityFee = opts?.priorityFeeMicroLamports ?? 40_000_000;

    // Build snipe IXs with WSOL wrapping
    const ixs = await this.buildBuyIxs(
      wallet.publicKey,
      baseMintPk,
      quoteMintPk,
      amountIn,
      filteredIxs,
      computeLimit,
      priorityFee,
    );

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
    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");

    if ("percentage" in params) {
      // Sell
      const p = params as SellParams;
      const tokenMint = requireTokenMint(p, this.name);
      if (!p.poolAddress) throw new Error("poolAddress required for DBC buildSwapIxs");
      const poolPk = new PublicKey(p.poolAddress);
      const baseMintPk = new PublicKey(tokenMint);
      const baseTokenProgram = await detectTokenProgram(baseMintPk);
      const ata = await getAssociatedTokenAddress(baseMintPk, wallet.publicKey, false, baseTokenProgram);
      const tokenAccount = await getAccount(connection, ata, "confirmed", baseTokenProgram);
      const sellAmount = new BN(
        Math.floor((Number(tokenAccount.amount) * p.percentage) / 100).toString(),
      );

      const tx = await dbcClient.pool.swap2({
        swapMode: SwapMode.ExactIn,
        swapBaseForQuote: true,
        amountIn: sellAmount,
        minimumAmountOut: new BN(0),
        owner: wallet.publicKey,
        pool: poolPk,
        referralTokenAccount: null,
        payer: wallet.publicKey,
      });

      return { instructions: filterSdkSetupIxs(tx.instructions), signers: [] };
    }

    // Buy
    const p = params as BuyParams;
    if (!p.poolAddress) throw new Error("poolAddress required for DBC buildSwapIxs");
    const poolPk = new PublicKey(p.poolAddress);
    const quoteMintStr = p.quoteMint ?? WSOL_MINT;
    const amountIn = amountToLamports(p.amountSol, quoteMintStr);

    const tx = await dbcClient.pool.swap2({
      swapMode: SwapMode.ExactIn,
      swapBaseForQuote: false,
      amountIn,
      minimumAmountOut: new BN(0),
      owner: wallet.publicKey,
      pool: poolPk,
      referralTokenAccount: null,
      payer: wallet.publicKey,
    });

    return { instructions: filterSdkSetupIxs(tx.instructions), signers: [] };
  }

  // ----- findPool (DBC pools must be provided) -----

  async findPool(_baseMint: string, _quoteMint?: string): Promise<PoolInfo | null> {
    // DBC pool discovery requires iterating all pools on-chain.
    // Callers should provide poolAddress directly (from gRPC stream, etc.).
    return null;
  }

  // ----- getPrice -----

  async getPrice(poolAddress: string): Promise<PriceInfo> {
    const connection = getConnection();
    const poolPk = new PublicKey(poolAddress);

    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed");
    const poolState = await dbcClient.state.getPool(poolPk);
    if (!poolState) throw new Error(`Pool not found: ${poolAddress}`);

    // Fetch pool config to get quoteMint (quoteMint lives on PoolConfig, not VirtualPool)
    const poolConfigState = await dbcClient.state.getPoolConfig(poolState.config);
    if (!poolConfigState) throw new Error(`Pool config not found: ${poolState.config.toString()}`);

    // Fetch actual mint decimals for accurate price calculation
    const [baseMintBal, quoteMintBal] = await Promise.all([
      connection.getTokenSupply(poolState.baseMint),
      connection.getTokenSupply(poolConfigState.quoteMint),
    ]);
    const tokenADecimal = baseMintBal.value.decimals;
    const tokenBDecimal = quoteMintBal.value.decimals;
    const price = getPriceFromSqrtPrice(poolState.sqrtPrice, tokenADecimal, tokenBDecimal);

    return {
      price,
      baseMint: poolState.baseMint.toBase58(),
      quoteMint: poolConfigState.quoteMint.toBase58(),
      source: "on-chain",
      poolAddress,
      timestamp: Date.now(),
    };
  }

  // ----- Internal helpers -----

  /**
   * Build buy instructions with WSOL wrapping if needed.
   * Ported from source: meteora-dbc/buy.ts snipe_dbc_with_known_pool()
   */
  private async buildBuyIxs(
    payer: PublicKey,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    amountIn: BN,
    swapIxs: TransactionInstruction[],
    computeLimit: number,
    priorityFee: number,
  ): Promise<TransactionInstruction[]> {
    const baseTokenProgram = await detectTokenProgram(baseMint);
    const quoteTokenProgram = quoteMint.toBase58() === WSOL_MINT ? TOKEN_PROGRAM_ID : await detectTokenProgram(quoteMint);

    const inputAta = await getAssociatedTokenAddress(quoteMint, payer, false, quoteTokenProgram);
    const outputAta = await getAssociatedTokenAddress(baseMint, payer, false, baseTokenProgram);

    const createInputAta = createAssociatedTokenAccountIdempotentInstruction(
      payer, inputAta, payer, quoteMint, quoteTokenProgram,
    );
    const createOutputAta = createAssociatedTokenAccountIdempotentInstruction(
      payer, outputAta, payer, baseMint, baseTokenProgram,
    );

    const isWsolQuote = quoteMint.toBase58() === WSOL_MINT;

    if (isWsolQuote) {
      const transferIx = SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: inputAta,
        lamports: amountIn.toNumber(),
      });
      const syncIx = createSyncNativeInstruction(inputAta, TOKEN_PROGRAM_ID);
      const closeIx = createCloseAccountInstruction(
        inputAta, payer, payer, [], TOKEN_PROGRAM_ID,
      );

      return [
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
        createInputAta,
        createOutputAta,
        transferIx,
        syncIx,
        ...swapIxs,
        closeIx,
      ];
    }

    // Non-WSOL quote: just create ATAs and swap
    return [
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
      createInputAta,
      createOutputAta,
      ...swapIxs,
    ];
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new MeteoraDbcAdapter());
