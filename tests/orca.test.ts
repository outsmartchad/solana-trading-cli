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
  USDC,
  ORCA_SOL_USDC,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

describe("orca", () => {
  const adapter = getDexAdapter("orca");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  test("getPrice: SOL/USDC Whirlpool", async () => {
    const price = await adapter.getPrice!(ORCA_SOL_USDC);
    logResult("orca getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.source).toBe("on-chain");
  });

  test("buy: 0.001 SOL worth of USDC", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: ORCA_SOL_USDC,
    });
    logResult("orca buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("orca");
  });

  test("sell: 100% of USDC via Orca", async () => {
    await delay(5000);
    const result = await adapter.sell!({
      tokenMint: USDC,
      percentage: SELL_PERCENTAGE,
      poolAddress: ORCA_SOL_USDC,
    });
    logResult("orca sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});
