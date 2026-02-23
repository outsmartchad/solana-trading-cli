/**
 * Autonomous LP Manager — Position Monitor.
 *
 * Hybrid monitoring: periodic on-chain polls via DEX adapter + optional
 * real-time price updates via event streaming engine.
 *
 * Updates PositionState in memory for the strategy/risk modules to act on.
 */

import { EventEmitter } from "events";
import { getDexAdapter } from "../dex";
import type { IDexAdapter, LpPositionInfo, PriceInfo } from "../dex/types";
import type { PositionState, ResolvedConfig, LpManagerEvent } from "./types";

// ---------------------------------------------------------------------------
// PositionMonitor
// ---------------------------------------------------------------------------

export class PositionMonitor extends EventEmitter {
  private config: ResolvedConfig;
  private adapter: IDexAdapter;
  private positions: Map<string, PositionState> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private streamCleanup: (() => Promise<void>) | null = null;
  private running = false;

  constructor(config: ResolvedConfig) {
    super();
    this.config = config;
    this.adapter = getDexAdapter(config.dex);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start monitoring. Does an initial poll, then sets up periodic polling + optional streaming. */
  async start(): Promise<void> {
    this.running = true;

    // Initial poll
    await this.poll();

    // Set up periodic polling
    this.pollTimer = setInterval(
      () => this.poll().catch((err) => this.emitEvent("manager:error", err.message)),
      this.config.pollIntervalSec * 1000,
    );

    // Set up streaming for real-time price updates
    if (this.config.useStreaming) {
      await this.startStreaming();
    }
  }

  /** Stop monitoring. */
  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.streamCleanup) {
      await this.streamCleanup();
      this.streamCleanup = null;
    }
  }

  /** Get current state for a position. */
  getPosition(positionAddress: string): PositionState | undefined {
    return this.positions.get(positionAddress);
  }

  /** Get all tracked positions. */
  getAllPositions(): PositionState[] {
    return Array.from(this.positions.values());
  }

  /** Force an immediate poll. */
  async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // Get current price
      let price: PriceInfo | null = null;
      if (this.adapter.getPrice) {
        try {
          price = await this.adapter.getPrice(this.config.poolAddress);
        } catch {
          // Price fetch can fail, continue with stale price
        }
      }

      // Get positions
      if (!this.adapter.listPositions) {
        this.emitEvent("manager:error", `${this.config.dex} does not support listPositions`);
        return;
      }

      const positions = await this.adapter.listPositions(this.config.poolAddress);

      // Filter to specific position if configured
      const filtered = this.config.positionAddress
        ? positions.filter((p) => p.positionAddress === this.config.positionAddress)
        : positions;

      if (filtered.length === 0) {
        this.emitEvent("manager:error", "No positions found in pool");
        return;
      }

      // Update state for each position
      for (const pos of filtered) {
        this.updatePositionState(pos, price);
      }

      // Remove positions that no longer exist on-chain
      const activeAddrs = new Set(filtered.map((p) => p.positionAddress));
      for (const addr of this.positions.keys()) {
        if (!activeAddrs.has(addr)) {
          this.positions.delete(addr);
        }
      }
    } catch (err: any) {
      this.emitEvent("manager:error", `Poll failed: ${err.message}`);
    }
  }

  /** Update price from streaming event (called by LpManager when stream emits Swap). */
  updatePrice(newPrice: number): void {
    for (const state of this.positions.values()) {
      const wasInRange = state.inRange;
      state.currentPrice = newPrice;
      state.lastUpdatedAt = Date.now();

      // For DLMM, we can approximate in-range from price
      // (full accuracy requires knowing bin step, which we don't have from stream)
      // The periodic poll will correct this

      // Emit in-range / out-of-range transitions
      // Note: only the periodic poll updates inRange accurately for DLMM
      if (wasInRange !== state.inRange) {
        this.emitEvent(
          state.inRange ? "position:in-range" : "position:out-of-range",
          `Position ${state.positionAddress.slice(0, 8)}... is now ${state.inRange ? "in" : "out of"} range`,
          state.positionAddress,
        );
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal — state management
  // -----------------------------------------------------------------------

  private updatePositionState(pos: LpPositionInfo, price: PriceInfo | null): void {
    const now = Date.now();
    const existing = this.positions.get(pos.positionAddress);

    const currentPrice = price?.price ?? existing?.currentPrice ?? 0;

    if (existing) {
      // Update existing state
      const wasInRange = existing.inRange;

      existing.amountX = pos.amountX;
      existing.amountY = pos.amountY;
      existing.feeX = pos.feeX;
      existing.feeY = pos.feeY;
      existing.inRange = pos.inRange;
      existing.lowerBinId = pos.lowerBinId;
      existing.upperBinId = pos.upperBinId;
      existing.currentPrice = currentPrice;
      existing.lastUpdatedAt = now;

      if (pos.tokenXMint) existing.tokenXMint = pos.tokenXMint;
      if (pos.tokenYMint) existing.tokenYMint = pos.tokenYMint;

      // Detect range transitions
      if (wasInRange && !pos.inRange) {
        this.emitEvent(
          "position:out-of-range",
          `Position ${pos.positionAddress.slice(0, 8)}... moved out of range at price ${currentPrice.toFixed(6)}`,
          pos.positionAddress,
        );
      } else if (!wasInRange && pos.inRange) {
        this.emitEvent(
          "position:in-range",
          `Position ${pos.positionAddress.slice(0, 8)}... is back in range`,
          pos.positionAddress,
        );
      }

      this.emitEvent("position:updated", `Position updated: feeX=${pos.feeX.toFixed(6)} feeY=${pos.feeY.toFixed(6)} inRange=${pos.inRange}`, pos.positionAddress);
    } else {
      // New position — create initial state
      const state: PositionState = {
        positionAddress: pos.positionAddress,
        poolAddress: pos.poolAddress,
        dex: pos.dex,
        tokenXMint: pos.tokenXMint,
        tokenYMint: pos.tokenYMint,
        amountX: pos.amountX,
        amountY: pos.amountY,
        feeX: pos.feeX,
        feeY: pos.feeY,
        inRange: pos.inRange,
        lowerBinId: pos.lowerBinId,
        upperBinId: pos.upperBinId,
        currentPrice,
        entryPrice: currentPrice,
        activeBinId: 0,
        totalFeesClaimed: 0,
        rebalanceCount: 0,
        compoundCount: 0,
        lastRebalanceAt: 0,
        lastCompoundAt: 0,
        firstSeenAt: now,
        lastUpdatedAt: now,
      };
      this.positions.set(pos.positionAddress, state);

      this.emitEvent(
        "position:updated",
        `Tracking new position ${pos.positionAddress.slice(0, 8)}... (${pos.dex}) inRange=${pos.inRange}`,
        pos.positionAddress,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Internal — streaming
  // -----------------------------------------------------------------------

  private async startStreaming(): Promise<void> {
    try {
      const useWs = this.config.useWebSocket ??
        (!process.env.GRPC_URL && !process.env.GRPC_XTOKEN);

      if (useWs) {
        const { WsEventStream } = await import("../streaming/ws-event-stream");
        const stream = new WsEventStream({ logLevel: "silent" });
        stream.on("Swap", (event: any) => {
          if (event.pool === this.config.poolAddress) {
            this.updatePrice(event.priceAfter);
          }
        });
        await stream.start("all-dex-swaps");
        this.streamCleanup = () => stream.stop();
      } else {
        const { EventStream } = await import("../streaming/event-stream");
        const stream = new EventStream({ logLevel: "silent" });
        stream.on("Swap", (event: any) => {
          if (event.pool === this.config.poolAddress) {
            this.updatePrice(event.priceAfter);
          }
        });

        // Use pool-specific subscription for efficiency
        const { subscribePoolActivity } = await import("../streaming/subscriptions");
        await stream.startCustom(subscribePoolActivity([this.config.poolAddress]));
        this.streamCleanup = () => stream.stop();
      }

      this.log("debug", "  Real-time streaming connected for pool price updates");
    } catch (err: any) {
      this.log("info", `  Streaming unavailable (${err.message}), using polling only`);
    }
  }

  // -----------------------------------------------------------------------
  // Internal — event emission & logging
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
    this.log(type.includes("error") ? "info" : "debug", `  [${type}] ${message}`);
  }

  private log(level: "info" | "debug", msg: string): void {
    if (this.config.logLevel === "silent") return;
    if (level === "debug" && this.config.logLevel !== "debug") return;
    console.log(msg);
  }
}
