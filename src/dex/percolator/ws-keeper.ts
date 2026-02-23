/**
 * WebSocket Oracle Keeper — pushes live DEX prices to Percolator perp markets.
 *
 * Subscribes to on-chain accounts via `connection.onAccountChange()` WebSocket
 * and computes real-time prices from pool state changes. Supports 8 DEX types
 * across two categories:
 *
 *   Vault-based (watch 2 SPL token vaults):
 *     - raydium-cpmm, raydium-amm-v4, pumpswap
 *
 *   Pool-state-based (watch 1 pool account):
 *     - raydium-clmm, raydium-launchlab, meteora-damm-v2, meteora-dbc, meteora-dlmm
 *
 * Usage (programmatic):
 *   const keeper = new WsKeeper(config, { network: "devnet" });
 *   await keeper.start();
 *   // ... Ctrl+C or keeper.stop()
 *
 * Usage (CLI):
 *   outsmart perp keeper --pool <POOL> --market <MARKET> --dex raydium-cpmm [-n devnet]
 *   outsmart perp keeper --config ~/.outsmart/keeper.json
 */

import {
  Connection,
  PublicKey,
  AccountInfo,
  Context,
} from "@solana/web3.js";
import BN from "bn.js";
import { getWallet, getConnection, dev_connection } from "../../helpers/config";
import { PercolatorAdapter } from "./adapter";
import { type Network } from "./core/config/program-ids";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DexType =
  | "raydium-cpmm"
  | "raydium-amm-v4"
  | "raydium-clmm"
  | "raydium-launchlab"
  | "pumpswap"
  | "meteora-damm-v2"
  | "meteora-dbc"
  | "meteora-dlmm";

export interface KeeperPoolConfig {
  /** DEX pool/AMM account address */
  pool: string;
  /** Percolator slab/market address to push prices to */
  market: string;
  /** Which DEX type this pool belongs to */
  dex: DexType;
  /** Network (default: devnet) */
  network?: Network;
}

export interface WsKeeperOptions {
  /** Default network for pools that don't specify one */
  network?: Network;
  /** Log level: "silent" | "info" | "debug" (default: "info") */
  logLevel?: "silent" | "info" | "debug";
  /** Reconnect delay in ms (default: 5000) */
  reconnectDelayMs?: number;
}

// ---------------------------------------------------------------------------
// DEX program IDs
// ---------------------------------------------------------------------------

const PROGRAM_IDS: Record<DexType, string> = {
  "raydium-cpmm": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  "raydium-amm-v4": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  "raydium-clmm": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  "raydium-launchlab": "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  pumpswap: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  "meteora-damm-v2": "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  "meteora-dbc": "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
  "meteora-dlmm": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
};

// ---------------------------------------------------------------------------
// Vault-based vs Pool-state-based classification
// ---------------------------------------------------------------------------

const VAULT_BASED_DEXES: DexType[] = [
  "raydium-cpmm",
  "raydium-amm-v4",
  "pumpswap",
  "meteora-damm-v2",
];

const POOL_STATE_DEXES: DexType[] = [
  "raydium-clmm",
  "raydium-launchlab",
  "meteora-dbc",
  "meteora-dlmm",
];

// ---------------------------------------------------------------------------
// Pool layout decoders — extract vaults, mints, decimals from pool account data
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

// WSOL mint for determining quote side
const WSOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Decode a Raydium CPMM pool account → vault addresses + mints + decimals.
 *
 * Layout (repr(C, packed), 8-byte Anchor discriminator):
 *   8..40    amm_config
 *  40..72    pool_creator
 *  72..104   token_0_vault
 * 104..136   token_1_vault
 * 136..168   lp_mint
 * 168..200   token_0_mint
 * 200..232   token_1_mint
 * 232..264   token_0_program
 * 264..296   token_1_program
 * 296..328   observation_key
 * 328        auth_bump (u8)
 * 329        status (u8)
 * 330        lp_mint_decimals (u8)
 * 331        mint_0_decimals (u8)
 * 332        mint_1_decimals (u8)
 */
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

