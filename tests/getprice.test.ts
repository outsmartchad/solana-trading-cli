/**
 * Mainnet integration tests for getPrice() across ALL adapters that support it.
 *
 * Validates that each adapter returns a well-formed PriceInfo with:
 *   - positive, finite price
 *   - valid baseMint / quoteMint (non-empty, distinct)
 *   - source === "on-chain"
 *
 * NOTE: meteora-damm-v1 is excluded (legacy AMM program).
 * NOTE: fusion-amm is skipped (no known pool address in helpers).
 *
 * CAUTION: These tests make RPC calls to Solana mainnet but do NOT spend SOL.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  RAYDIUM_V4_SOL_FARTCOIN,
  RAYDIUM_CPMM_SOL_USELESS,
  RAYDIUM_CLMM_SOL_RAY,
  RAYDIUM_LAUNCHLAB_FREEDOM_USD1,
  METEORA_DAMM_V2_MET_SOL,
  METEORA_DLMM_MET_SOL,
  METEORA_DBC_GRACE_SOL,
  ORCA_SOL_USDC,
  PUMPFUN_OSMTEST_BONDING_CURVE,
  PUMPSWAP_AMM_POOL,
  FUTARCHY_AMM_POOL,
  BYREAL_CLMM_POOL,
  PANCAKESWAP_CLMM_POOL,
} from "./helpers";

// ---------------------------------------------------------------------------
// Adapter → pool mapping
// ---------------------------------------------------------------------------

const ADAPTER_POOLS: { adapter: string; pool: string; label: string }[] = [
  { adapter: "raydium-amm-v4", pool: RAYDIUM_V4_SOL_FARTCOIN, label: "SOL/Fartcoin" },
  { adapter: "raydium-cpmm", pool: RAYDIUM_CPMM_SOL_USELESS, label: "SOL/USELESS" },
  { adapter: "raydium-clmm", pool: RAYDIUM_CLMM_SOL_RAY, label: "SOL/RAY" },
  { adapter: "raydium-launchlab", pool: RAYDIUM_LAUNCHLAB_FREEDOM_USD1, label: "FREEDOM/USD1" },
  { adapter: "meteora-damm-v2", pool: METEORA_DAMM_V2_MET_SOL, label: "MET/SOL" },
  { adapter: "meteora-dlmm", pool: METEORA_DLMM_MET_SOL, label: "MET/SOL" },
  { adapter: "meteora-dbc", pool: METEORA_DBC_GRACE_SOL, label: "GRACE/SOL" },
  { adapter: "orca", pool: ORCA_SOL_USDC, label: "SOL/USDC" },
  { adapter: "pumpfun", pool: PUMPFUN_OSMTEST_BONDING_CURVE, label: "OSMTEST bonding curve" },
  { adapter: "pumpfun-amm", pool: PUMPSWAP_AMM_POOL, label: "PumpSwap AMM" },
  { adapter: "futarchy-amm", pool: FUTARCHY_AMM_POOL, label: "Futarchy AMM" },
  { adapter: "byreal-clmm", pool: BYREAL_CLMM_POOL, label: "Byreal CLMM" },
  { adapter: "pancakeswap-clmm", pool: PANCAKESWAP_CLMM_POOL, label: "PancakeSwap CLMM" },
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await ensureMainnetReady();
}, 30_000);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getPrice() across all adapters", () => {
  for (const { adapter: adapterName, pool, label } of ADAPTER_POOLS) {
    test(
      `${adapterName}: getPrice(${label})`,
      async () => {
        const adapter = getDexAdapter(adapterName);

        // Sanity: adapter must declare canGetPrice
        expect(adapter.capabilities.canGetPrice).toBe(true);
        expect(adapter.getPrice).toBeDefined();

        const result = await adapter.getPrice!(pool);

        // Log for manual verification
        console.log(
          `[${adapterName}] price=${result.price} base=${result.baseMint} quote=${result.quoteMint} source=${result.source}`,
        );

        // price: positive finite number
        expect(typeof result.price).toBe("number");
        expect(result.price).toBeGreaterThan(0);
        expect(Number.isFinite(result.price)).toBe(true);
        expect(Number.isNaN(result.price)).toBe(false);

        // baseMint: non-empty string (valid base58 address)
        expect(typeof result.baseMint).toBe("string");
        expect(result.baseMint.length).toBeGreaterThan(0);

        // quoteMint: non-empty string (valid base58 address)
        expect(typeof result.quoteMint).toBe("string");
        expect(result.quoteMint.length).toBeGreaterThan(0);

        // baseMint and quoteMint must be different
        expect(result.baseMint).not.toBe(result.quoteMint);

        // source must be "on-chain"
        expect(result.source).toBe("on-chain");
      },
      60_000,
    );
  }
});
