/**
 * Event Streaming Engine — WebSocket EventStream.
 *
 * Free alternative to the gRPC EventStream. Uses Solana's native RPC WebSocket
 * `logsSubscribe` to detect DEX transactions, then fetches full transaction data
 * via `getTransaction` RPC and reuses the same parsers as the gRPC engine.
 *
 * Tradeoffs vs gRPC:
 *   - Free (no gRPC endpoint needed, uses standard RPC)
 *   - Higher latency (~1-3s vs ~200ms)
 *   - May miss transactions under heavy load (RPC rate limits)
 *   - Limited to one program per subscription (multiple subs for multiple DEXes)
 *
 * Usage:
 *   const stream = new WsEventStream({ logLevel: "info" });
 *   stream.on("Swap", (event) => console.log(event));
 *   await stream.start("pumpswap");
 */

import { EventEmitter } from "events";
import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { parseTransaction } from "./tx-parser";
import type {
  FormattedTransaction,
  FormattedInstruction,
  FormattedInnerInstructionGroup,
  TokenBalance,
} from "./tx-formatter";
import type {
  StreamConfig,
  StreamEvent,
  SubscriptionPreset,
  SwapEvent,
  LargeSwapEvent,
} from "./types";
import {
  PROGRAM_TO_DEX,
  ALL_DEX_PROGRAM_IDS,
  PUMP_SWAP_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID,
  RAYDIUM_PROGRAM_IDS,
  METEORA_PROGRAM_IDS,
  OTHER_DEX_PROGRAM_IDS,
  PUMPSWAP_PROGRAM_IDS,
} from "./programs";

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULTS: Required<WsStreamConfig> = {
  rpcUrl: "",
  wsUrl: "",
  maxConcurrentFetches: 5,
  fetchDelayMs: 50,
  reconnectDelayMs: 5_000,
  maxReconnectDelayMs: 30_000,
  largeSwapThresholdSol: 10,
  logLevel: "info",
};

export interface WsStreamConfig {
  /** HTTP RPC endpoint for getTransaction calls (defaults to MAINNET_ENDPOINT env) */
  rpcUrl?: string;
  /** WebSocket RPC endpoint (auto-derived from rpcUrl if not set) */
  wsUrl?: string;
  /** Max concurrent getTransaction fetches */
  maxConcurrentFetches?: number;
  /** Delay between getTransaction calls (ms) to avoid rate limits */
  fetchDelayMs?: number;
  /** Reconnect delay (ms) */
  reconnectDelayMs?: number;
  /** Max reconnect delay (ms) */
  maxReconnectDelayMs?: number;
  /** Large swap threshold in SOL */
  largeSwapThresholdSol?: number;
  /** Log level */
  logLevel?: "silent" | "info" | "debug";
}

// ---------------------------------------------------------------------------
// WsEventStream class
// ---------------------------------------------------------------------------

export class WsEventStream extends EventEmitter {
  private config: Required<WsStreamConfig>;
  private running = false;
  private connection: Connection | null = null;
  private subscriptionIds: number[] = [];
  private reconnecting = false;
  private currentReconnectDelay: number;
  private currentPreset: SubscriptionPreset | null = null;
  private currentOpts: { wallets?: string[] } = {};

  // Dedup: skip signatures we've already processed (ring buffer)
  private processedSigs = new Set<string>();
  private processedSigsOrder: string[] = [];
  private maxProcessedSigs = 5000;

  // Fetch queue to rate-limit getTransaction calls
  private fetchQueue: string[] = [];
  private activeFetches = 0;
  private fetchTimer: ReturnType<typeof setInterval> | null = null;

  // Stats
  private txCount = 0;
  private eventCount = 0;
  private errorCount = 0;
  private startTime = 0;
  private latestSlot = 0;

