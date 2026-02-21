/**
 * Mainnet integration tests for Orca Whirlpool adapter.
 *
 * Capabilities: buy, sell, getPrice
 *
 * CAUTION: Real transactions on Solana mainnet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  WSOL,
  ORCA_WHIRLPOOL_POOL,
  ORCA_WHIRLPOOL_TOKEN,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

describe("orca", () => {
  const adapter = getDexAdapter("orca");
  const pool = ORCA_WHIRLPOOL_POOL;
  const token = ORCA_WHIRLPOOL_TOKEN;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  test("getPrice: Orca Whirlpool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("orca getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.source).toBe("on-chain");
  });

  test("buy: 0.02 SOL worth of token", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: token,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("orca buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("orca");
  });

  test("sell: 100% of token just bought", async () => {
    await delay(10000);
    const result = await adapter.sell!({
      tokenMint: token,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("orca sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});
