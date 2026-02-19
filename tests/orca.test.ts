/**
 * Mainnet integration tests for Orca Whirlpool adapter.
 *
 * Capabilities: buy, snipe, getPrice
 *
 * CAUTION: Real transactions on Solana mainnet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SNIPE_TIP_SOL,
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
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canSell).toBe(false);
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

  test("snipe: 0.001 SOL on Whirlpool", async () => {
    await delay();
    const result = await adapter.snipe!({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: ORCA_SOL_USDC,
      tipSol: SNIPE_TIP_SOL,
    });
    logResult("orca snipe", result);
    expect(result.txSignature).toBeTruthy();
  });
});
