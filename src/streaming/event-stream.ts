/**
 * Event Streaming Engine — Main EventStream class.
 *
 * Connects to Yellowstone gRPC, subscribes to DEX transactions,
 * parses them into typed events, and emits via EventEmitter.
 *
 * Usage:
 *   const stream = new EventStream({ logLevel: "info" });
 *   stream.on("Swap", (event) => console.log(event));
 *   stream.on("NewPool", (event) => console.log(event));
 *   await stream.start("pumpswap");
 *
 * Features:
 *   - Auto-reconnect with exponential backoff
 *   - Ping keepalive (10s)
 *   - Block metadata → slot-to-timestamp mapping
 *   - LargeSwap filtering (configurable threshold)
 *   - Dynamic subscribe/unsubscribe at runtime
 */

import { EventEmitter } from "events";
import { formatTransaction } from "./tx-formatter";
import { parseTransaction } from "./tx-parser";
import {
  getPresetSubscription,
  createPingRequest,
  createClearSubscriptionsRequest,
} from "./subscriptions";
import type {
  StreamConfig,
  StreamEvent,
  StreamEventType,
  SubscriptionPreset,
  SwapEvent,
  LargeSwapEvent,
} from "./types";

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULTS: Required<StreamConfig> = {
  grpcUrl: "",
  grpcXToken: "",
  maxReceiveMessageLength: 64 * 1024 * 1024,
  pingIntervalMs: 10_000,
  reconnectDelayMs: 5_000,
  maxReconnectDelayMs: 30_000,
  largeSwapThresholdSol: 10,
  logLevel: "info",
};

// ---------------------------------------------------------------------------
// EventStream class
// ---------------------------------------------------------------------------

export class EventStream extends EventEmitter {
  private config: Required<StreamConfig>;
  private running = false;
  private client: any = null;
  private stream: any = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnecting = false;
  private currentReconnectDelay: number;
  private currentSubscription: any = null;

  // Block metadata for slot → timestamp mapping
  private slotToTimestamp: Map<number, number> = new Map();
  private latestSlot = 0;
  private latestTimestamp = 0;

  // Stats
  private txCount = 0;
  private eventCount = 0;
  private errorCount = 0;
  private startTime = 0;