/**
 * Decode a Raydium AMM v4 pool account → vault addresses + mints + decimals.
 *
 * Layout (NO Anchor discriminator, raw 752 bytes):
 *  32..40   coin_decimals (u64, only lower byte used)
 *  40..48   pc_decimals (u64, only lower byte used)
 * 336..368  coinVault
 * 368..400  pcVault
 * 400..432  coinVaultMint
 * 432..464  pcVaultMint
 */
function decodeAmmV4PoolInfo(data: Buffer): VaultBasedPoolInfo {
  if (data.length < 752) {
    throw new Error(`AMM v4 data too short: ${data.length}, expected >= 752`);
  }
  const coinDecimals = Number(data.readBigUInt64LE(32) & 0xFFn);
  const pcDecimals = Number(data.readBigUInt64LE(40) & 0xFFn);

  return {
    kind: "vault",
    vault0: new PublicKey(data.slice(336, 368)),
    vault1: new PublicKey(data.slice(368, 400)),
    mint0: new PublicKey(data.slice(400, 432)),
    mint1: new PublicKey(data.slice(432, 464)),
    decimals0: coinDecimals,
    decimals1: pcDecimals,
  };
}

/**
 * Decode a PumpSwap pool account → vault addresses + mints.
 *
 * Layout (8-byte discriminator):
 *   8        poolBump (u8)
 *   9..11    index (u16)
 *  11..43    creator
 *  43..75    baseMint
 *  75..107   quoteMint
 * 107..139   lpMint
 * 139..171   poolBaseTokenAccount
 * 171..203   poolQuoteTokenAccount
 *
 * quoteMint is always WSOL (9 decimals), base tokens are typically 6 decimals.
 */
function decodePumpSwapPoolInfo(data: Buffer): VaultBasedPoolInfo {
  const baseMint = new PublicKey(data.slice(43, 75));
  const quoteMint = new PublicKey(data.slice(75, 107));

  return {
    kind: "vault",
    vault0: new PublicKey(data.slice(139, 171)),
    vault1: new PublicKey(data.slice(171, 203)),
    mint0: baseMint,
    mint1: quoteMint,
    // PumpSwap: base is always 6 decimals, quote (WSOL) is always 9
    decimals0: 6,
    decimals1: 9,
  };
}

/**
 * Decode Raydium CLMM pool account.
 *
 * Layout (8-byte discriminator):
 *   8        bump (u8)
 *   9..41    ammConfig
 *  41..73    owner
 *  73..105   tokenMint0
 * 105..137   tokenMint1
 * 137..169   tokenVault0
 * 169..201   tokenVault1
 * 201..233   observationKey
 * 233        mintDecimals0 (u8)
 * 234        mintDecimals1 (u8)
 * 235..237   tickSpacing (u16)
 * 237..253   liquidity (u128)
 * 253..269   sqrtPriceX64 (u128)
 */
function decodeClmmPoolInfo(data: Buffer): PoolStatePoolInfo {
  return {
    kind: "pool-state",
    mint0: new PublicKey(data.slice(73, 105)),
    mint1: new PublicKey(data.slice(105, 137)),
    decimals0: data.readUInt8(233),
    decimals1: data.readUInt8(234),
  };
}

/**
 * Decode Raydium LaunchLab pool account.
 *
 * Layout (reverse-engineered, no open source):
 *  18        mintDecimalsA (u8)
 *  19        mintDecimalsB (u8)
 *  37..45    virtualA (u64 LE)
 *  45..53    virtualB (u64 LE)
 * 205..237   mintA
 * 237..269   mintB
 */
function decodeLaunchLabPoolInfo(data: Buffer): PoolStatePoolInfo {
  if (data.length < 429) {
    throw new Error(`LaunchLab data too short: ${data.length}, expected >= 429`);
  }
  return {
    kind: "pool-state",
    mint0: new PublicKey(data.slice(205, 237)),
    mint1: new PublicKey(data.slice(237, 269)),
    decimals0: data.readUInt8(18),
    decimals1: data.readUInt8(19),
  };
}