  constructor(config: WsStreamConfig = {}) {
    super();
    this.config = {
      ...DEFAULTS,
      ...config,
      rpcUrl: config.rpcUrl || process.env.MAINNET_ENDPOINT || "",
      wsUrl: config.wsUrl || "",
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
    if (!this.config.rpcUrl) {
      throw new Error(
        "RPC URL not set. Add MAINNET_ENDPOINT to env or pass rpcUrl in config.",
      );
    }

    this.running = true;
    this.startTime = Date.now();
    this.currentPreset = preset;
    this.currentOpts = opts ?? {};

    this.log("info", `Starting WebSocket event stream (preset: ${preset})...`);
    await this.connect();
  }

  /**
   * Stop streaming and clean up.
   */
  async stop(): Promise<void> {
    this.running = false;
    await this.cleanup();
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
      uptimeMs: this.running ? Date.now() - this.startTime : 0,
    };
  }

  // -----------------------------------------------------------------------
  // Internal — connection management
  // -----------------------------------------------------------------------

  private async connect(): Promise<void> {
    if (!this.running) return;

    try {
      // Derive WebSocket URL from HTTP RPC if not provided
      const wsUrl = this.config.wsUrl || httpToWs(this.config.rpcUrl);

      this.connection = new Connection(this.config.rpcUrl, {
        wsEndpoint: wsUrl,
        commitment: "confirmed",
      });

      // Get program IDs for the preset
      const programIds = this.getPresetProgramIds();

      // Subscribe to logs for each program
      for (const programId of programIds) {
        try {
          const subId = this.connection.onLogs(
            new PublicKey(programId),
            (logs, ctx) => {
              if (logs.err) return; // skip failed txs
              this.latestSlot = ctx.slot;
              this.enqueueSignature(logs.signature);
            },
            "confirmed",
          );
          this.subscriptionIds.push(subId);
        } catch (err: any) {
          this.log("debug", `  [ws] failed to subscribe to ${PROGRAM_TO_DEX[programId] ?? programId}: ${err.message}`);
        }
      }

      this.log("info", `  Connected via WebSocket. Watching ${this.subscriptionIds.length} program(s)...`);

      // Start fetch queue processor
      this.fetchTimer = setInterval(() => this.processFetchQueue(), this.config.fetchDelayMs);

      // Reset reconnect delay on success
      this.currentReconnectDelay = this.config.reconnectDelayMs;
    } catch (err: any) {
      this.log("info", `  Connection failed: ${err.message}`);
      this.errorCount++;
      this.scheduleReconnect();
    }
  }

  private getPresetProgramIds(): string[] {
    switch (this.currentPreset) {
      case "all-dex-swaps":
        return ALL_DEX_PROGRAM_IDS;
      case "new-pools":
        return ALL_DEX_PROGRAM_IDS; // filter events after parsing
      case "pumpfun-bonding":
        return [PUMP_FUN_PROGRAM_ID];
      case "pumpswap":
        return PUMPSWAP_PROGRAM_IDS;
      case "raydium":
        return RAYDIUM_PROGRAM_IDS;
      case "meteora":
        return METEORA_PROGRAM_IDS;
      case "other-dexes":
        return OTHER_DEX_PROGRAM_IDS;
      case "wallet-trades":
        // For wallet-trades, subscribe to all DEX programs and filter by wallet in events
        return ALL_DEX_PROGRAM_IDS;
      default:
        return ALL_DEX_PROGRAM_IDS;
    }
  }

  private enqueueSignature(signature: string): void {
    // Dedup
    if (this.processedSigs.has(signature)) return;
    this.processedSigs.add(signature);
    this.processedSigsOrder.push(signature);

    // Evict oldest entries
    while (this.processedSigsOrder.length > this.maxProcessedSigs) {
      const old = this.processedSigsOrder.shift()!;
      this.processedSigs.delete(old);
    }

    this.fetchQueue.push(signature);
  }

  private async processFetchQueue(): Promise<void> {
    if (!this.running || !this.connection) return;
    if (this.fetchQueue.length === 0) return;
    if (this.activeFetches >= this.config.maxConcurrentFetches) return;

    const signature = this.fetchQueue.shift();
    if (!signature) return;

    this.activeFetches++;
    try {
      await this.fetchAndProcess(signature);
    } catch (err: any) {
      this.errorCount++;
      this.log("debug", `  [fetch error] ${signature.slice(0, 12)}: ${err.message}`);
    } finally {
      this.activeFetches--;
    }
  }

