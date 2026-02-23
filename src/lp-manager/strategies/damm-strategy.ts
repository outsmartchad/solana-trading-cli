/**
 * Autonomous LP Manager — DAMM v2 Strategy.
 *
 * DAMM v2 is full-range — positions never go "out of range" in the DLMM sense.
 * Strategy focuses on fee compounding and risk management.
 * Rebalancing is not needed (full-range always captures all trades).
 */

import { getDexAdapter } from "../../dex";
import type { ILpStrategy, PositionState, ResolvedConfig } from "../types";

export class DammStrategy implements ILpStrategy {
  readonly name = "damm-v2-compound";

  shouldRebalance(_state: PositionState, _config: ResolvedConfig): string | null {
    // DAMM v2 is full-range — no rebalancing needed
    return null;
  }

  async rebalance(
    _state: PositionState,
    _config: ResolvedConfig,
  ): Promise<{ newPositionAddress: string; txSignatures: string[] }> {
    // Should never be called for DAMM v2
    throw new Error("DAMM v2 positions are full-range and do not need rebalancing");
  }

  shouldCompound(state: PositionState, config: ResolvedConfig): string | null {
    if (config.compoundIntervalMin <= 0) return null;

    const elapsed = Date.now() - state.lastCompoundAt;
    if (elapsed < config.compoundIntervalMin * 60 * 1000) return null;

    const totalFee = state.feeX + state.feeY;
    if (totalFee <= 0) return null;

    // Estimate fee value in SOL
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

    // Step 2: Re-deposit into pool
    // For DAMM v2, we add liquidity proportionally
    if (state.feeX > 0 || state.feeY > 0) {
      const feeAmountSol = isQuoteMint(state.tokenYMint) ? state.feeY : state.feeX;
      const feeAmountToken = isQuoteMint(state.tokenYMint) ? state.feeX : state.feeY;

      if (feeAmountSol > 0.0001 || feeAmountToken > 0.0001) {
        try {
          const addResult = await adapter.addLiquidity!({
            poolAddress: config.poolAddress,
            amountSol: feeAmountSol > 0.0001 ? feeAmountSol : undefined,
            amountToken: feeAmountToken > 0.0001 ? feeAmountToken : undefined,
            opts: {
              slippageBps: config.slippageBps,
              priorityFeeMicroLamports: config.priorityFee || undefined,
            },
          });
          txSignatures.push(addResult.txSignature);
        } catch {
          // Fee amounts may be too small — ok
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
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  "USD1LXRZ8xMaApM9RF3nDJ3Y5N8o3YoGjpeVUMFZpump",
]);

function isQuoteMint(mint: string): boolean {
  return QUOTE_MINTS.has(mint);
}
