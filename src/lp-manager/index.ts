/**
 * Autonomous LP Manager — Main Orchestrator.
 *
 * Ties together position monitoring, strategy execution, risk management,
 * and pool selection into a single long-running manager.
 *
 * Usage:
 *   const manager = new LpManager({ poolAddress, dex: "meteora-dlmm" });
 *   manager.on("event", (e) => console.log(e));
 *   await manager.start();
 */

import { EventEmitter } from "events";
import { PositionMonitor } from "./monitor";
import { DlmmStrategy } from "./strategies/dlmm-strategy";
import { DammStrategy } from "./strategies/damm-strategy";
import { checkRisk, executeRiskExit } from "./risk";
import { selectBestPool } from "./pool-selector";
import type {
  LpManagerConfig,
  ResolvedConfig,
  ILpStrategy,
  PositionState,
  LpManagerEvent,
  PoolScore,
} from "./types";

// Re-export types and submodules
export { PositionMonitor } from "./monitor";
export { DlmmStrategy } from "./strategies/dlmm-strategy";
export { DammStrategy } from "./strategies/damm-strategy";
export { checkRisk, executeRiskExit } from "./risk";
export { selectBestPool } from "./pool-selector";
export type {
  LpManagerConfig,
  ResolvedConfig,
  PositionState,
  ILpStrategy,
  LpManagerEvent,
  PoolScore,
} from "./types";

// ---------------------------------------------------------------------------
// Default config values
// ---------------------------------------------------------------------------

const DEFAULTS: Omit<ResolvedConfig, "poolAddress" | "dex"> = {
  positionAddress: "",
  rebalanceRangePct: 5,
  rebalanceBins: 50,
  rebalanceStrategy: "spot",
  rebalanceCooldownSec: 60,
  compoundIntervalMin: 30,
  compoundMinFeeSol: 0.001,
  ilThresholdPct: 10,
  stopLossPct: 0,
  minPoolTvlSol: 0,
  pollIntervalSec: 30,
  useStreaming: true,
  useWebSocket: false,
  dryRun: false,
  logLevel: "info",
  slippageBps: 300,
  priorityFee: 0,
};

// ---------------------------------------------------------------------------
// LpManager class
// ---------------------------------------------------------------------------

export class LpManager extends EventEmitter {
  private config: ResolvedConfig;
  private monitor: PositionMonitor;
  private strategy: ILpStrategy;
  private running = false;
  private actionTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;

