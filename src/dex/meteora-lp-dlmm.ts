/**
 * Meteora LP DLMM — IDexAdapter Implementation (Liquidity Management)
 *
 * Wraps the @meteora-ag/dlmm SDK for DLMM liquidity provisioning.
 * This adapter handles addLiquidity and removeLiquidity — no swap operations.
 *
 * Source: 100x-algo-bots/trading-modules/meteora-lp/dlmm/ (25.4k LOC)
 *
 * Core operations ported:
 * - addLiquidity: Creates a DLMM position with one-sided or balanced liquidity
 *   using initializePositionAndAddLiquidityByStrategy()
 * - removeLiquidity: Removes liquidity from existing positions with optional
 *   claim-and-close using dlmmPool.removeLiquidity()
 *
 * The full source module includes position verification, fee claiming, pool
 * discovery with RPC throttling protection, and logging infrastructure.
 * This adapter ports the core LP operations; advanced features like the
 * DLMM_Manager class can be accessed directly if needed.
 *
 * SDK pattern:
 *   const dlmmPool = await DLMM.create(connection, poolAddress);
 *   const createTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({...});
 *   const removeTxs = await dlmmPool.removeLiquidity({...});
 */

import BN from "bn.js";
import DLMM, { StrategyType } from "@meteora-ag/dlmm";
import {
  PublicKey,
  Keypair,
  sendAndConfirmTransaction,
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
  AddLiquidityParams,
  RemoveLiquidityParams,
  TxResult,
  UnsupportedOperationError,
  WSOL_MINT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DLMM_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const WSOL_PK = new PublicKey(WSOL_MINT);

/** Default number of bins for one-sided position */
const DEFAULT_NUM_BINS = 50;

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MeteoraLpDlmmAdapter implements IDexAdapter {
  readonly name = "meteora-lp-dlmm";
  readonly protocol = "dlmm-lp";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canAddLiquidity: true,
    canRemoveLiquidity: true,
  });

  // ----- Not supported: buy/sell/snipe -----

  async buy(_params: BuyParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "buy");
  }

  async sell(_params: SellParams): Promise<SwapResult> {
    throw new UnsupportedOperationError(this.name, "sell");
  }

  // ----- addLiquidity -----

  /**
   * Add liquidity to a Meteora DLMM pool.
   *
   * Supports two modes:
   * 1. One-sided SOL liquidity (amountB provided, amountA = 0):
   *    Creates a position with bins below the active bin, filled with SOL.
   *    This is the most common use case from the source module.
   *
   * 2. Balanced liquidity (both amountA and amountB provided):
   *    Creates a position centered around the active bin with both tokens.
   *
   * The position is created using the Spot strategy by default.
   * Bin range: [activeBin - DEFAULT_NUM_BINS, activeBin] for one-sided SOL,
   * or [activeBin - numBins/2, activeBin + numBins/2] for balanced.
   */
  async addLiquidity(params: AddLiquidityParams): Promise<TxResult> {
    const { poolAddress, amountA, amountB, opts } = params;
    const connection = getConnection();
    const wallet = getWallet();
    const poolPk = new PublicKey(poolAddress);

    const dlmmPool = await DLMM.create(connection, poolPk);
    const activeBin = await dlmmPool.getActiveBin();

    const isOneSidedSol = (amountA === 0 || amountA === undefined) && amountB && amountB > 0;
    const isOneSidedToken = amountA > 0 && (!amountB || amountB === 0);

    // Fetch actual mint decimals from the pool
    const tokenXDecimals = Number(dlmmPool.tokenX.mint.decimals);
    const tokenYDecimals = Number(dlmmPool.tokenY.mint.decimals);

    let minBinId: number;
    let maxBinId: number;
    let totalXAmount: BN; // tokenX (usually the non-SOL token)
    let totalYAmount: BN; // tokenY (usually SOL)

    if (isOneSidedSol) {
      // One-sided SOL: place liquidity below active bin
      // SOL is typically tokenY in DLMM pools
      minBinId = activeBin.binId - DEFAULT_NUM_BINS;
      maxBinId = activeBin.binId;
      totalXAmount = new BN(0);
      totalYAmount = new BN(Math.floor(amountB! * Math.pow(10, tokenYDecimals)));
    } else if (isOneSidedToken) {
      // One-sided token: place liquidity above active bin
      minBinId = activeBin.binId;
      maxBinId = activeBin.binId + DEFAULT_NUM_BINS;
      totalXAmount = new BN(Math.floor(amountA * Math.pow(10, tokenXDecimals)));
      totalYAmount = new BN(0);
    } else {
      // Balanced: center around active bin
      const halfBins = Math.floor(DEFAULT_NUM_BINS / 2);
      minBinId = activeBin.binId - halfBins;
      maxBinId = activeBin.binId + halfBins;
      totalXAmount = new BN(Math.floor(amountA * Math.pow(10, tokenXDecimals)));
      totalYAmount = new BN(Math.floor((amountB ?? 0) * Math.pow(10, tokenYDecimals)));
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
        strategyType: StrategyType.Spot,
      },
    });

    try {
      const txSignature = await sendAndConfirmTransaction(
        connection,
        createPositionTx,
        [wallet, newPosition],
      );

      return {
        txSignature,
        confirmed: true,
      };
    } catch (error) {
      return {
        txSignature: "",
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ----- removeLiquidity -----

  /**
   * Remove liquidity from a Meteora DLMM pool position.
   *
   * The caller provides the pool address and percentage to remove.
   * The adapter finds the user's position in the pool and removes
   * the specified percentage of liquidity.
   *
   * If percentage is 100, also claims fees and closes the position.
   *
   * Note: If the user has multiple positions in the same pool, this
   * removes from the first one found.
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<TxResult> {
    const { poolAddress, percentage, opts } = params;
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
      };
    }

    const position = userPositions[0]; // Use first position

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

    // Send all removal transactions
    // removeLiquidity returns Transaction | Transaction[], normalize to array
    const txArray = Array.isArray(removeTxs) ? removeTxs : [removeTxs];
    let lastSignature = "";
    try {
      for (const removeTx of txArray) {
        lastSignature = await sendAndConfirmTransaction(
          connection,
          removeTx,
          [wallet],
        );
      }

      return {
        txSignature: lastSignature,
        confirmed: true,
      };
    } catch (error) {
      return {
        txSignature: lastSignature,
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new MeteoraLpDlmmAdapter());
