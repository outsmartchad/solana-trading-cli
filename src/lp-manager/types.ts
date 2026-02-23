/**
 * Autonomous LP Manager — Type definitions.
 *
 * All configuration, state, and strategy types for the LP manager.
 */

import type { LpStrategy } from "../dex/types";

// ---------------------------------------------------------------------------
// Manager configuration
// ---------------------------------------------------------------------------

export interface LpManagerConfig {
  /** Pool address to manage */
  poolAddress: string;
  /** DEX adapter name ("meteora-dlmm" or "meteora-damm-v2") */
  dex: "meteora-dlmm" | "meteora-damm-v2";
  /** Optional: specific position address. If omitted, manages all positions in pool. */
  positionAddress?: string;

  // --- Rebalance settings (DLMM only) ---
  /** Rebalance when price moves outside this % range from position center. Default: 5 */
  rebalanceRangePct?: number;
  /** Number of bins for new position after rebalance. Default: 50 */
  rebalanceBins?: number;
  /** LP distribution strategy for new position. Default: "spot" */
  rebalanceStrategy?: LpStrategy;
  /** Minimum seconds between rebalance attempts. Default: 60 */
  rebalanceCooldownSec?: number;

  // --- Fee compounding settings ---
  /** Compound fees every N minutes. 0 = disabled. Default: 30 */
  compoundIntervalMin?: number;
  /** Skip compound if estimated fees < this SOL value. Default: 0.001 */
  compoundMinFeeSol?: number;

  // --- Risk management ---
  /** Exit position if impermanent loss exceeds this %. Default: 10 */
  ilThresholdPct?: number;
  /** Exit position if token price drops this % from entry. Default: 0 (disabled) */
  stopLossPct?: number;
  /** Exit position if pool TVL (in SOL) drops below this. Default: 0 (disabled) */
  minPoolTvlSol?: number;

  // --- Monitoring settings ---
  /** Seconds between on-chain position polls. Default: 30 */
  pollIntervalSec?: number;
  /** Use event streaming for real-time price updates. Default: true */
  useStreaming?: boolean;
  /** Use WebSocket streaming (free) instead of gRPC. Default: auto-detect */
  useWebSocket?: boolean;

  // --- Execution settings ---
  /** Dry run — log actions without executing. Default: false */
  dryRun?: boolean;
  /** Log level. Default: "info" */
  logLevel?: "silent" | "info" | "debug";
  /** Slippage in basis points for LP operations. Default: 300 */
  slippageBps?: number;
  /** Priority fee in microLamports per CU. Default: from env */
  priorityFee?: number;
}

/** Resolved config with all defaults filled in */
export type ResolvedConfig = Required<LpManagerConfig>;

// ---------------------------------------------------------------------------
// Position state (tracked in memory, updated by monitor)
// ---------------------------------------------------------------------------

export interface PositionState {
  /** Position account address */
  positionAddress: string;
  /** Pool address */
  poolAddress: string;
  /** DEX name */
  dex: string;

  // --- Current position data ---
  /** Token X (base) mint */
  tokenXMint: string;
  /** Token Y (quote) mint */
  tokenYMint: string;
  /** Token X amount in position (human-readable) */
  amountX: number;
  /** Token Y amount in position (human-readable) */
  amountY: number;
  /** Unclaimed fee for token X (human-readable) */
  feeX: number;
  /** Unclaimed fee for token Y (human-readable) */
  feeY: number;
  /** Whether the current price is within position range (DLMM) */
  inRange: boolean;
  /** Lower bin ID (DLMM only, 0 for DAMM v2) */
  lowerBinId: number;
  /** Upper bin ID (DLMM only, 0 for DAMM v2) */
  upperBinId: number;

  // --- Price data ---
  /** Current spot price (quote per base) */
  currentPrice: number;
  /** Price when position was first observed by manager */
  entryPrice: number;
  /** Active bin ID (DLMM only) */
  activeBinId: number;

  // --- Tracking ---
  /** Total fees claimed (in SOL equivalent) since manager started */
  totalFeesClaimed: number;
  /** Number of rebalances performed */
  rebalanceCount: number;
  /** Number of compounds performed */
  compoundCount: number;
  /** Timestamp of last rebalance (ms) */
  lastRebalanceAt: number;
  /** Timestamp of last compound (ms) */
  lastCompoundAt: number;
  /** Timestamp of first observation (ms) */
  firstSeenAt: number;
  /** Timestamp of last update (ms) */
  lastUpdatedAt: number;
}

// ---------------------------------------------------------------------------
// Manager events (emitted for logging / UI)
// ---------------------------------------------------------------------------

export type LpManagerEventType =
  | "position:updated"
  | "position:out-of-range"
  | "position:in-range"
  | "rebalance:start"
  | "rebalance:done"
  | "rebalance:skipped"
  | "rebalance:failed"
  | "compound:start"
  | "compound:done"
  | "compound:skipped"
  | "compound:failed"
  | "risk:il-warning"
  | "risk:il-exit"
  | "risk:stop-loss"
  | "risk:tvl-exit"
  | "pool:selected"
  | "manager:started"
  | "manager:stopped"
  | "manager:error";

export interface LpManagerEvent {
  type: LpManagerEventType;
  timestamp: number;
  position?: string;
  pool?: string;
  message: string;
  data?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Pool scoring (for pool selection)
// ---------------------------------------------------------------------------

export interface PoolScore {
  /** Pool address */
  poolAddress: string;
  /** DEX adapter name */
  dex: string;
  /** Token pair description (e.g., "SOL/USDC") */
  pair: string;
  /** Base token mint */
  baseMint: string;
  /** Quote token mint */
  quoteMint: string;

  // --- Scoring inputs ---
  /** 24h volume in USD */
  volume24h: number;
  /** Total value locked in USD */
  tvlUsd: number;
  /** Volume/TVL ratio (higher = more fee revenue per $ locked) */
  volumeTvlRatio: number;
  /** Estimated annual fee APR (%) */
  estimatedApr: number;
  /** Pool age in hours */
  ageHours: number;
  /** Number of active LPs (if available) */
  lpCount: number;

  // --- Composite score ---
  /** Overall score (0-100, higher is better) */
  score: number;
}

// ---------------------------------------------------------------------------
// Strategy interface
// ---------------------------------------------------------------------------

export interface ILpStrategy {
  /** Strategy name for logging */
  readonly name: string;

  /** Check if position needs rebalancing. Returns reason string or null. */
  shouldRebalance(state: PositionState, config: ResolvedConfig): string | null;

  /** Execute rebalance: remove old position, add new one */
  rebalance(
    state: PositionState,
    config: ResolvedConfig,
  ): Promise<{ newPositionAddress: string; txSignatures: string[] }>;

  /** Check if fees should be compounded. Returns reason string or null. */
  shouldCompound(state: PositionState, config: ResolvedConfig): string | null;

  /** Execute compound: claim fees and re-deposit */
  compound(
    state: PositionState,
    config: ResolvedConfig,
  ): Promise<{ txSignatures: string[] }>;
}