  constructor(config: StreamConfig = {}) {
    super();
    this.config = {
      ...DEFAULTS,
      ...config,
      grpcUrl: config.grpcUrl || process.env.GRPC_URL || "",
      grpcXToken: config.grpcXToken || process.env.GRPC_XTOKEN || "",
    };
    this.currentReconnectDelay = this.config.reconnectDelayMs;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Start streaming with a preset subscription.
   */
  async start(
    preset: SubscriptionPreset,
    opts?: { wallets?: string[] },
  ): Promise<void> {
    if (!this.config.grpcUrl) {
      throw new Error(
        "GRPC_URL not set. Add your Yellowstone gRPC endpoint to env or ~/.outsmart/config.env",
      );
    }

    this.running = true;
    this.startTime = Date.now();
    this.currentSubscription = getPresetSubscription(preset, opts);

    this.log("info", `Starting event stream (preset: ${preset})...`);
    await this.connect();
  }

  /**
   * Start streaming with a custom subscription request.
   */
  async startCustom(subscribeRequest: any): Promise<void> {
    if (!this.config.grpcUrl) {
      throw new Error("GRPC_URL not set.");
    }

    this.running = true;
    this.startTime = Date.now();
    this.currentSubscription = subscribeRequest;

    this.log("info", "Starting event stream (custom subscription)...");
    await this.connect();
  }

  /**
   * Stop streaming and clean up.
   */
  async stop(): Promise<void> {
    this.running = false;
    this.cleanup();
    const uptime = ((Date.now() - this.startTime) / 1000).toFixed(0);
    this.log(
      "info",
      `Stream stopped. ${this.txCount} txns processed, ${this.eventCount} events emitted, ${this.errorCount} errors. Uptime: ${uptime}s`,
    );
  }

  /**
   * Get streaming statistics.
   */
  getStats() {
    return {
      running: this.running,
      txCount: this.txCount,
      eventCount: this.eventCount,
      errorCount: this.errorCount,
      latestSlot: this.latestSlot,
      latestTimestamp: this.latestTimestamp,
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Dynamically change subscription at runtime.
   */
  async resubscribe(preset: SubscriptionPreset, opts?: { wallets?: string[] }): Promise<void> {
    if (!this.stream) throw new Error("Stream not connected");

    // Clear existing subscriptions
    await this.writeToStream(createClearSubscriptionsRequest());

    // Send new subscription
    this.currentSubscription = getPresetSubscription(preset, opts);
    await this.writeToStream(this.currentSubscription);

    this.log("info", `Resubscribed to: ${preset}`);
  }

  // -----------------------------------------------------------------------
  // Internal — connection management
  // -----------------------------------------------------------------------

  private async connect(): Promise<void> {
    try {
      const Client = (await import("@triton-one/yellowstone-grpc")).default;

      this.client = new Client(this.config.grpcUrl, this.config.grpcXToken, {
        "grpc.max_receive_message_length": this.config.maxReceiveMessageLength,
      });

      this.stream = await this.client.subscribe();

      // Send subscription request
      await this.writeToStream(this.currentSubscription);

      this.log("info", "  Connected to gRPC. Listening for transactions...");

      // Reset reconnect delay on successful connection
      this.currentReconnectDelay = this.config.reconnectDelayMs;

      // Set up data handler
      this.stream.on("data", (data: any) => {
        try {
          this.handleData(data);
        } catch (err: any) {
          this.errorCount++;
          this.log("debug", `  [data error] ${err.message}`);
        }
      });

      // Set up error/end handlers for auto-reconnect
      this.stream.on("error", (err: any) => {
        this.log("info", `  [grpc error] ${err.message}`);
        this.errorCount++;
        this.scheduleReconnect();
      });

      this.stream.on("end", () => {
        this.log("info", "  [grpc] stream ended");
        this.scheduleReconnect();
      });

      this.stream.on("close", () => {
        this.log("debug", "  [grpc] stream closed");
        this.scheduleReconnect();
      });

      // Ping keepalive
      this.pingInterval = setInterval(() => {
        if (!this.running || !this.stream) return;
        try {
          this.stream.write(createPingRequest(), () => {});
        } catch {
          this.scheduleReconnect();
        }
      }, this.config.pingIntervalMs);
    } catch (err: any) {
      this.log("info", `  Connection failed: ${err.message}`);
      this.errorCount++;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnecting) return;
    this.reconnecting = true;
    this.cleanup();

    this.log("info", `  Reconnecting in ${this.currentReconnectDelay}ms...`);

    setTimeout(async () => {
      this.reconnecting = false;
      if (!this.running) return;
      try {
        await this.connect();
        this.log("info", "  Reconnected to gRPC.");
      } catch (err: any) {
        this.log("info", `  Reconnect failed: ${err.message}`);
        // Exponential backoff
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * 2,
          this.config.maxReconnectDelayMs,
        );
        this.scheduleReconnect();
      }
    }, this.currentReconnectDelay);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.stream) {
      try {
        this.stream.cancel();
      } catch {}
      this.stream = null;
    }
    this.client = null;
  }

  private async writeToStream(request: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.stream.write(request, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // -----------------------------------------------------------------------
  // Internal — data handler
  // -----------------------------------------------------------------------

  private handleData(data: any): void {
    // Pong response — ignore
    if (data.pong) return;

    // Block metadata — update slot→timestamp mapping
    if (data.blockMeta) {
      const slot = Number(data.blockMeta.slot);
      const timestamp = Number(data.blockMeta.blockTime?.timestamp ?? 0);
      if (slot && timestamp) {
        this.slotToTimestamp.set(slot, timestamp);
        this.latestSlot = slot;
        this.latestTimestamp = timestamp;

        // Cleanup old entries (older than 5 minutes)
        this.cleanupOldSlots();
      }
      return;
    }

    // Also handle blocksMeta filter format
    if (data.filters?.[0] === "blockmetadata" && data.blockMeta) {
      const slot = Number(data.blockMeta.slot);
      const timestamp = Number(data.blockMeta.blockTime?.timestamp ?? 0);
      if (slot && timestamp) {
        this.slotToTimestamp.set(slot, timestamp);
        this.latestSlot = slot;
        this.latestTimestamp = timestamp;
      }
      return;
    }

    // Transaction update
    if (data.transaction) {
      this.txCount++;
      const txData = data.transaction;

      // Skip if no inner instructions (no DEX interaction)
      if (!txData.transaction?.meta?.innerInstructions?.length) return;

      // Skip failed transactions
      if (txData.transaction?.meta?.err) return;

      // Get timestamp for this slot
      const slot = Number(txData.slot ?? 0);
      const timestamp = this.slotToTimestamp.get(slot) ?? this.latestTimestamp;

      // Format the raw transaction
      const formatted = formatTransaction(txData, timestamp);
      if (!formatted) return;

      // Parse into events
      const events = parseTransaction(formatted);

      // Emit each event
      for (const event of events) {
        this.eventCount++;
        this.emit(event.type, event);
        this.emit("*", event); // catch-all

        // Check for large swaps
        if (event.type === "Swap") {
          this.checkLargeSwap(event);
        }
      }
    }
  }

  private checkLargeSwap(swap: SwapEvent): void {
    // For SOL-quoted swaps, check if the SOL amount exceeds threshold
    const solAmount = swap.direction === "buy" ? swap.amountIn : swap.amountOut;
    if (solAmount >= this.config.largeSwapThresholdSol) {
      const largeSwap: LargeSwapEvent = {
        type: "LargeSwap",
        swap,
        estimatedUsdValue: 0, // Would need SOL price feed for USD estimate
      };
      this.eventCount++;
      this.emit("LargeSwap", largeSwap);
      this.emit("*", largeSwap);
    }
  }

  private cleanupOldSlots(): void {
    if (this.slotToTimestamp.size < 1000) return; // only clean when needed

    const cutoff = this.latestTimestamp - 5 * 60; // 5 minutes
    for (const [slot, ts] of this.slotToTimestamp) {
      if (ts < cutoff) {
        this.slotToTimestamp.delete(slot);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal — logging
  // -----------------------------------------------------------------------

  private log(level: "info" | "debug", msg: string): void {
    if (this.config.logLevel === "silent") return;
    if (level === "debug" && this.config.logLevel !== "debug") return;
    console.log(msg);
  }
}
