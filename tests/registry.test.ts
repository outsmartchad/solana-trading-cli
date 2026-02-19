/**
 * Registry smoke tests — verify all 17 DEX adapters are loaded
 * and their capabilities match expectations.
 *
 * These tests do NOT make RPC calls or spend SOL.
 */

import { getDexAdapter, listDexAdapters } from "../src/dex";

const EXPECTED_ADAPTERS = [
  "raydium-amm-v4",
  "raydium-cpmm",
  "raydium-clmm",
  "raydium-launchlab",
  "meteora-damm-v1",
  "meteora-damm-v2",
  "meteora-dlmm",
  "meteora-dbc",
  "meteora-lp-dlmm",
  "byreal-clmm",
  "pancakeswap-clmm",
  "orca",
  "fusion-amm",
  "futarchy-amm",
  "futarchy-launchpad",
  "jupiter-ultra",
  "dflow",
];

describe("DexRegistry", () => {
  test("all 17 adapters are registered", () => {
    const adapters = listDexAdapters();
    const names = adapters.map((a) => a.name).sort();
    console.log("Registered adapters:", names);
    expect(names.length).toBeGreaterThanOrEqual(17);

    for (const expected of EXPECTED_ADAPTERS) {
      expect(names).toContain(expected);
    }
  });

  test("getDexAdapter returns each adapter by name", () => {
    for (const name of EXPECTED_ADAPTERS) {
      const adapter = getDexAdapter(name);
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe(name);
      expect(adapter.capabilities).toBeDefined();
    }
  });

  test("adapter capabilities match expected", () => {
    // Exhaustive capability check for each adapter
    const expected: Record<string, Partial<Record<string, boolean>>> = {
      "raydium-amm-v4": {
        canBuy: true, canSell: false, canSnipe: true, canFindPool: true, canGetPrice: true,
      },
      "raydium-cpmm": {
        canBuy: true, canSell: true, canSnipe: true, canFindPool: true, canGetPrice: true,
      },
      "raydium-clmm": {
        canBuy: true, canSell: true, canSnipe: true, canFindPool: true, canGetPrice: true,
      },
      "raydium-launchlab": {
        canBuy: true, canSell: false, canSnipe: false, canFindPool: true, canGetPrice: true,
      },
      "meteora-damm-v1": {
        canBuy: true, canSell: false, canSnipe: true, canFindPool: true, canGetPrice: true,
      },
      "meteora-damm-v2": {
        canBuy: true, canSell: true, canSnipe: true, canFindPool: true, canGetPrice: true,
        canAddLiquidity: true, canRemoveLiquidity: true,
      },
      "meteora-dlmm": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true,
      },
      "meteora-dbc": {
        canBuy: true, canSell: true, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "meteora-lp-dlmm": {
        canBuy: false, canSell: false, canAddLiquidity: true, canRemoveLiquidity: true,
      },
      "byreal-clmm": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "pancakeswap-clmm": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "orca": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "fusion-amm": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "futarchy-amm": {
        canBuy: true, canSell: false, canSnipe: true, canGetPrice: true, canFindPool: false,
      },
      "futarchy-launchpad": {
        canBuy: false, canSell: false, canSnipe: false, canFindPool: false, canGetPrice: false,
        canAddLiquidity: false, canRemoveLiquidity: false,
      },
      "jupiter-ultra": {
        canBuy: true, canSell: true, canSnipe: false, canFindPool: false, canGetPrice: false,
      },
      "dflow": {
        canBuy: true, canSell: true, canSnipe: false, canFindPool: false, canGetPrice: false,
      },
    };

    for (const [name, caps] of Object.entries(expected)) {
      const adapter = getDexAdapter(name);
      for (const [cap, value] of Object.entries(caps)) {
        expect(
          (adapter.capabilities as any)[cap],
        ).toBe(
          value,
          // jest .toBe doesn't take a message, so we log for clarity
        );
        if ((adapter.capabilities as any)[cap] !== value) {
          console.error(`MISMATCH: ${name}.${cap} expected=${value} actual=${(adapter.capabilities as any)[cap]}`);
        }
      }
    }
  });

  test("buy method exists on all adapters", () => {
    for (const name of EXPECTED_ADAPTERS) {
      const adapter = getDexAdapter(name);
      expect(typeof adapter.buy).toBe("function");
      expect(typeof adapter.sell).toBe("function");
    }
  });
});
