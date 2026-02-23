/**
 * gRPC Oracle Keeper — pushes live DEX prices to Percolator perp markets.
 *
 * Uses Yellowstone gRPC (Geyser) account subscriptions instead of WebSocket.
 * More reliable for production — handles reconnects, supports processed commitment,
 * and works with dedicated gRPC endpoints (Triton, Helius, etc.).
 *
 * Reuses all pool decoders and price computation from ws-keeper.ts.
 *
 * Requirements:
 *   - GRPC_URL env var — Yellowstone gRPC endpoint (e.g. https://grpc.triton.one)
 *   - GRPC_XTOKEN env var — gRPC auth token
 *   - PRIVATE_KEY — oracle authority wallet
 *
 * Usage (programmatic):
 *   const keeper = new GrpcKeeper(config, { network: "devnet" });
 *   await keeper.start();
 *
 * Usage (CLI):
 *   outsmart perp grpc-keeper --pool <POOL> --market <MARKET> --dex raydium-cpmm [-n devnet]
 *   outsmart perp grpc-keeper --config ~/.outsmart/keeper.json
 */

import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { getWallet, getConnection, dev_connection } from "../../helpers/config";
import { PercolatorAdapter } from "./adapter";
import { type Network } from "./core/config/program-ids";
import type {
  DexType,
  KeeperPoolConfig,
  WsKeeperOptions,
} from "./ws-keeper";

// Re-export types for convenience
export type { DexType, KeeperPoolConfig };
export type GrpcKeeperOptions = WsKeeperOptions;

// Import pool decoders and price helpers from ws-keeper
// We dynamically import to avoid circular deps — ws-keeper is the source of truth
// for all decoder logic. The grpc-keeper only adds the gRPC transport layer.

// ---------------------------------------------------------------------------
// gRPC connection helpers
// ---------------------------------------------------------------------------

function getGrpcCredentials(): { url: string; xToken: string } {
  const url = process.env.GRPC_URL;
  const xToken = process.env.GRPC_XTOKEN ?? "";
  if (!url) {
    throw new Error(
      "GRPC_URL not set. Add your Yellowstone gRPC endpoint to env or ~/.outsmart/config.env"
    );
  }
  return { url, xToken };
}

function getNetworkConnection(network: Network): Connection {
  if (network === "devnet") {
    if (!dev_connection) {
      throw new Error("DEVNET_ENDPOINT not set. Add it to ~/.outsmart/config.env");
    }
    return dev_connection;
  }
  return getConnection();
}

// ---------------------------------------------------------------------------
// WSOL mint for base/quote detection
// ---------------------------------------------------------------------------

const WSOL_MINT = "So11111111111111111111111111111111111111112";

// ---------------------------------------------------------------------------
// Pool decoders — imported from ws-keeper at the module level
// These are pure functions so safe to import directly.
// ---------------------------------------------------------------------------

// We inline a dynamic import helper to get ws-keeper exports at runtime
async function loadWsKeeperModule() {
  return import("./ws-keeper");
}

// ---------------------------------------------------------------------------
// Vault-based pool info (same as ws-keeper)
// ---------------------------------------------------------------------------

interface VaultBasedPoolInfo {
  kind: "vault";
  vault0: PublicKey;
  vault1: PublicKey;
  mint0: PublicKey;
  mint1: PublicKey;
  decimals0: number;
  decimals1: number;
}

interface PoolStatePoolInfo {
  kind: "pool-state";
  mint0: PublicKey;
  mint1: PublicKey;
  decimals0: number;
  decimals1: number;
}

type PoolInfo = VaultBasedPoolInfo | PoolStatePoolInfo;

const VAULT_BASED_DEXES: DexType[] = [
  "raydium-cpmm",
  "raydium-amm-v4",
  "pumpswap",
];

// ---------------------------------------------------------------------------
// SPL Token balance parser
// ---------------------------------------------------------------------------

function parseSplTokenBalance(data: Buffer | Uint8Array): bigint {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf.readBigUInt64LE(64);
}

// ---------------------------------------------------------------------------
// Price computation helpers (duplicated from ws-keeper to avoid import issues)
// ---------------------------------------------------------------------------

function readU128LE(data: Buffer, offset: number): bigint {
  const lo = data.readBigUInt64LE(offset);
  const hi = data.readBigUInt64LE(offset + 8);
  return lo | (hi << 64n);
}

