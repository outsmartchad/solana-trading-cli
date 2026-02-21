/**
 * Meteora DLMM (Dynamic Liquidity Market Maker) — IDexAdapter Implementation
 *
 * Wraps the @meteora-ag/dlmm SDK for buy/sell/snipe/findPool/getPrice
 * plus LP operations: addLiquidity, removeLiquidity, claimFees, listPositions.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-dlmm/
 *
 * IMPORTANT BUG FIX: Source code hardcodes `swapYtoX = true` which only works
 * when the user is buying (spending Y/quote to get X/base). This adapter
 * dynamically computes the swap direction based on which token is the quote.
 *
 * SDK patterns:
 *   // Swaps
 *   const dlmmPool = await DLMM.create(connection, poolAddress);
 *   const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
 *   const quote = await dlmmPool.swapQuote(amount, swapYtoX, slippage, binArrays);
 *   const swapTx = await dlmmPool.swap({ inToken, outToken, ... });
 *
 *   // LP operations
 *   const createTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({...});
 *   const removeTxs = await dlmmPool.removeLiquidity({...});
 *   const claimTxs  = await dlmmPool.claimSwapFee({...});
 */

import BN from "bn.js";
import DLMM, { StrategyType } from "@meteora-ag/dlmm";
import {
  PublicKey,
  Keypair,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

import { getWallet, getConnection } from "../helpers/config";
import { landTransaction } from "../transactions/landing";
import { sendAndConfirmVtx, sendAndConfirmLegacyTx } from "../transactions/send-rpc";

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
  LpPositionInfo,
  LpStrategy,
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

/** Known stablecoin mints with 6 decimals */
const SIX_DECIMAL_MINTS = new Set([
  USDC_MINT,
  USDT_MINT,
  "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
]);

const WSOL_PK = new PublicKey(WSOL_MINT);

/** Default number of bins for LP positions */
const DEFAULT_NUM_BINS = 50;

/** Maximum bins allowed by the DLMM SDK per position */
const MAX_BINS = 70;

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

/**
 * Map our LpStrategy string to the SDK's StrategyType enum.
 * The SDK has: Spot=0, Curve=1, BidAsk=2.
 * One-sided behavior is controlled via the bin range (not a separate enum).
 */
function toSdkStrategy(strategy: LpStrategy): StrategyType {
  switch (strategy) {
    case "spot":
      return StrategyType.Spot;
    case "curve":
      return StrategyType.Curve;
    case "bid-ask":
      return StrategyType.BidAsk;
    default:
      return StrategyType.Spot;
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
    canSell: true,
    canSnipe: true,
    canFindPool: false, // DLMM has no simple PDA derivation
    canGetPrice: true,
    canAddLiquidity: true,
    canRemoveLiquidity: true,
    canClaimFees: true,
    canListPositions: true,
  });

  // ----- Core: buy -----

  async buy(params: BuyParams): Promise<SwapResult> {
    const tokenMint = requireTokenMint(params, this.name);
    const { amountSol, quoteMint: quoteMintParam, poolAddress, opts } = params;
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
      minOutAmount: new BN(0),
      outToken,
    });

    // DLMM SDK already includes ComputeBudget + ATA creation in swapTx.instructions
    const result = await sendAndConfirmVtx(connection, swapTx.instructions, wallet, {
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
    const tokenMint = requireTokenMint(params, this.name);
    const { percentage, quoteMint: quoteMintParam, poolAddress, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = quoteMintParam ?? WSOL_MINT;

    const poolPk = poolAddress
      ? new PublicKey(poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

    const dlmmPool = await DLMM.create(connection, poolPk);
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

    // Determine swap direction using the base token (being sold) as input
    const { swapYtoX, inToken, outToken } = determineSwapDirection(
      tokenMint,
      dlmmPool.tokenX.publicKey,
      dlmmPool.tokenY.publicKey,
    );

    const binArrays = await dlmmPool.getBinArrayForSwap(swapYtoX);
    const slippageBps = opts?.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

    const swapQuote = await dlmmPool.swapQuote(
      sellAmount,
      swapYtoX,
      new BN(slippageBps),
      binArrays,
    );

    const swapTx = await dlmmPool.swap({
      inToken,
      binArraysPubkey: swapQuote.binArraysPubkey,
      inAmount: sellAmount,
      lbPair: dlmmPool.pubkey,
      user: wallet.publicKey,
      minOutAmount: new BN(0),
      outToken,
    });

    // DLMM SDK already includes ComputeBudget + ATA creation in swapTx.instructions
    const rpcResult = await sendAndConfirmVtx(connection, swapTx.instructions, wallet, {
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
    const tokenMint = requireTokenMint(buyParams, this.name);
    const connection = getConnection();
    const wallet = getWallet();
    const quoteMintStr = buyParams.quoteMint ?? WSOL_MINT;

    const poolPk = buyParams.poolAddress
      ? new PublicKey(buyParams.poolAddress)
      : await this.resolvePool(tokenMint, quoteMintStr);

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

  // ----- addLiquidity -----

  /**
   * Add liquidity to a Meteora DLMM pool.
   *
   * Three modes (determined by which amounts are provided):
   *
   * 1. One-sided SOL (amountSol > 0, no amountToken):
   *    Bins below active bin, filled with SOL. Most common use case.
   *
   * 2. One-sided token (amountToken > 0, no amountSol):
   *    Bins above active bin, filled with the non-SOL token.
   *    Useful for DCA-out strategies.
   *
   * 3. Balanced (both amountSol and amountToken > 0):
   *    Bins centered around active bin with both tokens.
   *
   * @returns TxResult with positionAddress for the created position.
   */
  async addLiquidity(params: AddLiquidityParams): Promise<TxResult> {
    const { poolAddress, opts } = params;
    const strategy: LpStrategy = params.strategy ?? "spot";
    const numBins = Math.min(Math.max(params.bins ?? DEFAULT_NUM_BINS, 1), MAX_BINS);

    // Resolve amounts: prefer new fields, fall back to legacy amountA/amountB
    const amountSol = params.amountSol ?? params.amountA ?? 0;
    const amountToken = params.amountToken ?? params.amountB ?? 0;

    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);
    const activeBin = await dlmmPool.getActiveBin();

    // Determine which token is SOL
    const tokenXMint = dlmmPool.tokenX.publicKey;
    const tokenYMint = dlmmPool.tokenY.publicKey;
    const tokenXDecimals = Number(dlmmPool.tokenX.mint.decimals);
    const tokenYDecimals = Number(dlmmPool.tokenY.mint.decimals);

    const xIsSOL = tokenXMint.equals(WSOL_PK);
    const yIsSOL = tokenYMint.equals(WSOL_PK);

    // Calculate amounts in native units
    // SOL goes into whichever side is WSOL; token goes into the other
    let totalXAmount: BN;
    let totalYAmount: BN;

    if (xIsSOL) {
      totalXAmount = new BN(Math.floor(amountSol * 10 ** tokenXDecimals));
      totalYAmount = new BN(Math.floor(amountToken * 10 ** tokenYDecimals));
    } else if (yIsSOL) {
      totalXAmount = new BN(Math.floor(amountToken * 10 ** tokenXDecimals));
      totalYAmount = new BN(Math.floor(amountSol * 10 ** tokenYDecimals));
    } else {
      // Neither side is SOL — unusual, but handle gracefully
      totalXAmount = new BN(Math.floor(amountSol * 10 ** tokenXDecimals));
      totalYAmount = new BN(Math.floor(amountToken * 10 ** tokenYDecimals));
    }

    const isOneSidedSol = amountSol > 0 && amountToken === 0;
    const isOneSidedToken = amountToken > 0 && amountSol === 0;

    let minBinId: number;
    let maxBinId: number;
    let strategyType: StrategyType;

    if (isOneSidedSol) {
      // SOL-only: bins below active bin
      minBinId = activeBin.binId - numBins;
      maxBinId = activeBin.binId;
      strategyType = toSdkStrategy(strategy);
    } else if (isOneSidedToken) {
      // Token-only: bins above active bin
      minBinId = activeBin.binId;
      maxBinId = activeBin.binId + numBins;
      strategyType = toSdkStrategy(strategy);
    } else {
      // Balanced: center around active bin
      const halfBins = Math.floor(numBins / 2);
      minBinId = activeBin.binId - halfBins;
      maxBinId = activeBin.binId + halfBins;
      strategyType = toSdkStrategy(strategy);
    }

    const newPosition = new Keypair();

    // Create position and add liquidity in one call
    const createPositionTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: newPosition.publicKey,
      user: wallet.publicKey,
      totalXAmount,
      totalYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType,
      },
    });

    // Send the SDK's legacy Transaction directly with a fresh blockhash.
    // The SDK call above can take 10-30s, so we must NOT use a stale blockhash.
    try {
      const result = await sendAndConfirmLegacyTx(connection, createPositionTx, wallet, {
        extraSigners: [newPosition],
      });

      return {
        txSignature: result.txSignature,
        confirmed: result.confirmed,
        error: result.error,
        positionAddress: newPosition.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    } catch (error) {
      return {
        txSignature: "",
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
        positionAddress: newPosition.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }
  }

  // ----- removeLiquidity -----

  /**
   * Remove liquidity from a Meteora DLMM pool position.
   *
   * If positionAddress is provided, removes from that specific position.
   * Otherwise, removes from the first position found in the pool.
   *
   * If percentage is 100, also claims fees and closes the position.
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<TxResult> {
    const { poolAddress, percentage, positionAddress } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);

    // Find user's position in this pool
    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);

    if (userPositions.length === 0) {
      return {
        txSignature: "",
        confirmed: false,
        error: `No positions found for user in pool ${poolAddress}`,
        poolAddress,
        dex: this.name,
      };
    }

    // Select position: by address if given, otherwise first found
    let position;
    if (positionAddress) {
      const targetPk = new PublicKey(positionAddress);
      position = userPositions.find((p) => p.publicKey.equals(targetPk));
      if (!position) {
        return {
          txSignature: "",
          confirmed: false,
          error: `Position ${positionAddress} not found in pool ${poolAddress}`,
          poolAddress,
          dex: this.name,
        };
      }
    } else {
      position = userPositions[0];
    }

    // Calculate BPS: 100% = 10000 bps
    const bps = new BN(Math.floor((percentage / 100) * 10000));
    const shouldClaimAndClose = percentage >= 100;

    const removeTxs = await dlmmPool.removeLiquidity({
      position: position.publicKey,
      user: wallet.publicKey,
      fromBinId: position.positionData.lowerBinId,
      toBinId: position.positionData.upperBinId,
      bps,
      shouldClaimAndClose,
    });

    // removeLiquidity returns Transaction | Transaction[], normalize to array
    const txArray = Array.isArray(removeTxs) ? removeTxs : [removeTxs];
    let lastSignature = "";
    try {
      for (const removeTx of txArray) {
        const result = await sendAndConfirmLegacyTx(connection, removeTx, wallet);
        lastSignature = result.txSignature;

        if (!result.confirmed) {
          return {
            txSignature: lastSignature,
            confirmed: false,
            error: result.error,
            positionAddress: position.publicKey.toBase58(),
            poolAddress,
            dex: this.name,
          };
        }
      }

      return {
        txSignature: lastSignature,
        confirmed: true,
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    } catch (error) {
      return {
        txSignature: lastSignature,
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }
  }

  // ----- claimFees -----

  /**
   * Claim accumulated swap fees from a DLMM LP position.
   *
   * If positionAddress is provided, claims from that specific position.
   * Otherwise, claims from the first position found in the pool.
   */
  async claimFees(poolAddress: string, positionAddress?: string): Promise<TxResult> {
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);

    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);

    if (userPositions.length === 0) {
      return {
        txSignature: "",
        confirmed: false,
        error: `No positions found for user in pool ${poolAddress}`,
        poolAddress,
        dex: this.name,
      };
    }

    // Select position
    let position;
    if (positionAddress) {
      const targetPk = new PublicKey(positionAddress);
      position = userPositions.find((p) => p.publicKey.equals(targetPk));
      if (!position) {
        return {
          txSignature: "",
          confirmed: false,
          error: `Position ${positionAddress} not found in pool ${poolAddress}`,
          poolAddress,
          dex: this.name,
        };
      }
    } else {
      position = userPositions[0];
    }

    // claimSwapFee may return null or throw "No fee to claim"
    let claimFeeTx;
    try {
      claimFeeTx = await dlmmPool.claimSwapFee({
        owner: wallet.publicKey,
        position,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // "No fee to claim" is expected for fresh positions — not a real error
      return {
        txSignature: "",
        confirmed: true,
        error: msg,
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }

    if (!claimFeeTx) {
      return {
        txSignature: "",
        confirmed: true,
        error: "No fees to claim",
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }

    try {
      const result = await sendAndConfirmLegacyTx(connection, claimFeeTx, wallet);

      return {
        txSignature: result.txSignature,
        confirmed: result.confirmed,
        error: result.error,
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    } catch (error) {
      return {
        txSignature: "",
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }
  }

  // ----- listPositions -----

  /**
   * List user's LP positions in a DLMM pool.
   *
   * Returns position details including bin range, token amounts,
   * unclaimed fees, and whether the position is in range.
   */
  async listPositions(poolAddress: string): Promise<LpPositionInfo[]> {
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);
    const activeBin = await dlmmPool.getActiveBin();

    const tokenXMint = dlmmPool.tokenX.publicKey;
    const tokenYMint = dlmmPool.tokenY.publicKey;
    const tokenXDecimals = Number(dlmmPool.tokenX.mint.decimals);
    const tokenYDecimals = Number(dlmmPool.tokenY.mint.decimals);

    const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);

    return userPositions.map((pos) => {
      const binData = pos.positionData.positionBinData;

      // Sum amounts and fees across all bins
      let totalX = 0;
      let totalY = 0;
      let feeX = 0;
      let feeY = 0;

      for (const bin of binData) {
        totalX += Number(bin.positionXAmount);
        totalY += Number(bin.positionYAmount);
        feeX += Number(bin.positionFeeXAmount);
        feeY += Number(bin.positionFeeYAmount);
      }

      const lowerBinId = pos.positionData.lowerBinId;
      const upperBinId = pos.positionData.upperBinId;
      const inRange = activeBin.binId >= lowerBinId && activeBin.binId <= upperBinId;

      return {
        positionAddress: pos.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
        lowerBinId,
        upperBinId,
        amountX: totalX / 10 ** tokenXDecimals,
        amountY: totalY / 10 ** tokenYDecimals,
        tokenXMint: tokenXMint.toBase58(),
        tokenYMint: tokenYMint.toBase58(),
        feeX: feeX / 10 ** tokenXDecimals,
        feeY: feeY / 10 ** tokenYDecimals,
        inRange,
      };
    });
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
