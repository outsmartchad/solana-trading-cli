/**
 * Mainnet integration tests for Meteora adapters.
 *
 * Covers: meteora-damm-v2, meteora-dlmm (swaps + LP), meteora-dbc
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
// meteora-dlmm LP operations
// Capabilities: addLiquidity, removeLiquidity, claimFees, listPositions
// Pool: MET/SOL (METEORA_DLMM_MET_SOL)
// Flow: add → list → claim fees → remove 100%
// ============================================================
describe("meteora-dlmm LP", () => {
  const adapter = getDexAdapter("meteora-dlmm");
  const pool = METEORA_DLMM_MET_SOL;
  let positionAddress: string | undefined;

  test("capabilities: LP + fees + positions", () => {
    expect(adapter.capabilities.canAddLiquidity).toBe(true);
    expect(adapter.capabilities.canRemoveLiquidity).toBe(true);
    expect(adapter.capabilities.canClaimFees).toBe(true);
    expect(adapter.capabilities.canListPositions).toBe(true);
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
  });

  test("addLiquidity: one-sided SOL deposit (spot, 50 bins)", async () => {
    await delay();
    const result = await adapter.addLiquidity!({
      poolAddress: pool,
      amountSol: BUY_AMOUNT_SOL,
      strategy: "spot",
      bins: 50,
    });
    logResult("meteora-dlmm addLiquidity", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.confirmed).toBe(true);
    expect(result.positionAddress).toBeTruthy();
    expect(result.dex).toBe("meteora-dlmm");
    positionAddress = result.positionAddress;
  });

  test("listPositions: verify position exists", async () => {
    await delay(5000);
    const positions = await adapter.listPositions!(pool);
    logResult("meteora-dlmm listPositions", positions);
    expect(positions.length).toBeGreaterThan(0);

    // Find our position
    if (positionAddress) {
      const ours = positions.find((p) => p.positionAddress === positionAddress);
      expect(ours).toBeDefined();
      if (ours) {
        expect(ours.dex).toBe("meteora-dlmm");
        expect(ours.poolAddress).toBe(pool);
        expect(ours.lowerBinId).toBeDefined();
        expect(ours.upperBinId).toBeDefined();
      }
    }
  });

  test("claimFees: claim from position", async () => {
    await delay();
    const result = await adapter.claimFees!(pool, positionAddress);
    logResult("meteora-dlmm claimFees", result);
    // May return null/no fees if position was just created, that's OK
    expect(result.dex).toBe("meteora-dlmm");
    // We don't assert confirmed=true because fees may be zero on a fresh position
  });

  test("removeLiquidity: 100% from specific position", async () => {
    await delay(5000);
    const result = await adapter.removeLiquidity!({
      poolAddress: pool,
      percentage: 100,
      positionAddress,
    });
    logResult("meteora-dlmm removeLiquidity", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.confirmed).toBe(true);
    expect(result.dex).toBe("meteora-dlmm");
  });
});