function sqrtPriceX64ToPrice(sqrtPriceX64: bigint, decBase: number, decQuote: number): number {
  const sqrtPrice = Number(sqrtPriceX64) / 2 ** 64;
  const price = sqrtPrice * sqrtPrice;
  return price * 10 ** (decBase - decQuote);
}

function vaultPrice(
  baseBalance: bigint,
  quoteBalance: bigint,
  baseDecimals: number,
  quoteDecimals: number,
): number {
  if (baseBalance === 0n) return 0;
  const base = Number(baseBalance) / 10 ** baseDecimals;
  const quote = Number(quoteBalance) / 10 ** quoteDecimals;
  return quote / base;
}

// ---------------------------------------------------------------------------
// Pool decoders (duplicated key functions to keep grpc-keeper self-contained)
// ---------------------------------------------------------------------------

function decodeCpmmPoolInfo(data: Buffer): VaultBasedPoolInfo {
  return {
    kind: "vault",
    vault0: new PublicKey(data.slice(72, 104)),
    vault1: new PublicKey(data.slice(104, 136)),
    mint0: new PublicKey(data.slice(168, 200)),
    mint1: new PublicKey(data.slice(200, 232)),
    decimals0: data.readUInt8(331),
    decimals1: data.readUInt8(332),
  };
}

function decodeAmmV4PoolInfo(data: Buffer): VaultBasedPoolInfo {
  if (data.length < 752) throw new Error(`AMM v4 data too short: ${data.length}`);
  return {
    kind: "vault",
    vault0: new PublicKey(data.slice(336, 368)),
    vault1: new PublicKey(data.slice(368, 400)),
    mint0: new PublicKey(data.slice(400, 432)),
    mint1: new PublicKey(data.slice(432, 464)),
    decimals0: Number(data.readBigUInt64LE(32) & 0xFFn),
    decimals1: Number(data.readBigUInt64LE(40) & 0xFFn),
  };
}

function decodePumpSwapPoolInfo(data: Buffer): VaultBasedPoolInfo {
  return {
    kind: "vault",
    vault0: new PublicKey(data.slice(139, 171)),
    vault1: new PublicKey(data.slice(171, 203)),
    mint0: new PublicKey(data.slice(43, 75)),
    mint1: new PublicKey(data.slice(75, 107)),
    decimals0: 6,
    decimals1: 9,
  };
}

function decodeClmmPoolInfo(data: Buffer): PoolStatePoolInfo {
  return {
    kind: "pool-state",
    mint0: new PublicKey(data.slice(73, 105)),
    mint1: new PublicKey(data.slice(105, 137)),
    decimals0: data.readUInt8(233),
    decimals1: data.readUInt8(234),
  };
}

function decodeLaunchLabPoolInfo(data: Buffer): PoolStatePoolInfo {
  if (data.length < 429) throw new Error(`LaunchLab data too short: ${data.length}`);
  return {
    kind: "pool-state",
    mint0: new PublicKey(data.slice(205, 237)),
    mint1: new PublicKey(data.slice(237, 269)),
    decimals0: data.readUInt8(18),
    decimals1: data.readUInt8(19),
  };
}

// ---------------------------------------------------------------------------
// Price extractors for pool-state-based DEXes
// ---------------------------------------------------------------------------

function clmmPriceFromData(data: Buffer, dec0: number, dec1: number): number {
  return sqrtPriceX64ToPrice(readU128LE(data, 253), dec0, dec1);
}

function launchLabPriceFromData(data: Buffer, decA: number, decB: number): number {
  const virtualA = data.readBigUInt64LE(37);
  const virtualB = data.readBigUInt64LE(45);
  if (virtualA === 0n) return 0;
  return (Number(virtualB) / Number(virtualA)) * 10 ** (decA - decB);
}

function dammV2PriceFromData(data: Buffer, decA: number, decB: number): number {
  return sqrtPriceX64ToPrice(readU128LE(data, 216), decA, decB);
}

function dbcPriceFromData(data: Buffer, baseDec: number, quoteDec: number): number {
  return sqrtPriceX64ToPrice(readU128LE(data, 256), baseDec, quoteDec);
}

// ---------------------------------------------------------------------------
// Watcher state per pool
// ---------------------------------------------------------------------------