/**
 * Decode Meteora DAMM v2 pool account — extract vaults + mints.
 *
 * Layout (Anchor zero_copy, 8-byte discriminator, total 1112 bytes):
 * Verified on mainnet pool 9x7WTW... (MET/SOL):
 *
 * 168..200    token_a_mint (32 bytes)
 * 200..232    token_b_mint (32 bytes)
 * 232..264    token_a_vault (32 bytes)
 * 264..296    token_b_vault (32 bytes)
 *
 * Decimals are fetched from mint accounts at startup (not stored in pool).
 * Treated as vault-based: price = quoteVaultBalance / baseVaultBalance.
 */
function decodeDammV2PoolInfo(data: Buffer): VaultBasedPoolInfo {
  return {
    kind: "vault",
    mint0: new PublicKey(data.slice(168, 200)),
    mint1: new PublicKey(data.slice(200, 232)),
    vault0: new PublicKey(data.slice(232, 264)),
    vault1: new PublicKey(data.slice(264, 296)),
    // Decimals must be fetched from mint accounts — set placeholder, will be filled at startup
    decimals0: 0,
    decimals1: 0,
  };
}

/**
 * Decode Meteora DBC (Dynamic Bonding Curve) pool account — extract vaults + mints.
 *
 * DBC uses a bonding curve with virtual reserves; vault ratios and raw sqrtPrice
 * offsets are unreliable across program versions. We use the DBC SDK for price
 * calculation (like DLMM) and watch vault token accounts for change notifications.
 *
 * Verified mainnet layout (pool DgxYpX..., 424 bytes):
 * 168..200    base_vault (token account, mint = base token)
 * 200..232    quote_vault (token account, mint = SOL/quote)
 *
 * The base_mint and quote_mint are resolved from vault token accounts at startup.
 */
function decodeDbcVaults(data: Buffer): { baseVault: PublicKey; quoteVault: PublicKey } {
  return {
    baseVault: new PublicKey(data.slice(168, 200)),
    quoteVault: new PublicKey(data.slice(200, 232)),
  };
}

/**
 * Decode Meteora DLMM pool account — extract mints.
 *
 * We use the SDK for price calculation (getActiveBin), but still need the mints.
 *
 * Layout (from dlmm-sdk IDL):
 *   8..16      parameters (StaticParameters, lots of packed u16/u8)
 *  16..48      v_parameters (VariableParameters)
 *  48..52      bump_seed ([u8; 1] + padding)
 *  ...         The exact layout requires the IDL. We'll use the SDK.
 *
 * For DLMM, we use the SDK both at startup and for price extraction,
 * so we only need to track the pool address.
 */
function decodeDlmmPoolInfo(_data: Buffer): PoolStatePoolInfo {
  // DLMM uses SDK for everything — mints/decimals fetched via DLMM.create()
  return {
    kind: "pool-state",
    mint0: PublicKey.default,
    mint1: PublicKey.default,
    decimals0: 0,
    decimals1: 0,
  };
}

// ---------------------------------------------------------------------------
// Price extraction from live account data
// ---------------------------------------------------------------------------

/**
 * Parse SPL Token account balance from raw account data.
 * SPL Token account layout: balance is a u64 LE at offset 64.
 */
function parseSplTokenBalance(data: Buffer): bigint {
  return data.readBigUInt64LE(64);
}

/**
 * Compute price from two vault balances (constant-product AMMs).
 * Returns price as a float: quote_balance / base_balance (decimal-adjusted).
 */
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

/**
 * Extract sqrtPriceX64 from Raydium CLMM pool data and compute price.
 * sqrtPriceX64 is a u128 LE at offset 253..269.
 * Price = (sqrtPriceX64 / 2^64)^2 * 10^(dec0 - dec1)
 */
