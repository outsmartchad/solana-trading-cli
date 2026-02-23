#!/usr/bin/env npx tsx
/**
 * Percolator Oracle Keeper Bot
 *
 * Fetches live prices and pushes them to admin-oracle Percolator markets.
 * Cranks after each price update. Runs in a loop on a configurable interval.
 *
 * Usage:
 *   npx tsx scripts/keeper.ts --market <SLAB> --token <MINT> [--interval 10] [--network devnet]
 *
 * Price source: Jupiter Price API v2 (free, no key needed)
 *
 * Requires:
 *   - PRIVATE_KEY in env or ~/.outsmart/config.env (must be the market's oracle authority)
 *   - DEVNET_ENDPOINT or MAINNET_ENDPOINT depending on --network
 */

import { PercolatorAdapter } from "../src/dex/percolator/adapter";

// ---------------------------------------------------------------------------
// Parse CLI args (minimal, no commander dependency)
// ---------------------------------------------------------------------------

function getArg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    if (fallback !== undefined) return fallback;
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return process.argv[idx + 1];
}

const MARKET = getArg("market");
const TOKEN_MINT = getArg("token");
const INTERVAL_S = Number(getArg("interval", "10"));
const NETWORK = getArg("network", "devnet") as "devnet" | "mainnet";

// ---------------------------------------------------------------------------
// Price fetcher — Jupiter Price API v2
// ---------------------------------------------------------------------------

async function fetchPrice(mint: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`);
    if (!res.ok) {
      console.error(`  [price] Jupiter API ${res.status}: ${await res.text()}`);
      return null;
    }
    const json = await res.json() as any;
    const price = json?.data?.[mint]?.price;
    if (!price) {
      console.error(`  [price] No price data for ${mint}`);
      return null;
    }
    return Number(price);
  } catch (err: any) {
    console.error(`  [price] Fetch error: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main() {
  // Load config (triggers dotenv loading from ~/.outsmart/config.env)
  await import("../src/helpers/config");

  const adapter = new PercolatorAdapter();

  console.log(`\n  Percolator Keeper Bot`);
  console.log(`  ─────────────────────`);
  console.log(`  market:   ${MARKET}`);
  console.log(`  token:    ${TOKEN_MINT}`);
  console.log(`  network:  ${NETWORK}`);
  console.log(`  interval: ${INTERVAL_S}s`);
  console.log(`  source:   Jupiter Price API v2`);
  console.log(`\n  Press Ctrl+C to stop.\n`);

  let lastPriceE6 = 0n;
  let cycles = 0;
  let errors = 0;

  const tick = async () => {
    cycles++;
    const price = await fetchPrice(TOKEN_MINT);
    if (price === null) {
      errors++;
      return;
    }

    const priceE6 = BigInt(Math.round(price * 1e6));

    // Skip if price hasn't changed (avoid wasting SOL on identical pushes)
    if (priceE6 === lastPriceE6) {
      const ts = new Date().toLocaleTimeString();
      process.stdout.write(`  [${ts}] $${price.toFixed(6)} (unchanged, skipping)\r`);
      return;
    }

    try {
      // Push price + crank in sequence
      await adapter.pushOraclePrice(MARKET, priceE6, NETWORK);
      await adapter.crank(MARKET, NETWORK);

      lastPriceE6 = priceE6;
      const ts = new Date().toLocaleTimeString();
      console.log(`  [${ts}] pushed $${price.toFixed(6)} (cycle #${cycles})`);
    } catch (err: any) {
      errors++;
      const ts = new Date().toLocaleTimeString();
      console.error(`  [${ts}] ERROR (cycle #${cycles}): ${err.message}`);
    }
  };

  // Initial tick immediately
  await tick();

  // Then loop
  const interval = setInterval(tick, INTERVAL_S * 1000);

  // Graceful shutdown
  const shutdown = () => {
    clearInterval(interval);
    console.log(`\n\n  Keeper stopped. ${cycles} cycles, ${errors} errors.\n`);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