interface GrpcWatcherState {
  config: KeeperPoolConfig;
  poolInfo: PoolInfo;
  lastPriceE6: bigint;
  connection: Connection;
  // Vault balances for vault-based pools
  vault0Balance: bigint;
  vault1Balance: bigint;
  baseIdx: number;
  // For DLMM
  dlmmPool?: any;
}

// ---------------------------------------------------------------------------
// GrpcKeeper — the main keeper class
// ---------------------------------------------------------------------------

export class GrpcKeeper {
  private pools: KeeperPoolConfig[];
  private opts: Required<GrpcKeeperOptions>;
  private adapter: PercolatorAdapter;
  private watchers: Map<string, GrpcWatcherState> = new Map();
  // Map from account pubkey → watcher key + role (vault0/vault1/pool)
  private accountToWatcher: Map<string, { watcherKey: string; role: "vault0" | "vault1" | "pool" }> = new Map();
  private running = false;
  private pushCount = 0;
  private errorCount = 0;
  private grpcStream: any = null;
  private grpcClient: any = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnecting = false;

  constructor(pools: KeeperPoolConfig[], opts: GrpcKeeperOptions = {}) {
    this.pools = pools;
    this.opts = {
      network: opts.network ?? "devnet",
      logLevel: opts.logLevel ?? "info",
      reconnectDelayMs: opts.reconnectDelayMs ?? 5_000,
    };
    this.adapter = new PercolatorAdapter();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async start(): Promise<void> {
    this.running = true;
    this.log("info", "Starting gRPC keeper...");
    this.log("info", `  ${this.pools.length} pool(s) configured`);

    // Initialize all watchers (fetch pool state, decode layouts)
    for (const poolCfg of this.pools) {
      try {
        await this.initWatcher(poolCfg);
      } catch (err: any) {
        this.log("info", `  SKIP ${poolCfg.pool.slice(0, 8)}... (${poolCfg.dex}): ${err.message}`);
        this.errorCount++;
      }
    }

    if (this.watchers.size === 0) {
      throw new Error("No watchers initialized — cannot start gRPC stream");
    }

    // Start gRPC subscription
    await this.connectGrpc();

    this.log("info", `  ${this.watchers.size} watcher(s) active. Listening via gRPC...`);
    this.log("info", "  Press Ctrl+C to stop.\n");
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.grpcStream) {
      try { this.grpcStream.cancel(); } catch {}
      this.grpcStream = null;
    }
    this.grpcClient = null;
    this.log("info", `\n  gRPC keeper stopped. ${this.pushCount} pushes, ${this.errorCount} errors.\n`);
  }

  getStats() {
    return {
      running: this.running,
      activeWatchers: this.watchers.size,
      pushCount: this.pushCount,
      errorCount: this.errorCount,
      transport: "grpc" as const,
    };
  }

  // -----------------------------------------------------------------------
  // Internal — gRPC connection
  // -----------------------------------------------------------------------

