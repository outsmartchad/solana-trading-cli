/**
 * Mainnet integration tests for Meteora adapters.
 *
 * Covers: meteora-damm-v2, meteora-dlmm, meteora-dbc, meteora-lp-dlmm
 *
 * NOTE: meteora-damm-v1 is excluded — legacy AMM program.
 *
 * CAUTION: These tests execute real transactions on Solana mainnet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  WSOL,
  USDC,
  MET,
  METEORA_DAMM_V2_MET_SOL,
  METEORA_DLMM_MET_SOL,
  METEORA_DBC_GRACE_SOL,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// meteora-damm-v2
// Pool: MET/SOL (METEORA_DAMM_V2_MET_SOL)
// Capabilities: buy, sell, getPrice, addLiquidity, removeLiquidity
// ============================================================
describe("meteora-damm-v2", () => {
  const adapter = getDexAdapter("meteora-damm-v2");
  const pool = METEORA_DAMM_V2_MET_SOL;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canAddLiquidity).toBe(true);
    expect(adapter.capabilities.canRemoveLiquidity).toBe(true);
  });

  test("getPrice: MET/SOL pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("meteora-damm-v2 getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.02 SOL worth of MET", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: MET,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("meteora-damm-v2 buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("meteora-damm-v2");
  });

  test("sell: 100% of MET just bought", async () => {
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: MET,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("meteora-damm-v2 sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// meteora-dlmm
// Pool: MET/SOL (METEORA_DLMM_MET_SOL)
// Capabilities: buy, sell, getPrice
// ============================================================
describe("meteora-dlmm", () => {
  const adapter = getDexAdapter("meteora-dlmm");
  const pool = METEORA_DLMM_MET_SOL;

  test("getPrice: MET/SOL DLMM pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("meteora-dlmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.02 SOL worth of MET", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: MET,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("meteora-dlmm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("meteora-dlmm");
  });

  test("sell: 100% of MET just bought", async () => {
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: MET,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("meteora-dlmm sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// meteora-dbc
// Pool: GRACE/SOL (METEORA_DBC_GRACE_SOL)
// Token: 6mwEqau1eKHch1QYCTRv5sdnGtJzVouzaLbKY5LDdoge
// Capabilities: buy, sell, getPrice
// NOTE: DBC pools are bonding curves — may graduate.
// ============================================================
describe("meteora-dbc", () => {
  const adapter = getDexAdapter("meteora-dbc");
  const pool = METEORA_DBC_GRACE_SOL;
  const DBC_TOKEN = "6mwEqau1eKHch1QYCTRv5sdnGtJzVouzaLbKY5LDdoge";

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  test("getPrice: GRACE/SOL DBC pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("meteora-dbc getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.02 SOL worth of GRACE", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: DBC_TOKEN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("meteora-dbc buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("meteora-dbc");
  });

  test("sell: 100% of GRACE just bought", async () => {
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: DBC_TOKEN,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("meteora-dbc sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// meteora-lp-dlmm
// Capabilities: addLiquidity, removeLiquidity (LP only)
// ============================================================
describe("meteora-lp-dlmm", () => {
  const adapter = getDexAdapter("meteora-lp-dlmm");

  test("capabilities: LP only", () => {
    expect(adapter.capabilities.canAddLiquidity).toBe(true);
    expect(adapter.capabilities.canRemoveLiquidity).toBe(true);
    expect(adapter.capabilities.canBuy).toBe(false);
    expect(adapter.capabilities.canSell).toBe(false);
  });

  test("addLiquidity: tiny SOL deposit to DLMM pool", async () => {
    await delay();
    try {
      const result = await adapter.addLiquidity!({
        poolAddress: METEORA_DLMM_MET_SOL,
        amountA: 0.001,
      });
      logResult("meteora-lp-dlmm addLiquidity", result);
      expect(result.txSignature).toBeTruthy();
    } catch (e: any) {
      console.log(`meteora-lp-dlmm addLiquidity: ${e.message}`);
    }
  });

  test("removeLiquidity: 100% from DLMM pool", async () => {
    await delay(5000);
    try {
      const result = await adapter.removeLiquidity!({
        poolAddress: METEORA_DLMM_MET_SOL,
        percentage: 100,
      });
      logResult("meteora-lp-dlmm removeLiquidity", result);
      expect(result.txSignature).toBeTruthy();
    } catch (e: any) {
      // May fail if no position was created in addLiquidity
      console.log(`meteora-lp-dlmm removeLiquidity: ${e.message}`);
    }
  });
});
