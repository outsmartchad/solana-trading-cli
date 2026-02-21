/**
 * Test setup — imports all DEX adapter modules to trigger auto-registration.
 *
 * This file is loaded by Jest via setupFiles in jest.config.ts.
 * Without this, getDexAdapter() will fail because no adapters are registered.
 */

// Suppress bigint-buffer native binding warning from @bloxroute/solana-trader-client-ts.
// The pure JS fallback works fine — the warning is cosmetic noise.
const _origWarn = console.warn.bind(console);
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("bigint: Failed to load bindings")) return;
  _origWarn(...args);
};

// Import all adapter modules to trigger registerAdapter() side effects
import "../src/dex/raydium-amm-v4";
import "../src/dex/raydium-cpmm";
import "../src/dex/raydium-clmm";
import "../src/dex/raydium-launchlab";
import "../src/dex/meteora-damm-v1";
import "../src/dex/meteora-damm-v2";
import "../src/dex/meteora-dlmm";
import "../src/dex/meteora-dbc";

import "../src/dex/orca";
import "../src/dex/byreal-clmm";
import "../src/dex/pancakeswap-clmm";
import "../src/dex/fusion-amm";
import "../src/dex/futarchy-amm";
import "../src/dex/futarchy-launchpad";
import "../src/dex/pumpfun";
import "../src/dex/pumpfun-amm";
import "../src/dex/jupiter-ultra";
import "../src/dex/dflow";