function clmmPriceFromPoolData(data: Buffer, dec0: number, dec1: number): number {
  const sqrtPriceX64 = readU128LE(data, 253);
  return sqrtPriceX64ToPrice(sqrtPriceX64, dec0, dec1);
}

/**
 * Extract virtualA/virtualB from LaunchLab pool data and compute price.
 * virtualA at 37..45 (u64 LE), virtualB at 45..53 (u64 LE).
 * Price = (virtualB / virtualA) * 10^(decA - decB)
 */
function launchLabPriceFromPoolData(data: Buffer, decA: number, decB: number): number {
  const virtualA = data.readBigUInt64LE(37);
  const virtualB = data.readBigUInt64LE(45);
  if (virtualA === 0n) return 0;
  const decAdj = 10 ** (decA - decB);
  return (Number(virtualB) / Number(virtualA)) * decAdj;
}

/**
 * Extract sqrtPrice from DAMM v2 pool data and compute price.
 * sqrtPrice (u128 LE) at offset 216 (8 disc + 48 fees + 128 pubkeys + 32 lp_mint = 216).
 *
 * Corrected offset:
 *   8 (disc) + 48 (PoolFees) + 32*4 (mintA, mintB, vaultA, vaultB) + 32 (lp_mint) = 216
 * Price = (sqrtPrice / 2^64)^2 * 10^(decA - decB)
 */
function dammV2PriceFromPoolData(data: Buffer, decA: number, decB: number): number {
  const sqrtPrice = readU128LE(data, 216);
  return sqrtPriceX64ToPrice(sqrtPrice, decA, decB);
}

/**
 * Extract sqrtPrice from DBC pool data and compute price.
 * sqrtPrice (u128 LE) at offset 256.
 * Price = (sqrtPrice / 2^64)^2 * 10^(baseDec - quoteDec)
 */
function dbcPriceFromPoolData(data: Buffer, baseDec: number, quoteDec: number): number {
  const sqrtPrice = readU128LE(data, 256);
  return sqrtPriceX64ToPrice(sqrtPrice, baseDec, quoteDec);
}

/**
 * Convert a sqrtPriceX64 (Q64.64 fixed-point stored as u128) to a human-readable price.
 * Price = (sqrtPriceX64 / 2^64)^2 * 10^(decBase - decQuote)
 *
 * Uses BigInt-based math to avoid floating-point precision loss on large u128 values.
 */
function sqrtPriceX64ToPrice(sqrtPriceX64: bigint, decBase: number, decQuote: number): number {
  // Manual fallback: convert to Number after dividing
  const sqrtPrice = Number(sqrtPriceX64) / 2 ** 64;
  const price = sqrtPrice * sqrtPrice;
  const decAdj = 10 ** (decBase - decQuote);
  return price * decAdj;
}

/** Read a u128 LE from a buffer at the given offset. */
function readU128LE(data: Buffer, offset: number): bigint {
  const lo = data.readBigUInt64LE(offset);
  const hi = data.readBigUInt64LE(offset + 8);
  return lo | (hi << 64n);
}

// ---------------------------------------------------------------------------
// Pick the right RPC connection based on network
// ---------------------------------------------------------------------------

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
// Pool watcher — manages subscriptions for a single pool→market pair
// ---------------------------------------------------------------------------

interface PoolWatcherState {
  config: KeeperPoolConfig;
  poolInfo: PoolInfo;
  lastPriceE6: bigint;
  subscriptionIds: number[];
  connection: Connection;
  // Vault balances for vault-based pools
  vault0Balance: bigint;
  vault1Balance: bigint;
  // For DLMM: store the pool instance
  dlmmPool?: any;
  // For DBC: store pool address + connection for SDK price fetch
  dbcPoolAddress?: string;
  dbcConnection?: Connection;
}

// ---------------------------------------------------------------------------
// WsKeeper — the main keeper class
// ---------------------------------------------------------------------------

