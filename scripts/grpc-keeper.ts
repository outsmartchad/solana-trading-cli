#!/usr/bin/env npx tsx
/**
 * gRPC Oracle Keeper Bot — Standalone Script
 *
 * Watches DEX pool accounts via Yellowstone gRPC (Geyser) and pushes live
 * prices to Percolator admin-oracle perp markets. More reliable than
 * WebSocket for production — handles reconnects, supports processed
 * commitment, and works with dedicated gRPC endpoints.
 *
 * Usage (single pool):
 *   npx tsx scripts/grpc-keeper.ts --pool <POOL> --market <SLAB> --dex raydium-cpmm [--network devnet]
 *
 * Usage (multi-pool config):
 *   npx tsx scripts/grpc-keeper.ts --config ~/.outsmart/keeper.json
 *
 * Requires:
 *   - GRPC_URL — Yellowstone gRPC endpoint
 *   - GRPC_XTOKEN — gRPC auth token
 *   - PRIVATE_KEY — oracle authority wallet
 *   - DEVNET_ENDPOINT or MAINNET_ENDPOINT depending on --network
 */

import { GrpcKeeper } from "../src/dex/percolator/grpc-keeper";
import { loadKeeperConfig, type KeeperPoolConfig, type DexType } from "../src/dex/percolator/ws-keeper";

// ---------------------------------------------------------------------------
// Parse CLI args
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
  gRPC Oracle Keeper

  Usage:
    npx tsx scripts/grpc-keeper.ts --pool <POOL> --market <SLAB> --dex <DEX> [--network devnet]
    npx tsx scripts/grpc-keeper.ts --config <path.json>

  Requires: GRPC_URL and GRPC_XTOKEN env vars

  DEX types:
    raydium-cpmm, raydium-amm-v4, raydium-clmm, raydium-launchlab,
    pumpswap, meteora-damm-v2, meteora-dbc, meteora-dlmm
`);
      process.exit(1);
    }

    pools = [{ pool, market, dex, network }];
  }

  const network = pools[0]?.network ?? "devnet";

  console.log(`\n  gRPC Oracle Keeper`);
  console.log(`  ──────────────────`);
  console.log(`  mode:      ${pools.length === 1 ? "single-pool" : "multi-pool"}`);
  console.log(`  pools:     ${pools.length}`);
  console.log(`  network:   ${network}`);
  console.log(`  transport: Yellowstone gRPC\n`);

  const keeper = new GrpcKeeper(pools, {
    network,
    logLevel: "info",
  });

  await keeper.start();

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
