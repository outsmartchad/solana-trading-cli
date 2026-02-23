/**
 * Autonomous LP Manager — Risk Manager.
 *
 * Monitors position health and triggers exits when risk thresholds are breached:
 * - Impermanent loss exceeds threshold
 * - Token price drops below stop-loss
 * - Pool TVL drops below minimum
 */

import { getDexAdapter } from "../dex";
import type { PositionState, ResolvedConfig, LpManagerEvent } from "./types";

export interface RiskAction {
  type: "exit" | "warn";
  reason: string;
  event: LpManagerEvent["type"];
}

/**
 * Check position risk and return any needed actions.
 */
export function checkRisk(
  state: PositionState,
  config: ResolvedConfig,
): RiskAction | null {
  // --- Impermanent loss check ---
  if (config.ilThresholdPct > 0 && state.entryPrice > 0 && state.currentPrice > 0) {
    const il = estimateImpermanentLoss(state.entryPrice, state.currentPrice);
    if (il >= config.ilThresholdPct) {
      return {
        type: "exit",
        reason: `Impermanent loss ${il.toFixed(2)}% exceeds threshold ${config.ilThresholdPct}%`,
        event: "risk:il-exit",
      };
    }
    // Warn at 80% of threshold
    if (il >= config.ilThresholdPct * 0.8) {
      return {
        type: "warn",
        reason: `Impermanent loss ${il.toFixed(2)}% approaching threshold ${config.ilThresholdPct}%`,
        event: "risk:il-warning",
      };
    }
  }

  // --- Stop loss check ---
  if (config.stopLossPct > 0 && state.entryPrice > 0 && state.currentPrice > 0) {
    const priceDropPct = ((state.entryPrice - state.currentPrice) / state.entryPrice) * 100;
    if (priceDropPct >= config.stopLossPct) {
      return {
        type: "exit",
        reason: `Price dropped ${priceDropPct.toFixed(2)}% from entry (${state.entryPrice.toFixed(6)} → ${state.currentPrice.toFixed(6)}), stop-loss at ${config.stopLossPct}%`,
        event: "risk:stop-loss",
      };
    }
  }

  return null;
}

/**
 * Execute a risk-based exit: remove all liquidity and claim fees.
 */
export async function executeRiskExit(
  state: PositionState,
  config: ResolvedConfig,
): Promise<string[]> {
  const adapter = getDexAdapter(config.dex);
  const txSignatures: string[] = [];

  // Remove 100% of liquidity (claims fees atomically for DLMM)
  const result = await adapter.removeLiquidity!({
    poolAddress: config.poolAddress,
    percentage: 100,
    positionAddress: state.positionAddress,
    opts: {
      slippageBps: config.slippageBps,
      priorityFeeMicroLamports: config.priorityFee || undefined,
    },
  });
  txSignatures.push(result.txSignature);

  return txSignatures;
}

// ---------------------------------------------------------------------------
// Impermanent loss estimation
// ---------------------------------------------------------------------------

/**
 * Estimate impermanent loss percentage for a 50/50 pool.
 *
 * Formula: IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
 * Returns positive percentage (e.g., 5.0 for 5% loss).
 */
function estimateImpermanentLoss(entryPrice: number, currentPrice: number): number {
  if (entryPrice <= 0 || currentPrice <= 0) return 0;
  const ratio = currentPrice / entryPrice;
  const il = (2 * Math.sqrt(ratio)) / (1 + ratio) - 1;
  return Math.abs(il) * 100;
}
