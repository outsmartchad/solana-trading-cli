/**
 * Meteora LP DLMM — IDexAdapter Implementation (Liquidity Management)
 *
 * Wraps the @meteora-ag/dlmm SDK for DLMM liquidity provisioning.
 * This adapter handles addLiquidity, removeLiquidity, claimFees, and
 * listPositions — no swap operations.
 *
 * Source reference: 100x-algo-bots/trading-modules/meteora-lp/dlmm/
 *
 * Supported modes:
 * - One-sided SOL:   amountSol only → bins below active bin
 * - One-sided token: amountToken only → bins above active bin
 * - Balanced:        amountSol + amountToken → bins centered on active bin
 *
 * Strategies: spot (default), curve, bid-ask
 * Bins: 1-70 (default: 50)
 *
 * SDK pattern:
 *   const dlmmPool = await DLMM.create(connection, poolAddress);
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
} from "@solana/web3.js";

import { getWallet, getConnection } from "../helpers/config";
import { sendAndConfirmVtx } from "../transactions/send-rpc";

import {
  IDexAdapter,
  DexCapabilities,
  defaultCapabilities,
  BuyParams,
  SellParams,
  SwapResult,
  AddLiquidityParams,
  RemoveLiquidityParams,
  TxResult,
  LpPositionInfo,
  LpStrategy,
  UnsupportedOperationError,
  WSOL_MINT,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./types";

import { registerAdapter } from "./index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WSOL_PK = new PublicKey(WSOL_MINT);

/** Default number of bins for LP positions */
const DEFAULT_NUM_BINS = 50;

/** Maximum bins allowed by the DLMM SDK per position */
const MAX_BINS = 70;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export class MeteoraLpDlmmAdapter implements IDexAdapter {
  readonly name = "meteora-lp-dlmm";
  readonly protocol = "dlmm-lp";
  readonly capabilities: DexCapabilities = defaultCapabilities({
    canAddLiquidity: true,
    canRemoveLiquidity: true,
    canClaimFees: true,
    canListPositions: true,
  });

  // ----- Not supported: buy/sell -----

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

    // Extract instructions from the SDK transaction
    const ixs = [
      ComputeBudgetProgram.setComputeUnitLimit({
        units: opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT,
      }),
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
      }),
      ...createPositionTx.instructions,
    ];

    try {
      const result = await sendAndConfirmVtx(connection, ixs, wallet, {
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
    const { poolAddress, percentage, positionAddress, opts } = params;
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
        // Each SDK TX has its own instructions — send via sendAndConfirmVtx
        const ixs = [
          ComputeBudgetProgram.setComputeUnitLimit({
            units: opts?.computeUnitLimit ?? DEFAULT_COMPUTE_UNIT_LIMIT,
          }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: opts?.priorityFeeMicroLamports ?? DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
          }),
          ...removeTx.instructions,
        ];
        const result = await sendAndConfirmVtx(connection, ixs, wallet);
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

    // claimSwapFee returns Transaction | null
    const claimFeeTx = await dlmmPool.claimSwapFee({
      owner: wallet.publicKey,
      position,
    });

    if (!claimFeeTx) {
      return {
        txSignature: "",
        confirmed: false,
        error: "No fees to claim (claimSwapFee returned null)",
        positionAddress: position.publicKey.toBase58(),
        poolAddress,
        dex: this.name,
      };
    }

    try {
      const ixs = [
        ComputeBudgetProgram.setComputeUnitLimit({
          units: DEFAULT_COMPUTE_UNIT_LIMIT,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
        }),
        ...claimFeeTx.instructions,
      ];
      const result = await sendAndConfirmVtx(connection, ixs, wallet);

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
}

// ---------------------------------------------------------------------------
// Auto-register
// ---------------------------------------------------------------------------

registerAdapter(new MeteoraLpDlmmAdapter());