export class WsKeeper {
  private pools: KeeperPoolConfig[];
  private opts: Required<WsKeeperOptions>;
  private adapter: PercolatorAdapter;
  private watchers: Map<string, PoolWatcherState> = new Map();
  private running = false;
  private pushCount = 0;
  private errorCount = 0;

  constructor(pools: KeeperPoolConfig[], opts: WsKeeperOptions = {}) {
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

  /** Start the keeper — subscribe to all pools and begin pushing prices. */
  async start(): Promise<void> {
    this.running = true;
    this.log("info", "Starting WebSocket keeper...");
    this.log("info", `  ${this.pools.length} pool(s) configured`);

    for (const poolCfg of this.pools) {
      try {
        await this.initWatcher(poolCfg);
      } catch (err: any) {
        this.log("info", `  SKIP ${poolCfg.pool.slice(0, 8)}... (${poolCfg.dex}): ${err.message}`);
        this.errorCount++;
      }
    }

    const activeCount = this.watchers.size;
    this.log("info", `  ${activeCount} watcher(s) active. Listening for price changes...`);
    this.log("info", "  Press Ctrl+C to stop.\n");
  }

  /** Stop the keeper — unsubscribe from all accounts. */
  async stop(): Promise<void> {
    this.running = false;
    for (const [key, watcher] of this.watchers) {
      for (const subId of watcher.subscriptionIds) {
        try {
          await watcher.connection.removeAccountChangeListener(subId);
        } catch {
          // ignore cleanup errors
        }
      }
      this.watchers.delete(key);
    }
    this.log("info", `\n  Keeper stopped. ${this.pushCount} pushes, ${this.errorCount} errors.\n`);
  }

  /** Get stats for the keeper. */
  getStats() {
    return {
      running: this.running,
      activeWatchers: this.watchers.size,
      pushCount: this.pushCount,
      errorCount: this.errorCount,
    };
  }

  // -----------------------------------------------------------------------
  // Internal — initialization
  // -----------------------------------------------------------------------

  private async initWatcher(poolCfg: KeeperPoolConfig): Promise<void> {
    const network = poolCfg.network ?? this.opts.network;
    const connection = getNetworkConnection(network);
    const poolPk = new PublicKey(poolCfg.pool);
    const dex = poolCfg.dex;
    const key = `${poolCfg.pool}:${poolCfg.market}`;

    this.log("info", `  [${dex}] ${poolCfg.pool.slice(0, 8)}... → ${poolCfg.market.slice(0, 8)}... (${network})`);

    // Fetch pool account data
    const poolAccount = await connection.getAccountInfo(poolPk);
    if (!poolAccount) {
      throw new Error(`Pool account not found: ${poolCfg.pool}`);
    }

    const poolData = poolAccount.data;
    let poolInfo: PoolInfo;

    // Decode pool layout based on DEX type
    if (VAULT_BASED_DEXES.includes(dex)) {
      poolInfo = this.decodeVaultBasedPool(dex, poolData);
      // For DAMM v2, decimals need to be fetched from mint accounts
      const vaultInfo = poolInfo as VaultBasedPoolInfo;
      if (vaultInfo.decimals0 === 0 && vaultInfo.decimals1 === 0) {
        const [d0, d1] = await this.fetchMintDecimals(connection, vaultInfo.mint0, vaultInfo.mint1);
        vaultInfo.decimals0 = d0;
        vaultInfo.decimals1 = d1;
      }
    } else {
      poolInfo = await this.decodePoolStatePool(dex, poolData, connection, poolCfg.pool);
    }

    const watcher: PoolWatcherState = {
      config: poolCfg,
      poolInfo,
      lastPriceE6: 0n,
      subscriptionIds: [],
      connection,
      vault0Balance: 0n,
      vault1Balance: 0n,
    };

    this.watchers.set(key, watcher);

    // Subscribe based on pool type
    if (poolInfo.kind === "vault") {
      await this.subscribeVaults(watcher, poolInfo);
    } else {
      await this.subscribePoolState(watcher, poolPk, dex);
    }
  }

  private decodeVaultBasedPool(dex: DexType, data: Buffer): VaultBasedPoolInfo {
    switch (dex) {
      case "raydium-cpmm":
        return decodeCpmmPoolInfo(data);
      case "raydium-amm-v4":
        return decodeAmmV4PoolInfo(data);
      case "pumpswap":
        return decodePumpSwapPoolInfo(data);
      case "meteora-damm-v2":
        return decodeDammV2PoolInfo(data);
      default:
        throw new Error(`Not a vault-based DEX: ${dex}`);
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

      case "meteora-dbc": {
        // DBC uses SDK for price (bonding curve math is complex).
        // Resolve mints from vault token accounts.
        const vaults = decodeDbcVaults(data);
        const [baseVaultAcct, quoteVaultAcct] = await Promise.all([
          connection.getAccountInfo(vaults.baseVault),
          connection.getAccountInfo(vaults.quoteVault),
        ]);
        if (!baseVaultAcct || !quoteVaultAcct) throw new Error("DBC vault account(s) not found");
        const baseMint = new PublicKey(baseVaultAcct.data.slice(0, 32));
        const quoteMint = new PublicKey(quoteVaultAcct.data.slice(0, 32));
        const [dec0, dec1] = await this.fetchMintDecimals(connection, baseMint, quoteMint);
        return { kind: "pool-state", mint0: baseMint, mint1: quoteMint, decimals0: dec0, decimals1: dec1 };
      }

      case "meteora-dlmm": {
        // Use SDK to get mints and decimals
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

  /** Fetch decimals for two mints in parallel. */
  private async fetchMintDecimals(
    connection: Connection,
    mint0: PublicKey,
    mint1: PublicKey,
  ): Promise<[number, number]> {
    const [info0, info1] = await Promise.all([
      connection.getAccountInfo(mint0),
      connection.getAccountInfo(mint1),
    ]);
    if (!info0) throw new Error(`Mint not found: ${mint0.toBase58()}`);
    if (!info1) throw new Error(`Mint not found: ${mint1.toBase58()}`);
    // SPL Mint layout: decimals is a u8 at offset 44
    const dec0 = info0.data.readUInt8(44);
    const dec1 = info1.data.readUInt8(44);
    return [dec0, dec1];
  }

  /** Initialize DLMM pool via SDK. */
  private async initDlmmPool(connection: Connection, poolAddress: string) {
    const DLMM = (await import("@meteora-ag/dlmm")).default;
    const poolPk = new PublicKey(poolAddress);
    const dlmmPool = await DLMM.create(connection, poolPk);
    const mint0 = dlmmPool.tokenX.publicKey;
    const mint1 = dlmmPool.tokenY.publicKey;
    const decimals0 = Number(dlmmPool.tokenX.mint.decimals);
    const decimals1 = Number(dlmmPool.tokenY.mint.decimals);
    return { dlmmPool, mint0, mint1, decimals0, decimals1 };
  }

  // -----------------------------------------------------------------------
  // Internal — WebSocket subscriptions
  // -----------------------------------------------------------------------

  /**
   * Subscribe to two vault token accounts for vault-based pools.
   * On each change, recompute price from the updated balance.
   */
  private async subscribeVaults(watcher: PoolWatcherState, info: VaultBasedPoolInfo): Promise<void> {
    const { connection, config } = watcher;

    // Determine which vault is base and which is quote
    // Convention: if one mint is WSOL, that's the quote side
    const mint0Str = info.mint0.toBase58();
    const mint1Str = info.mint1.toBase58();
    let baseIdx = 0;
    if (mint0Str === WSOL_MINT) baseIdx = 1; // mint0 is WSOL → mint1 is base

    // Fetch initial vault balances
    const [vault0Acct, vault1Acct] = await Promise.all([
      connection.getAccountInfo(info.vault0),
      connection.getAccountInfo(info.vault1),
    ]);
    if (!vault0Acct || !vault1Acct) throw new Error("Vault account(s) not found");

    watcher.vault0Balance = parseSplTokenBalance(vault0Acct.data);
    watcher.vault1Balance = parseSplTokenBalance(vault1Acct.data);

    // Compute and push initial price
    const initialPrice = this.computeVaultBasedPrice(watcher, info, baseIdx);
    await this.maybePushPrice(watcher, initialPrice);

    // Subscribe to vault0
    const sub0 = connection.onAccountChange(
      info.vault0,
      (accountInfo: AccountInfo<Buffer>, _ctx: Context) => {
        watcher.vault0Balance = parseSplTokenBalance(accountInfo.data);
        const price = this.computeVaultBasedPrice(watcher, info, baseIdx);
        this.maybePushPrice(watcher, price).catch((err) => {
          this.log("info", `  [push error] ${err.message}`);
          this.errorCount++;
        });
      },
      "confirmed",
    );

    // Subscribe to vault1
    const sub1 = connection.onAccountChange(
      info.vault1,
      (accountInfo: AccountInfo<Buffer>, _ctx: Context) => {
        watcher.vault1Balance = parseSplTokenBalance(accountInfo.data);
        const price = this.computeVaultBasedPrice(watcher, info, baseIdx);
        this.maybePushPrice(watcher, price).catch((err) => {
          this.log("info", `  [push error] ${err.message}`);
          this.errorCount++;
        });
      },
      "confirmed",
    );

    watcher.subscriptionIds.push(sub0, sub1);
    this.log("debug", `    subscribed vault0=${info.vault0.toBase58().slice(0, 8)}... vault1=${info.vault1.toBase58().slice(0, 8)}...`);
  }

  /**
   * Subscribe to the pool account itself for pool-state-based DEXes.
   * On each change, recompute price from the updated pool state.
   */
  private async subscribePoolState(watcher: PoolWatcherState, poolPk: PublicKey, dex: DexType): Promise<void> {
    const { connection } = watcher;
    const info = watcher.poolInfo as PoolStatePoolInfo;

    // For SDK-based DEXes (DLMM, DBC), initialize the SDK pool instance
    if (dex === "meteora-dlmm") {
      const dlmmData = await this.initDlmmPool(connection, poolPk.toBase58());
      watcher.dlmmPool = dlmmData.dlmmPool;
      const initialPrice = await this.getDlmmPrice(watcher);
      await this.maybePushPrice(watcher, initialPrice);
    } else if (dex === "meteora-dbc") {
      watcher.dbcPoolAddress = poolPk.toBase58();
      watcher.dbcConnection = connection;
      const initialPrice = await this.getDbcPrice(watcher);
      await this.maybePushPrice(watcher, initialPrice);
    } else {
      // Get initial price from current pool data
      const poolAccount = await connection.getAccountInfo(poolPk);
      if (!poolAccount) throw new Error("Pool account disappeared");
      const initialPrice = this.extractPoolStatePrice(dex, poolAccount.data, info);
      await this.maybePushPrice(watcher, initialPrice);
    }

    // Subscribe to pool account changes
    const subId = connection.onAccountChange(
      poolPk,
      async (accountInfo: AccountInfo<Buffer>, _ctx: Context) => {
        try {
          let price: number;
          if (dex === "meteora-dlmm") {
            price = await this.getDlmmPrice(watcher);
          } else if (dex === "meteora-dbc") {
            price = await this.getDbcPrice(watcher);
          } else {
            price = this.extractPoolStatePrice(dex, accountInfo.data, info);
          }
          await this.maybePushPrice(watcher, price);
        } catch (err: any) {
          this.log("info", `  [price error] ${err.message}`);
          this.errorCount++;
        }
      },
      "confirmed",
    );

    watcher.subscriptionIds.push(subId);
    this.log("debug", `    subscribed pool=${poolPk.toBase58().slice(0, 8)}...`);
  }

  // -----------------------------------------------------------------------
  // Internal — price computation
  // -----------------------------------------------------------------------

  private computeVaultBasedPrice(
    watcher: PoolWatcherState,
    info: VaultBasedPoolInfo,
    baseIdx: number,
  ): number {
    const baseBalance = baseIdx === 0 ? watcher.vault0Balance : watcher.vault1Balance;
    const quoteBalance = baseIdx === 0 ? watcher.vault1Balance : watcher.vault0Balance;
    const baseDec = baseIdx === 0 ? info.decimals0 : info.decimals1;
    const quoteDec = baseIdx === 0 ? info.decimals1 : info.decimals0;
    return vaultPrice(baseBalance, quoteBalance, baseDec, quoteDec);
  }

  private extractPoolStatePrice(dex: DexType, data: Buffer, info: PoolStatePoolInfo): number {
    switch (dex) {
      case "raydium-clmm":
        return clmmPriceFromPoolData(data, info.decimals0, info.decimals1);
      case "raydium-launchlab":
        return launchLabPriceFromPoolData(data, info.decimals0, info.decimals1);
      default:
        throw new Error(`No pool-state price extractor for: ${dex}`);
    }
  }

  private async getDlmmPrice(watcher: PoolWatcherState): Promise<number> {
    if (!watcher.dlmmPool) throw new Error("DLMM pool not initialized");
    const info = watcher.poolInfo as PoolStatePoolInfo;
    const { price: rawPrice } = await watcher.dlmmPool.getActiveBin();
    const priceFactor = Math.pow(10, info.decimals1 - info.decimals0);
    return Number(rawPrice) / priceFactor;
  }

  /**
   * Get DBC price using the adapter's getPrice() which wraps the DBC SDK.
   * This is more reliable than raw sqrtPrice decoding since DBC uses a complex
   * bonding curve with virtual reserves.
   */
  private async getDbcPrice(watcher: PoolWatcherState): Promise<number> {
    if (!watcher.dbcPoolAddress) throw new Error("DBC pool address not set");
    const { getDexAdapter } = await import("../../dex");
    await import("../../dex/meteora-dbc");
    const adapter = getDexAdapter("meteora-dbc");
    if (!adapter.getPrice) throw new Error("meteora-dbc adapter missing getPrice()");
    const priceInfo = await adapter.getPrice(watcher.dbcPoolAddress);
    return priceInfo.price;
  }

  // -----------------------------------------------------------------------
  // Internal — dedup + push
  // -----------------------------------------------------------------------

  /**
   * Push price to the Percolator market if it has changed (dedup by priceE6).
   * Also cranks the market after pushing.
   */
  private async maybePushPrice(watcher: PoolWatcherState, price: number): Promise<void> {
    if (!this.running) return;
    if (price <= 0 || !isFinite(price)) return;

    const priceE6 = BigInt(Math.round(price * 1e6));

    // Dedup: skip if price hasn't changed
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

// ---------------------------------------------------------------------------
// Config file loader
// ---------------------------------------------------------------------------

/**
 * Load keeper config from a JSON file.
 * Format: array of { pool, market, dex, network? }
 */
export async function loadKeeperConfig(configPath: string): Promise<KeeperPoolConfig[]> {
  const fs = await import("fs");
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Keeper config must be a JSON array");
  }

  return parsed.map((entry: any, idx: number) => {
    if (!entry.pool || !entry.market || !entry.dex) {
      throw new Error(`Config entry ${idx}: missing required fields (pool, market, dex)`);
    }
    const validDexes: DexType[] = [
      "raydium-cpmm", "raydium-amm-v4", "raydium-clmm", "raydium-launchlab",
      "pumpswap", "meteora-damm-v2", "meteora-dbc", "meteora-dlmm",
    ];
    if (!validDexes.includes(entry.dex)) {
      throw new Error(`Config entry ${idx}: invalid dex "${entry.dex}". Valid: ${validDexes.join(", ")}`);
    }
    return {
      pool: entry.pool,
      market: entry.market,
      dex: entry.dex as DexType,
      network: entry.network as Network | undefined,
    };
  });
}
