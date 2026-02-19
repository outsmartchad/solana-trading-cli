/**
 * Mainnet integration tests for Raydium adapters.
 *
 * Covers: raydium-amm-v4, raydium-cpmm, raydium-clmm, raydium-launchlab
 *
 * CAUTION: These tests execute real transactions on Solana mainnet.
 * They will spend small amounts of SOL from your wallet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  SNIPE_TIP_SOL,
  WSOL,
  USDC,
  RAYDIUM_V4_SOL_USDC,
  RAYDIUM_CPMM_SOL_USDC,
  RAYDIUM_CLMM_SOL_USDC,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// raydium-amm-v4
// Capabilities: buy, snipe, findPool, getPrice
// ============================================================
describe("raydium-amm-v4", () => {
  const adapter = getDexAdapter("raydium-amm-v4");

  test("findPool: SOL/USDC", async () => {
    const pool = await adapter.findPool!(WSOL, USDC);
    logResult("raydium-amm-v4 findPool", pool);
    expect(pool).not.toBeNull();
    expect(pool!.address).toBeTruthy();
    expect(pool!.dex).toBe("raydium-amm-v4");
  });

  test("getPrice: SOL/USDC pool", async () => {
    await delay();
    const price = await adapter.getPrice!(RAYDIUM_V4_SOL_USDC);
    logResult("raydium-amm-v4 getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.source).toBe("on-chain");
  });

  test("buy: 0.001 SOL worth of USDC", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_V4_SOL_USDC,
    });
    logResult("raydium-amm-v4 buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-amm-v4");
  });

  test("snipe: 0.001 SOL on SOL/USDC pool", async () => {
    await delay();
    const result = await adapter.snipe!({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_V4_SOL_USDC,
      tipSol: SNIPE_TIP_SOL,
    });
    logResult("raydium-amm-v4 snipe", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-amm-v4");
  });
});

// ============================================================
// raydium-cpmm
// Capabilities: buy, sell, snipe, findPool, getPrice
// ============================================================
describe("raydium-cpmm", () => {
  const adapter = getDexAdapter("raydium-cpmm");

  test("findPool: SOL/USDC", async () => {
    const pool = await adapter.findPool!(WSOL, USDC);
    logResult("raydium-cpmm findPool", pool);
    expect(pool).not.toBeNull();
    expect(pool!.dex).toBe("raydium-cpmm");
  });

  test("getPrice: SOL/USDC pool", async () => {
    await delay();
    const price = await adapter.getPrice!(RAYDIUM_CPMM_SOL_USDC);
    logResult("raydium-cpmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.001 SOL worth of USDC", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_CPMM_SOL_USDC,
    });
    logResult("raydium-cpmm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-cpmm");
  });

  test("sell: 100% of USDC just bought", async () => {
    await delay(5000); // extra wait for buy to settle
    const result = await adapter.sell({
      tokenMint: USDC,
      percentage: SELL_PERCENTAGE,
      poolAddress: RAYDIUM_CPMM_SOL_USDC,
    });
    logResult("raydium-cpmm sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-cpmm");
  });

  test("snipe: 0.001 SOL on SOL/USDC pool", async () => {
    await delay();
    const result = await adapter.snipe!({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_CPMM_SOL_USDC,
      tipSol: SNIPE_TIP_SOL,
    });
    logResult("raydium-cpmm snipe", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// raydium-clmm
// Capabilities: buy, sell, snipe, findPool, getPrice
// ============================================================
describe("raydium-clmm", () => {
  const adapter = getDexAdapter("raydium-clmm");

  test("findPool: SOL/USDC", async () => {
    const pool = await adapter.findPool!(WSOL, USDC);
    logResult("raydium-clmm findPool", pool);
    expect(pool).not.toBeNull();
    expect(pool!.dex).toBe("raydium-clmm");
  });

  test("getPrice: SOL/USDC pool", async () => {
    await delay();
    const price = await adapter.getPrice!(RAYDIUM_CLMM_SOL_USDC);
    logResult("raydium-clmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.001 SOL worth of USDC", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_CLMM_SOL_USDC,
    });
    logResult("raydium-clmm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-clmm");
  });

  test("sell: 100% of USDC just bought", async () => {
    await delay(5000);
    const result = await adapter.sell({
      tokenMint: USDC,
      percentage: SELL_PERCENTAGE,
      poolAddress: RAYDIUM_CLMM_SOL_USDC,
    });
    logResult("raydium-clmm sell", result);
    expect(result.txSignature).toBeTruthy();
  });

  test("snipe: 0.001 SOL on SOL/USDC pool", async () => {
    await delay();
    const result = await adapter.snipe!({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_CLMM_SOL_USDC,
      tipSol: SNIPE_TIP_SOL,
    });
    logResult("raydium-clmm snipe", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// raydium-launchlab
// Capabilities: buy, findPool, getPrice
// NOTE: LaunchLab pools are bonding curves that may graduate.
//       If no active pool exists, these tests will be skipped.
// ============================================================
describe("raydium-launchlab", () => {
  const adapter = getDexAdapter("raydium-launchlab");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canSell).toBe(false);
    expect(adapter.capabilities.canSnipe).toBe(false);
  });

  // LaunchLab pools are ephemeral — skip buy test if no pool is available.
  // To test manually: find an active LaunchLab token and set its mint below.
  test.skip("buy: requires active LaunchLab token", async () => {
    const LAUNCHLAB_TOKEN = "REPLACE_WITH_ACTIVE_LAUNCHLAB_MINT";
    const pool = await adapter.findPool!(LAUNCHLAB_TOKEN, WSOL);
    expect(pool).not.toBeNull();
    if (pool) {
      const result = await adapter.buy({
        tokenMint: LAUNCHLAB_TOKEN,
        amountSol: BUY_AMOUNT_SOL,
        poolAddress: pool.address,
      });
      logResult("raydium-launchlab buy", result);
      expect(result.txSignature).toBeTruthy();
    }
  });
});