  private async connectGrpc(): Promise<void> {
    const { url, xToken } = getGrpcCredentials();
    const Client = (await import("@triton-one/yellowstone-grpc")).default;

    this.grpcClient = new Client(url, xToken, {
      "grpc.max_receive_message_length": 64 * 1024 * 1024,
    });

    const stream = await this.grpcClient.subscribe();
    this.grpcStream = stream;

    // Build subscription request — subscribe to all accounts we need to watch
    const accountSubscriptions: Record<string, any> = {};

    for (const [, entry] of this.accountToWatcher) {
      // Already added — accountToWatcher may have duplicates across watchers
    }

    // Collect unique accounts to subscribe to
    const accountPubkeys: string[] = [...this.accountToWatcher.keys()];

    if (accountPubkeys.length > 0) {
      accountSubscriptions["keeper_accounts"] = {
        account: accountPubkeys,
        owner: [],
        filters: [],
      };
    }

    const subscribeRequest = {
      accounts: accountSubscriptions,
      slots: {},
      transactions: {},
      transactionsStatus: {},
      blocks: {},
      blocksMeta: {},
      accountsDataSlice: [],
      entry: {},
      commitment: 1, // PROCESSED
    };

    // Write subscribe request
    await new Promise<void>((resolve, reject) => {
      stream.write(subscribeRequest, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.log("debug", `    subscribed to ${accountPubkeys.length} account(s) via gRPC`);

    // Set up data handler
    stream.on("data", (data: any) => {
      this.handleGrpcData(data).catch((err) => {
        this.log("info", `  [grpc data error] ${err.message}`);
        this.errorCount++;
      });
    });

    // Set up error/end handlers for auto-reconnect
    stream.on("error", (err: any) => {
      this.log("info", `  [grpc error] ${err.message}`);
      this.scheduleReconnect();
    });

    stream.on("end", () => {
      this.log("info", "  [grpc] stream ended");
      this.scheduleReconnect();
    });

    stream.on("close", () => {
      this.log("debug", "  [grpc] stream closed");
      this.scheduleReconnect();
    });

    // Ping keepalive every 10 seconds
    this.pingInterval = setInterval(() => {
      if (!this.running || !this.grpcStream) return;
      try {
        const pingRequest = {
          ping: { id: 1 },
          accounts: {},
          accountsDataSlice: [],
          transactions: {},
          transactionsStatus: {},
          blocks: {},
          blocksMeta: {},
          entry: {},
          slots: {},
        };
        this.grpcStream.write(pingRequest, () => {});
      } catch {
        this.scheduleReconnect();
      }
    }, 10_000);
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnecting) return;
    this.reconnecting = true;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.log("info", `  reconnecting in ${this.opts.reconnectDelayMs}ms...`);

    setTimeout(async () => {
      this.reconnecting = false;
      if (!this.running) return;
      try {
        await this.connectGrpc();
        this.log("info", "  reconnected to gRPC");
      } catch (err: any) {
        this.log("info", `  reconnect failed: ${err.message}`);
        this.scheduleReconnect();
      }
    }, this.opts.reconnectDelayMs);
  }

  // -----------------------------------------------------------------------
  // Internal — gRPC data handler
  // -----------------------------------------------------------------------

  private async handleGrpcData(data: any): Promise<void> {
    // Ignore pong responses
    if (data.pong) return;

    // Account update
    if (data.account?.account) {
      const account = data.account.account;
      const pubkey = Buffer.from(account.pubkey).toString("base64");

      // Convert pubkey from raw bytes to base58
      const pubkeyBase58 = new PublicKey(account.pubkey).toBase58();

      const mapping = this.accountToWatcher.get(pubkeyBase58);
      if (!mapping) return;

      const watcher = this.watchers.get(mapping.watcherKey);
      if (!watcher) return;

      const accountData = Buffer.from(account.data);

      if (mapping.role === "vault0" || mapping.role === "vault1") {
        // Vault balance update
        const balance = parseSplTokenBalance(accountData);
        if (mapping.role === "vault0") {
          watcher.vault0Balance = balance;
        } else {
          watcher.vault1Balance = balance;
        }
        const info = watcher.poolInfo as VaultBasedPoolInfo;
        const price = this.computeVaultPrice(watcher, info);
        await this.maybePushPrice(watcher, price);
      } else if (mapping.role === "pool") {
        // Pool state update
        const price = this.extractPoolStatePrice(watcher.config.dex, accountData, watcher.poolInfo as PoolStatePoolInfo);
        await this.maybePushPrice(watcher, price);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Internal — watcher initialization
  // -----------------------------------------------------------------------

  private async initWatcher(poolCfg: KeeperPoolConfig): Promise<void> {
    const network = poolCfg.network ?? this.opts.network;
    const connection = getNetworkConnection(network);
    const poolPk = new PublicKey(poolCfg.pool);
    const dex = poolCfg.dex;
    const key = `${poolCfg.pool}:${poolCfg.market}`;

    this.log("info", `  [${dex}] ${poolCfg.pool.slice(0, 8)}... → ${poolCfg.market.slice(0, 8)}... (${network})`);

    const poolAccount = await connection.getAccountInfo(poolPk);
    if (!poolAccount) throw new Error(`Pool account not found: ${poolCfg.pool}`);

    const poolData = poolAccount.data;
    let poolInfo: PoolInfo;
    let baseIdx = 0;

    if (VAULT_BASED_DEXES.includes(dex)) {
      poolInfo = this.decodeVaultBasedPool(dex, poolData);
      const vaultInfo = poolInfo as VaultBasedPoolInfo;

      // Determine base/quote orientation
      if (vaultInfo.mint0.toBase58() === WSOL_MINT) baseIdx = 1;

      // Fetch initial vault balances
      const [v0, v1] = await Promise.all([
        connection.getAccountInfo(vaultInfo.vault0),
        connection.getAccountInfo(vaultInfo.vault1),
      ]);
      if (!v0 || !v1) throw new Error("Vault account(s) not found");

      const watcher: GrpcWatcherState = {
        config: poolCfg,
        poolInfo,
        lastPriceE6: 0n,
        connection,
        vault0Balance: parseSplTokenBalance(v0.data),
        vault1Balance: parseSplTokenBalance(v1.data),
        baseIdx,
      };
      this.watchers.set(key, watcher);

      // Register vault accounts for gRPC subscription
      const vault0Str = vaultInfo.vault0.toBase58();
      const vault1Str = vaultInfo.vault1.toBase58();
      this.accountToWatcher.set(vault0Str, { watcherKey: key, role: "vault0" });
      this.accountToWatcher.set(vault1Str, { watcherKey: key, role: "vault1" });

      // Push initial price
      const initialPrice = this.computeVaultPrice(watcher, vaultInfo);
      await this.maybePushPrice(watcher, initialPrice);
    } else {
      poolInfo = await this.decodePoolStatePool(dex, poolData, connection, poolCfg.pool);

      const watcher: GrpcWatcherState = {
        config: poolCfg,
        poolInfo,
        lastPriceE6: 0n,
        connection,
        vault0Balance: 0n,
        vault1Balance: 0n,
        baseIdx: 0,
      };
      this.watchers.set(key, watcher);

      // Register pool account for gRPC subscription
      this.accountToWatcher.set(poolCfg.pool, { watcherKey: key, role: "pool" });

      // Push initial price
      if (dex === "meteora-dlmm") {
        const dlmmData = await this.initDlmmPool(connection, poolCfg.pool);
        watcher.dlmmPool = dlmmData.dlmmPool;
        const price = await this.getDlmmPrice(watcher);
        await this.maybePushPrice(watcher, price);
      } else {
        const price = this.extractPoolStatePrice(dex, poolData, poolInfo as PoolStatePoolInfo);
        await this.maybePushPrice(watcher, price);
      }
    }
  }

  private decodeVaultBasedPool(dex: DexType, data: Buffer): VaultBasedPoolInfo {
    switch (dex) {
      case "raydium-cpmm": return decodeCpmmPoolInfo(data);
      case "raydium-amm-v4": return decodeAmmV4PoolInfo(data);
      case "pumpswap": return decodePumpSwapPoolInfo(data);
      default: throw new Error(`Not a vault-based DEX: ${dex}`);
    }
  }

  private async decodePoolStatePool(
    dex: DexType,
    data: Buffer,
    connection: Connection,
    poolAddress: string,
  ): Promise<PoolStatePoolInfo> {
    switch (dex) {
      case "raydium-clmm":
        return decodeClmmPoolInfo(data);
      case "raydium-launchlab":
        return decodeLaunchLabPoolInfo(data);
      case "meteora-damm-v2": {
        const mint0 = new PublicKey(data.slice(56, 88));
        const mint1 = new PublicKey(data.slice(88, 120));
        const [dec0, dec1] = await this.fetchMintDecimals(connection, mint0, mint1);
        return { kind: "pool-state", mint0, mint1, decimals0: dec0, decimals1: dec1 };
      }
      case "meteora-dbc": {
        const baseMint = new PublicKey(data.slice(112, 144));
        const quoteVaultPk = new PublicKey(data.slice(176, 208));
        const quoteVaultAccount = await connection.getAccountInfo(quoteVaultPk);
        if (!quoteVaultAccount) throw new Error("DBC quote vault not found");
        const quoteMint = new PublicKey(quoteVaultAccount.data.slice(0, 32));
        const [dec0, dec1] = await this.fetchMintDecimals(connection, baseMint, quoteMint);
        return { kind: "pool-state", mint0: baseMint, mint1: quoteMint, decimals0: dec0, decimals1: dec1 };
      }
      case "meteora-dlmm": {
        const dlmmInfo = await this.initDlmmPool(connection, poolAddress);
        return {
          kind: "pool-state",
          mint0: dlmmInfo.mint0,
          mint1: dlmmInfo.mint1,
          decimals0: dlmmInfo.decimals0,
          decimals1: dlmmInfo.decimals1,
        };
      }
      default:
        throw new Error(`Unknown pool-state DEX: ${dex}`);
    }
  }

  private async fetchMintDecimals(connection: Connection, mint0: PublicKey, mint1: PublicKey): Promise<[number, number]> {
    const [info0, info1] = await Promise.all([
      connection.getAccountInfo(mint0),
      connection.getAccountInfo(mint1),
    ]);
    if (!info0) throw new Error(`Mint not found: ${mint0.toBase58()}`);
    if (!info1) throw new Error(`Mint not found: ${mint1.toBase58()}`);
    return [info0.data.readUInt8(44), info1.data.readUInt8(44)];
  }

  private async initDlmmPool(connection: Connection, poolAddress: string) {
    const DLMM = (await import("@meteora-ag/dlmm")).default;
    const poolPk = new PublicKey(poolAddress);
    const dlmmPool = await DLMM.create(connection, poolPk);
    return {
      dlmmPool,
      mint0: dlmmPool.tokenX.publicKey,
      mint1: dlmmPool.tokenY.publicKey,
      decimals0: Number(dlmmPool.tokenX.mint.decimals),
      decimals1: Number(dlmmPool.tokenY.mint.decimals),
    };
  }

  // -----------------------------------------------------------------------
  // Internal — price computation
  // -----------------------------------------------------------------------

  private computeVaultPrice(watcher: GrpcWatcherState, info: VaultBasedPoolInfo): number {
    const baseBalance = watcher.baseIdx === 0 ? watcher.vault0Balance : watcher.vault1Balance;
    const quoteBalance = watcher.baseIdx === 0 ? watcher.vault1Balance : watcher.vault0Balance;
    const baseDec = watcher.baseIdx === 0 ? info.decimals0 : info.decimals1;
    const quoteDec = watcher.baseIdx === 0 ? info.decimals1 : info.decimals0;
    return vaultPrice(baseBalance, quoteBalance, baseDec, quoteDec);
  }

  private extractPoolStatePrice(dex: DexType, data: Buffer, info: PoolStatePoolInfo): number {
    switch (dex) {
      case "raydium-clmm": return clmmPriceFromData(data, info.decimals0, info.decimals1);
      case "raydium-launchlab": return launchLabPriceFromData(data, info.decimals0, info.decimals1);
      case "meteora-damm-v2": return dammV2PriceFromData(data, info.decimals0, info.decimals1);
      case "meteora-dbc": return dbcPriceFromData(data, info.decimals0, info.decimals1);
      default: throw new Error(`No pool-state price extractor for: ${dex}`);
    }
  }

  private async getDlmmPrice(watcher: GrpcWatcherState): Promise<number> {
    if (!watcher.dlmmPool) throw new Error("DLMM pool not initialized");
    const info = watcher.poolInfo as PoolStatePoolInfo;
    const { price: rawPrice } = await watcher.dlmmPool.getActiveBin();
    const priceFactor = Math.pow(10, info.decimals1 - info.decimals0);
    return Number(rawPrice) / priceFactor;
  }

  // -----------------------------------------------------------------------
  // Internal — dedup + push
  // -----------------------------------------------------------------------

  private async maybePushPrice(watcher: GrpcWatcherState, price: number): Promise<void> {
    if (!this.running) return;
    if (price <= 0 || !isFinite(price)) return;

    const priceE6 = BigInt(Math.round(price * 1e6));
    if (priceE6 === watcher.lastPriceE6) {
      this.log("debug", `  [${watcher.config.dex}] $${price.toFixed(6)} (unchanged, skip)`);
      return;
    }

    const network = watcher.config.network ?? this.opts.network;
    const ts = new Date().toLocaleTimeString();

    try {
      await this.adapter.pushOraclePrice(watcher.config.market, priceE6, network);
      await this.adapter.crank(watcher.config.market, network);

      watcher.lastPriceE6 = priceE6;
      this.pushCount++;
      this.log("info", `  [${ts}] ${watcher.config.dex} $${price.toFixed(6)} → ${watcher.config.market.slice(0, 8)}... (push #${this.pushCount})`);
    } catch (err: any) {
      this.errorCount++;
      this.log("info", `  [${ts}] PUSH ERROR: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // Internal — logging
  // -----------------------------------------------------------------------

  private log(level: "info" | "debug", msg: string): void {
    if (this.opts.logLevel === "silent") return;
    if (level === "debug" && this.opts.logLevel !== "debug") return;
    console.log(msg);
  }
}
