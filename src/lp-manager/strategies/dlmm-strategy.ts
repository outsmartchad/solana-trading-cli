/**
 * Autonomous LP Manager — DLMM Strategy.
 *
 * Handles rebalancing and fee compounding for Meteora DLMM concentrated
 * liquidity positions. Detects out-of-range, removes old position, and
 * creates a new position centered around current price.
 */

import { getDexAdapter } from "../../dex";
import type { IDexAdapter } from "../../dex/types";
import type { ILpStrategy, PositionState, ResolvedConfig } from "../types";

export class DlmmStrategy implements ILpStrategy {
  readonly name = "dlmm-rebalance";

  shouldRebalance(state: PositionState, config: ResolvedConfig): string | null {
    // Only rebalance DLMM positions
    if (config.dex !== "meteora-dlmm") return null;

    // Skip if position is in range
    if (state.inRange) return null;

    // Skip if cooldown hasn't elapsed
    const elapsed = Date.now() - state.lastRebalanceAt;
    if (state.lastRebalanceAt > 0 && elapsed < config.rebalanceCooldownSec * 1000) {
      return null;
    }

    // Skip if no price data
    if (state.currentPrice <= 0) return null;

    return `Position out of range (bins ${state.lowerBinId}-${state.upperBinId}), current price: ${state.currentPrice.toFixed(6)}`;
  }

  async rebalance(
    state: PositionState,
    config: ResolvedConfig,
  ): Promise<{ newPositionAddress: string; txSignatures: string[] }> {
    const adapter = getDexAdapter(config.dex);
    const txSignatures: string[] = [];

    // Step 1: Remove all liquidity from old position (claims fees atomically)
    const removeResult = await adapter.removeLiquidity!({
      poolAddress: config.poolAddress,
      percentage: 100,
      positionAddress: state.positionAddress,
      opts: {
        slippageBps: config.slippageBps,
        priorityFeeMicroLamports: config.priorityFee || undefined,
      },
    });
    txSignatures.push(removeResult.txSignature);

    // Step 2: Get current balances to re-deposit
    // After removal, tokens are back in wallet. We need to figure out how much
    // to re-deposit. Use the amounts that were in the position.
    const amountSol = isQuoteMint(state.tokenYMint)
      ? state.amountY
      : state.amountX;
    const amountToken = isQuoteMint(state.tokenYMint)
      ? state.amountX
      : state.amountY;

    // Step 3: Add liquidity with new position centered on current price
    const addResult = await adapter.addLiquidity!({
      poolAddress: config.poolAddress,
      amountSol: amountSol > 0 ? amountSol : undefined,
      amountToken: amountToken > 0 ? amountToken : undefined,
      strategy: config.rebalanceStrategy,
      bins: config.rebalanceBins,
      opts: {
        slippageBps: config.slippageBps,
        priorityFeeMicroLamports: config.priorityFee || undefined,
      },
    });
    txSignatures.push(addResult.txSignature);

    return {
      newPositionAddress: addResult.positionAddress ?? state.positionAddress,
      txSignatures,
    };
  }

  shouldCompound(state: PositionState, config: ResolvedConfig): string | null {
    if (config.compoundIntervalMin <= 0) return null;

    // Check time since last compound
    const elapsed = Date.now() - state.lastCompoundAt;
    if (elapsed < config.compoundIntervalMin * 60 * 1000) return null;

    // Check minimum fee threshold
    const totalFee = state.feeX + state.feeY;
    if (totalFee <= 0) return null;

    // Estimate fee value in SOL (rough: assume feeY is SOL-denominated)
    const feeValueSol = isQuoteMint(state.tokenYMint) ? state.feeY : state.feeX;
    if (feeValueSol < config.compoundMinFeeSol && totalFee < config.compoundMinFeeSol) {
      return null;
    }

    return `Fees ready to compound: feeX=${state.feeX.toFixed(6)} feeY=${state.feeY.toFixed(6)}`;
  }

  async compound(
    state: PositionState,
    config: ResolvedConfig,
  ): Promise<{ txSignatures: string[] }> {
    const adapter = getDexAdapter(config.dex);
    const txSignatures: string[] = [];

    // Step 1: Claim fees
    const claimResult = await adapter.claimFees!(
      config.poolAddress,
      state.positionAddress,
    );
    txSignatures.push(claimResult.txSignature);

    // Step 2: Re-deposit claimed fees into the same position
    // For DLMM, we can't add to an existing position easily —
    // the SDK creates a new position. For compounding, we add a small
    // position with the claimed fee amounts.
    if (state.feeX > 0 || state.feeY > 0) {
      const feeAmountSol = isQuoteMint(state.tokenYMint) ? state.feeY : state.feeX;
      const feeAmountToken = isQuoteMint(state.tokenYMint) ? state.feeX : state.feeY;

      // Only re-deposit if we have meaningful amounts
      if (feeAmountSol > 0.0001 || feeAmountToken > 0.0001) {
        try {
          const addResult = await adapter.addLiquidity!({
            poolAddress: config.poolAddress,
            amountSol: feeAmountSol > 0.0001 ? feeAmountSol : undefined,
            amountToken: feeAmountToken > 0.0001 ? feeAmountToken : undefined,
            strategy: config.rebalanceStrategy,
            bins: config.rebalanceBins,
            opts: {
              slippageBps: config.slippageBps,
              priorityFeeMicroLamports: config.priorityFee || undefined,
            },
          });
          txSignatures.push(addResult.txSignature);
        } catch {
          // Fee amounts may be too small to create a position — that's ok
        }
      }
    }

    return { txSignatures };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUOTE_MINTS = new Set([
  "So11111111111111111111111111111111111111112",     // WSOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  "USD1LXRZ8xMaApM9RF3nDJ3Y5N8o3YoGjpeVUMFZpump", // USD1
]);

function isQuoteMint(mint: string): boolean {
  return QUOTE_MINTS.has(mint);
}
