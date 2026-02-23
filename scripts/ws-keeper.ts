#!/usr/bin/env npx tsx
/**
 * WebSocket Oracle Keeper Bot — Standalone Script
 *
 * Watches DEX pool accounts via WebSocket and pushes live prices to
 * Percolator admin-oracle perp markets. Zero polling, event-driven.
 *
 * Usage (single pool):
 *   npx tsx scripts/ws-keeper.ts --pool <POOL> --market <SLAB> --dex raydium-cpmm [--network devnet]
 *
 * Usage (multi-pool config):
 *   npx tsx scripts/ws-keeper.ts --config ~/.outsmart/keeper.json
 *
 * Config format (JSON array):
 *   [{ "pool": "...", "market": "...", "dex": "raydium-cpmm", "network": "devnet" }]
 *
 * Supported DEX types:
 *   raydium-cpmm, raydium-amm-v4, raydium-clmm, raydium-launchlab,
 *   pumpswap, meteora-damm-v2, meteora-dbc, meteora-dlmm
 *
 * Requires:
 *   - PRIVATE_KEY in env or ~/.outsmart/config.env (must be the market's oracle authority)
 *   - DEVNET_ENDPOINT or MAINNET_ENDPOINT depending on --network
 */

import { WsKeeper, loadKeeperConfig, type KeeperPoolConfig, type DexType } from "../src/dex/percolator/ws-keeper";

// ---------------------------------------------------------------------------
// Parse CLI args (minimal, no commander dependency)
// ---------------------------------------------------------------------------

function getArg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    if (fallback !== undefined) return fallback;
    return "";
  }
  return process.argv[idx + 1];
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Load config (triggers dotenv loading from ~/.outsmart/config.env)
  await import("../src/helpers/config");

  let pools: KeeperPoolConfig[];

  if (hasArg("config")) {
    const configPath = getArg("config");
    if (!configPath) {
      console.error("  --config requires a file path");
      process.exit(1);
    }
    pools = await loadKeeperConfig(configPath);
    console.log(`\n  Loaded ${pools.length} pool(s) from ${configPath}`);
  } else {
    const pool = getArg("pool");
    const market = getArg("market");
    const dex = getArg("dex") as DexType;
    const network = (getArg("network", "devnet")) as "devnet" | "mainnet";

    if (!pool || !market || !dex) {
      console.error(`
  WebSocket Oracle Keeper

  Usage:
    npx tsx scripts/ws-keeper.ts --pool <POOL> --market <SLAB> --dex <DEX> [--network devnet]
    npx tsx scripts/ws-keeper.ts --config <path.json>

  DEX types:
    raydium-cpmm, raydium-amm-v4, raydium-clmm, raydium-launchlab,
    pumpswap, meteora-damm-v2, meteora-dbc, meteora-dlmm
`);
      process.exit(1);
    }

    pools = [{ pool, market, dex, network }];
  }

  const network = pools[0]?.network ?? "devnet";

  console.log(`\n  WebSocket Oracle Keeper`);
  console.log(`  ──────────────────────`);
  console.log(`  mode:     ${pools.length === 1 ? "single-pool" : "multi-pool"}`);
  console.log(`  pools:    ${pools.length}`);
  console.log(`  network:  ${network}`);
  console.log(`  source:   on-chain WebSocket\n`);

  const keeper = new WsKeeper(pools, {
    network,
    logLevel: "info",
  });

  await keeper.start();

  // Graceful shutdown
  const shutdown = async () => {
    await keeper.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