  constructor(config: LpManagerConfig) {
    super();
    this.config = {
      ...DEFAULTS,
      ...config,
      useWebSocket: config.useWebSocket ?? (!process.env.GRPC_URL && !process.env.GRPC_XTOKEN),
    } as ResolvedConfig;

    this.monitor = new PositionMonitor(this.config);
    this.strategy = config.dex === "meteora-dlmm"
      ? new DlmmStrategy()
      : new DammStrategy();

    // Forward monitor events
    this.monitor.on("event", (event: LpManagerEvent) => {
      this.emit("event", event);
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start the LP manager. Begins monitoring and automated actions. */
  async start(): Promise<void> {
    this.running = true;
    this.startTime = Date.now();

    this.emitEvent("manager:started", `LP Manager started for ${this.config.dex} pool ${this.config.poolAddress.slice(0, 12)}...`);
    this.log("info", `\n  LP Manager — ${this.config.dex}`);
    this.log("info", `  Pool: ${this.config.poolAddress}`);
    this.log("info", `  Strategy: ${this.strategy.name}`);
    this.log("info", `  Rebalance range: +/-${this.config.rebalanceRangePct}%`);
    this.log("info", `  Compound interval: ${this.config.compoundIntervalMin}min`);
    this.log("info", `  IL threshold: ${this.config.ilThresholdPct}%`);
    this.log("info", `  Stop loss: ${this.config.stopLossPct > 0 ? this.config.stopLossPct + "%" : "disabled"}`);
    this.log("info", `  Dry run: ${this.config.dryRun}`);
    this.log("info", "");

    // Start monitoring
    await this.monitor.start();

    // Set up action loop (check every 10 seconds)
    this.actionTimer = setInterval(
      () => this.runActionLoop().catch((err) => this.emitEvent("manager:error", err.message)),
      10_000,
    );
  }

  /** Stop the LP manager. */
  async stop(): Promise<void> {
    this.running = false;
    if (this.actionTimer) {
      clearInterval(this.actionTimer);
      this.actionTimer = null;
    }
    await this.monitor.stop();

    const uptime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    this.emitEvent("manager:stopped", `LP Manager stopped after ${uptime} minutes`);
  }

  /** Get current position states. */
  getPositions(): PositionState[] {
    return this.monitor.getAllPositions();
  }

  /** Get manager stats. */
  getStats() {
    const positions = this.monitor.getAllPositions();
    return {
      running: this.running,
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
      positionCount: positions.length,
      totalRebalances: positions.reduce((s, p) => s + p.rebalanceCount, 0),
      totalCompounds: positions.reduce((s, p) => s + p.compoundCount, 0),
      totalFeesClaimed: positions.reduce((s, p) => s + p.totalFeesClaimed, 0),
    };
  }

  /**
   * Find the best pool for a token to LP into.
   * Returns scored pools ranked by yield potential.
   */
  static async findBestPool(
    tokenMint: string,
    dex?: "meteora-dlmm" | "meteora-damm-v2",
  ): Promise<PoolScore[]> {
    return selectBestPool(tokenMint, dex);
  }

  // -----------------------------------------------------------------------
  // Internal — action loop
  // -----------------------------------------------------------------------

  private async runActionLoop(): Promise<void> {
    if (!this.running) return;

    const positions = this.monitor.getAllPositions();

    for (const state of positions) {
      // --- Risk check (highest priority) ---
      const riskAction = checkRisk(state, this.config);
      if (riskAction) {
        if (riskAction.type === "exit") {
          this.emitEvent(riskAction.event, riskAction.reason, state.positionAddress);

          if (!this.config.dryRun) {
            try {
              const txSigs = await executeRiskExit(state, this.config);
              this.emitEvent(riskAction.event, `Exited position. TXs: ${txSigs.join(", ")}`, state.positionAddress);
            } catch (err: any) {
              this.emitEvent("manager:error", `Risk exit failed: ${err.message}`, state.positionAddress);
            }
          } else {
            this.log("info", `  [DRY RUN] Would exit position: ${riskAction.reason}`);
          }
          continue; // Skip other actions if exiting
        } else {
          // Warning only
          this.emitEvent(riskAction.event, riskAction.reason, state.positionAddress);
        }
      }

      // --- Rebalance check ---
      const rebalanceReason = this.strategy.shouldRebalance(state, this.config);
      if (rebalanceReason) {
        this.emitEvent("rebalance:start", rebalanceReason, state.positionAddress);

        if (!this.config.dryRun) {
          try {
            const result = await this.strategy.rebalance(state, this.config);
            state.rebalanceCount++;
            state.lastRebalanceAt = Date.now();

            // Update position address if it changed
            if (result.newPositionAddress !== state.positionAddress) {
              this.log("info", `  New position: ${result.newPositionAddress.slice(0, 12)}...`);
            }

            this.emitEvent("rebalance:done",
              `Rebalanced. TXs: ${result.txSignatures.join(", ")}`,
              state.positionAddress,
            );

            // Force a poll to update state after rebalance
            await this.monitor.poll();
          } catch (err: any) {
            this.emitEvent("rebalance:failed", `Rebalance failed: ${err.message}`, state.positionAddress);
          }
        } else {
          this.log("info", `  [DRY RUN] Would rebalance: ${rebalanceReason}`);
          this.emitEvent("rebalance:skipped", `[DRY RUN] ${rebalanceReason}`, state.positionAddress);
        }
        continue; // Don't compound in the same cycle as rebalance
      }

      // --- Compound check ---
      const compoundReason = this.strategy.shouldCompound(state, this.config);
      if (compoundReason) {
        this.emitEvent("compound:start", compoundReason, state.positionAddress);

        if (!this.config.dryRun) {
          try {
            const result = await this.strategy.compound(state, this.config);
            state.compoundCount++;
            state.lastCompoundAt = Date.now();
            state.totalFeesClaimed += state.feeX + state.feeY;

            this.emitEvent("compound:done",
              `Compounded fees. TXs: ${result.txSignatures.join(", ")}`,
              state.positionAddress,
            );

            // Force a poll to update fee balances
            await this.monitor.poll();
          } catch (err: any) {
            this.emitEvent("compound:failed", `Compound failed: ${err.message}`, state.positionAddress);
          }
        } else {
          this.log("info", `  [DRY RUN] Would compound: ${compoundReason}`);
          this.emitEvent("compound:skipped", `[DRY RUN] ${compoundReason}`, state.positionAddress);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal — helpers
  // -----------------------------------------------------------------------

  private emitEvent(
    type: LpManagerEvent["type"],
    message: string,
    position?: string,
  ): void {
    const event: LpManagerEvent = {
      type,
      timestamp: Date.now(),
      position,
      pool: this.config.poolAddress,
      message,
    };
    this.emit("event", event);
    this.log(type.includes("error") || type.includes("exit") || type.includes("stop") ? "info" : "debug", `  [${type}] ${message}`);
  }

  private log(level: "info" | "debug", msg: string): void {
    if (this.config.logLevel === "silent") return;
    if (level === "debug" && this.config.logLevel !== "debug") return;
    console.log(msg);
  }
}