  private async fetchAndProcess(signature: string): Promise<void> {
    if (!this.connection) return;

    // Fetch full transaction with parsed JSON format
    const tx = await this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx || !tx.meta || tx.meta.err) return;

    this.txCount++;

    // Convert RPC response to FormattedTransaction
    const formatted = formatRpcTransaction(tx, signature);
    if (!formatted) return;

    // Skip if no inner instructions (no DEX interaction)
    if (formatted.innerInstructions.length === 0) return;

    // Parse into events
    const events = parseTransaction(formatted);

    // Apply preset filters
    const filteredEvents = this.filterEvents(events);

    // Emit each event
    for (const event of filteredEvents) {
      this.eventCount++;
      this.emit(event.type, event);
      this.emit("*", event);

      // Check for large swaps
      if (event.type === "Swap") {
        this.checkLargeSwap(event);
      }
    }
  }

  private filterEvents(events: StreamEvent[]): StreamEvent[] {
    // For new-pools preset, only emit NewPool events
    if (this.currentPreset === "new-pools") {
      return events.filter((e) => e.type === "NewPool");
    }
    // For wallet-trades, filter by wallet addresses
    if (this.currentPreset === "wallet-trades" && this.currentOpts.wallets?.length) {
      const walletSet = new Set(this.currentOpts.wallets);
      return events.filter((e) => {
        if (e.type === "Swap") return walletSet.has((e as SwapEvent).trader);
        return true;
      });
    }
    return events;
  }

  private checkLargeSwap(swap: SwapEvent): void {
    const solAmount = swap.direction === "buy" ? swap.amountIn : swap.amountOut;
    if (solAmount >= this.config.largeSwapThresholdSol) {
      const largeSwap: LargeSwapEvent = {
        type: "LargeSwap",
        swap,
        estimatedUsdValue: 0,
      };
      this.eventCount++;
      this.emit("LargeSwap", largeSwap);
      this.emit("*", largeSwap);
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
        this.log("info", "  Reconnected via WebSocket.");
      } catch (err: any) {
        this.log("info", `  Reconnect failed: ${err.message}`);
        this.currentReconnectDelay = Math.min(
          this.currentReconnectDelay * 2,
          this.config.maxReconnectDelayMs,
        );
        this.scheduleReconnect();
      }
    }, this.currentReconnectDelay);
  }

  private async cleanup(): Promise<void> {
    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }
    if (this.connection) {
      for (const subId of this.subscriptionIds) {
        try {
          await this.connection.removeOnLogsListener(subId);
        } catch { /* ignore cleanup errors */ }
      }
    }
    this.subscriptionIds = [];
    this.fetchQueue = [];
    this.connection = null;
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

// ---------------------------------------------------------------------------
// Convert Solana RPC getParsedTransaction response to FormattedTransaction
// ---------------------------------------------------------------------------

/**
 * Convert a Solana RPC ParsedTransactionWithMeta into our FormattedTransaction
 * format so the same parsers (parseTransaction) work for both gRPC and WebSocket.
 */
function formatRpcTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string,
): FormattedTransaction | null {
  try {
    const meta = tx.meta!;
    const message = tx.transaction.message;

    // Build account list from the message's account keys
    const accountList: PublicKey[] = message.accountKeys.map((ak) =>
      typeof ak === "string" ? new PublicKey(ak) : ak.pubkey,
    );

    // Add loaded addresses (v0 transactions)
    if (meta.loadedAddresses) {
      for (const addr of meta.loadedAddresses.writable) {
        accountList.push(addr);
      }
      for (const addr of meta.loadedAddresses.readonly) {
        accountList.push(addr);
      }
    }

    const signer = accountList.length > 0 ? accountList[0].toBase58() : "";

    // Convert instructions. getParsedTransaction returns ParsedInstruction | PartiallyDecodedInstruction
    // We need the raw (partially decoded) format for our parsers.
    const outerInstructions: FormattedInstruction[] = [];
    for (let i = 0; i < message.instructions.length; i++) {
      const ix = message.instructions[i] as any;
      const formatted = formatRpcInstruction(ix, accountList);
      if (formatted) outerInstructions.push(formatted);
    }

    // Inner instructions
    const innerInstructions: FormattedInnerInstructionGroup[] = [];
    if (meta.innerInstructions) {
      for (const group of meta.innerInstructions) {
        const instructions: FormattedInstruction[] = [];
        for (const ix of group.instructions) {
          const formatted = formatRpcInstruction(ix as any, accountList);
          if (formatted) instructions.push(formatted);
        }
        innerInstructions.push({ index: group.index, instructions });
      }
    }

    // Token balances
    const preTokenBalances = formatRpcTokenBalances(meta.preTokenBalances ?? []);
    const postTokenBalances = formatRpcTokenBalances(meta.postTokenBalances ?? []);

    return {
      signature,
      slot: tx.slot,
      timestamp: tx.blockTime ?? 0,
      accountList,
      signer,
      numSigners: message.accountKeys.filter((ak: any) => ak.signer).length || 1,
      failed: !!meta.err,
      outerInstructions,
      innerInstructions,
      preTokenBalances,
      postTokenBalances,
      preBalances: meta.preBalances ?? [],
      postBalances: meta.postBalances ?? [],
      logMessages: meta.logMessages ?? [],
    };
  } catch {
    return null;
  }
}

function formatRpcInstruction(
  ix: any,
  accountList: PublicKey[],
): FormattedInstruction | null {
  // ParsedInstruction (fully parsed by RPC) — we need raw data, so skip these
  // PartiallyDecodedInstruction has: programId, accounts, data (base58)
  if (ix.parsed) {
    // Fully parsed instruction (e.g., system transfer) — we can still extract program ID
    // but we don't have raw data. Create a minimal stub so program detection works.
    const programId = ix.program === "spl-token" ? "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" :
      ix.programId?.toBase58?.() ?? ix.programId ?? "";
    const pidIndex = accountList.findIndex((pk) => pk.toBase58() === programId);
    return {
      programIdIndex: pidIndex >= 0 ? pidIndex : 0,
      programId,
      accounts: [],
      data: Buffer.alloc(0),
    };
  }

  // PartiallyDecodedInstruction
  const programId = ix.programId?.toBase58?.() ?? ix.programId ?? "";
  const pidIndex = accountList.findIndex((pk) => pk.toBase58() === programId);

  // Convert account PublicKeys to indices
  const accounts: number[] = (ix.accounts ?? []).map((acct: any) => {
    const addr = acct?.toBase58?.() ?? acct;
    const idx = accountList.findIndex((pk) => pk.toBase58() === addr);
    return idx >= 0 ? idx : 0;
  });

  // Decode base58 instruction data
  let data: Buffer;
  if (typeof ix.data === "string") {
    try {
      // RPC returns base58-encoded data for PartiallyDecodedInstruction
      const bs58 = require("bs58");
      data = Buffer.from(bs58.decode(ix.data));
    } catch {
      data = Buffer.alloc(0);
    }
  } else if (Buffer.isBuffer(ix.data)) {
    data = ix.data;
  } else {
    data = Buffer.alloc(0);
  }

  return {
    programIdIndex: pidIndex >= 0 ? pidIndex : 0,
    programId,
    accounts,
    data,
  };
}

function formatRpcTokenBalances(balances: any[]): TokenBalance[] {
  return balances.map((b: any) => ({
    accountIndex: b.accountIndex ?? 0,
    mint: b.mint ?? "",
    owner: b.owner ?? "",
    uiAmount: b.uiTokenAmount?.uiAmount ?? 0,
    decimals: b.uiTokenAmount?.decimals ?? 0,
    amount: b.uiTokenAmount?.amount ?? "0",
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an HTTP RPC URL to its WebSocket equivalent */
function httpToWs(url: string): string {
  return url
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");
}
