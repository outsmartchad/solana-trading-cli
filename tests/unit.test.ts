/**
 * CI-safe unit tests — NO mainnet, NO RPC, NO SOL required.
 *
 * Tests pure logic: types, validation, error classes, constants, registry basics.
 */

import { PublicKey } from "@solana/web3.js";

import {
  defaultCapabilities,
  requireTokenMint,
  UnsupportedOperationError,
  PoolNotFoundError,
  STABLECOIN_MINTS,
  SOL_STABLECOIN_POOLS,
  USDC_MINT,
  USDT_MINT,
  USD1_MINT,
  WSOL_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "../src/dex/types";

import {
  getDexAdapter,
  listDexAdapters,
  DexRegistry,
} from "../src/dex/index";

// ---------------------------------------------------------------------------
// 1. Registry — all 18 adapters register
// ---------------------------------------------------------------------------

describe("Registry (basic)", () => {
  test("at least 18 adapters are registered", () => {
    const adapters = listDexAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(18);
  });

  test("getDexAdapter returns an adapter with correct name", () => {
    const adapter = getDexAdapter("raydium-amm-v4");
    expect(adapter.name).toBe("raydium-amm-v4");
    expect(adapter.capabilities).toBeDefined();
  });

  test("DexRegistry rejects duplicate adapter names", () => {
    const registry = new DexRegistry();
    const fakeAdapter = {
      name: "test-dup",
      protocol: "test",
      capabilities: defaultCapabilities(),
      buy: jest.fn(),
      sell: jest.fn(),
    } as any;
    registry.registerAdapter(fakeAdapter);
    expect(() => registry.registerAdapter(fakeAdapter)).toThrow(
      /already registered/,
    );
  });

  test("DexRegistry.tryGetDexAdapter returns undefined for missing", () => {
    const registry = new DexRegistry();
    expect(registry.tryGetDexAdapter("nonexistent")).toBeUndefined();
  });

  test("DexRegistry.getDexAdapter throws for missing adapter", () => {
    const registry = new DexRegistry();
    expect(() => registry.getDexAdapter("nonexistent")).toThrow(/not found/);
  });

  test("DexRegistry.has / count / getNames work", () => {
    const registry = new DexRegistry();
    const fakeAdapter = {
      name: "test-adapter",
      protocol: "test",
      capabilities: defaultCapabilities(),
      buy: jest.fn(),
      sell: jest.fn(),
    } as any;
    registry.registerAdapter(fakeAdapter);
    expect(registry.has("test-adapter")).toBe(true);
    expect(registry.has("missing")).toBe(false);
    expect(registry.count).toBe(1);
    expect(registry.getNames()).toEqual(["test-adapter"]);
  });
});

// ---------------------------------------------------------------------------
// 2. Type validation — requireTokenMint()
// ---------------------------------------------------------------------------

describe("requireTokenMint()", () => {
  test("returns tokenMint when provided", () => {
    const mint = requireTokenMint({ tokenMint: USDC_MINT }, "test-adapter");
    expect(mint).toBe(USDC_MINT);
  });

  test("throws when tokenMint is undefined", () => {
    expect(() => requireTokenMint({}, "test-adapter")).toThrow(
      /tokenMint is required/,
    );
  });

  test("throws when tokenMint is empty string (falsy)", () => {
    expect(() => requireTokenMint({ tokenMint: "" }, "test-adapter")).toThrow(
      /tokenMint is required/,
    );
  });

  test("error message includes adapter name", () => {
    expect(() => requireTokenMint({}, "my-dex")).toThrow(/my-dex/);
  });
});

// ---------------------------------------------------------------------------
// 3. Input validation — PublicKey base58 validation
// ---------------------------------------------------------------------------

describe("Base58 / PublicKey validation", () => {
  test("valid base58 mint parses to PublicKey", () => {
    const pk = new PublicKey(USDC_MINT);
    expect(pk.toBase58()).toBe(USDC_MINT);
  });

  test("WSOL_MINT is a valid PublicKey", () => {
    const pk = new PublicKey(WSOL_MINT);
    expect(pk.toBase58()).toBe(WSOL_MINT);
  });

  test("invalid base58 throws", () => {
    expect(() => new PublicKey("not-a-valid-base58!!!")).toThrow();
  });

  test("empty string throws", () => {
    expect(() => new PublicKey("")).toThrow();
  });

  test("all constant mints are valid PublicKeys", () => {
    for (const mint of [USDC_MINT, USDT_MINT, USD1_MINT, WSOL_MINT]) {
      expect(() => new PublicKey(mint)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. defaultCapabilities() — all false by default, overrides work
// ---------------------------------------------------------------------------

describe("defaultCapabilities()", () => {
  test("returns all false with no overrides", () => {
    const caps = defaultCapabilities();
    expect(caps.canBuy).toBe(false);
    expect(caps.canSell).toBe(false);
    expect(caps.canSnipe).toBe(false);
    expect(caps.canFindPool).toBe(false);
    expect(caps.canGetPrice).toBe(false);
    expect(caps.canAddLiquidity).toBe(false);
    expect(caps.canRemoveLiquidity).toBe(false);
    expect(caps.canClaimFees).toBe(false);
    expect(caps.canListPositions).toBe(false);
    expect(caps.canCreatePool).toBe(false);
    expect(caps.isAggregator).toBe(false);
  });

  test("every value is boolean false", () => {
    const caps = defaultCapabilities();
    for (const value of Object.values(caps)) {
      expect(value).toBe(false);
    }
  });

  test("returns exactly 11 capability keys", () => {
    const caps = defaultCapabilities();
    expect(Object.keys(caps).length).toBe(11);
  });

  test("overrides apply correctly", () => {
    const caps = defaultCapabilities({ canBuy: true, canSell: true, isAggregator: true });
    expect(caps.canBuy).toBe(true);
    expect(caps.canSell).toBe(true);
    expect(caps.isAggregator).toBe(true);
    // non-overridden stay false
    expect(caps.canSnipe).toBe(false);
    expect(caps.canFindPool).toBe(false);
  });

  test("partial override does not affect other flags", () => {
    const caps = defaultCapabilities({ canCreatePool: true });
    expect(caps.canCreatePool).toBe(true);
    const falseKeys = Object.entries(caps).filter(([k, v]) => v === false);
    expect(falseKeys.length).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 5. Error classes — construct correctly
// ---------------------------------------------------------------------------

describe("UnsupportedOperationError", () => {
  test("constructs with correct properties", () => {
    const err = new UnsupportedOperationError("raydium-amm-v4", "addLiquidity");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(UnsupportedOperationError);
    expect(err.name).toBe("UnsupportedOperationError");
    expect(err.adapterName).toBe("raydium-amm-v4");
    expect(err.operation).toBe("addLiquidity");
    expect(err.message).toContain("raydium-amm-v4");
    expect(err.message).toContain("addLiquidity");
  });

  test("message format is correct", () => {
    const err = new UnsupportedOperationError("orca", "snipe");
    expect(err.message).toBe("orca does not support 'snipe'");
  });
});

describe("PoolNotFoundError", () => {
  test("constructs with baseMint only", () => {
    const err = new PoolNotFoundError("meteora-dlmm", USDC_MINT);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PoolNotFoundError);
    expect(err.name).toBe("PoolNotFoundError");
    expect(err.dex).toBe("meteora-dlmm");
    expect(err.baseMint).toBe(USDC_MINT);
    expect(err.quoteMint).toBeUndefined();
    expect(err.message).toContain(USDC_MINT);
    expect(err.message).toContain("meteora-dlmm");
  });

  test("constructs with baseMint and quoteMint", () => {
    const err = new PoolNotFoundError("raydium-clmm", USDC_MINT, WSOL_MINT);
    expect(err.quoteMint).toBe(WSOL_MINT);
    expect(err.message).toContain(WSOL_MINT);
  });

  test("message format without quoteMint", () => {
    const err = new PoolNotFoundError("dex", "ABC");
    expect(err.message).toBe("No pool found for ABC on dex");
  });

  test("message format with quoteMint", () => {
    const err = new PoolNotFoundError("dex", "ABC", "DEF");
    expect(err.message).toBe("No pool found for ABC / DEF on dex");
  });
});

// ---------------------------------------------------------------------------
// 6. Stablecoin detection — STABLECOIN_MINTS
// ---------------------------------------------------------------------------

describe("STABLECOIN_MINTS", () => {
  test("is a Set", () => {
    expect(STABLECOIN_MINTS).toBeInstanceOf(Set);
  });

  test("contains USDC", () => {
    expect(STABLECOIN_MINTS.has(USDC_MINT)).toBe(true);
  });

  test("contains USDT", () => {
    expect(STABLECOIN_MINTS.has(USDT_MINT)).toBe(true);
  });

  test("contains USD1", () => {
    expect(STABLECOIN_MINTS.has(USD1_MINT)).toBe(true);
  });

  test("has exactly 3 entries", () => {
    expect(STABLECOIN_MINTS.size).toBe(3);
  });

  test("does not contain WSOL", () => {
    expect(STABLECOIN_MINTS.has(WSOL_MINT)).toBe(false);
  });

  test("does not contain arbitrary string", () => {
    expect(STABLECOIN_MINTS.has("randomMint123")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. SOL_STABLECOIN_POOLS — has entries for USDC, USDT, USD1
// ---------------------------------------------------------------------------

describe("SOL_STABLECOIN_POOLS", () => {
  test("has entry for USDC", () => {
    expect(SOL_STABLECOIN_POOLS[USDC_MINT]).toBeDefined();
    expect(SOL_STABLECOIN_POOLS[USDC_MINT].length).toBeGreaterThan(0);
  });

  test("has entry for USDT", () => {
    expect(SOL_STABLECOIN_POOLS[USDT_MINT]).toBeDefined();
    expect(SOL_STABLECOIN_POOLS[USDT_MINT].length).toBeGreaterThan(0);
  });

  test("has entry for USD1", () => {
    expect(SOL_STABLECOIN_POOLS[USD1_MINT]).toBeDefined();
    expect(SOL_STABLECOIN_POOLS[USD1_MINT].length).toBeGreaterThan(0);
  });

  test("each entry has dex and pool fields", () => {
    for (const [mint, entries] of Object.entries(SOL_STABLECOIN_POOLS)) {
      for (const entry of entries) {
        expect(entry.dex).toBeTruthy();
        expect(typeof entry.dex).toBe("string");
        expect(entry.pool).toBeTruthy();
        expect(typeof entry.pool).toBe("string");
      }
    }
  });

  test("pool addresses are valid base58 (PublicKey)", () => {
    for (const entries of Object.values(SOL_STABLECOIN_POOLS)) {
      for (const entry of entries) {
        expect(() => new PublicKey(entry.pool)).not.toThrow();
      }
    }
  });

  test("does not have entry for WSOL", () => {
    expect(SOL_STABLECOIN_POOLS[WSOL_MINT]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Bonus: Constants sanity checks
// ---------------------------------------------------------------------------

describe("Constants", () => {
  test("DEFAULT_SLIPPAGE_BPS is 300", () => {
    expect(DEFAULT_SLIPPAGE_BPS).toBe(300);
  });

  test("DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS is 100_000", () => {
    expect(DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS).toBe(100_000);
  });

  test("DEFAULT_COMPUTE_UNIT_LIMIT is 400_000", () => {
    expect(DEFAULT_COMPUTE_UNIT_LIMIT).toBe(400_000);
  });

  test("WSOL_MINT matches known address", () => {
    expect(WSOL_MINT).toBe("So11111111111111111111111111111111111111112");
  });
});
