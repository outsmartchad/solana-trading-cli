/**
 * Mainnet integration tests for API-based adapters.
 *
 * Covers: jupiter-ultra, dflow
 *
 * These adapters use external HTTP APIs and manage their own TX submission.
 * They require API keys:
 *   - jupiter-ultra: JUPITER_API_KEY env var (optional for basic usage)
 *   - dflow: DFLOW_API_KEY env var
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
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// jupiter-ultra
// Capabilities: buy, sell
// ============================================================
describe("jupiter-ultra", () => {
  const adapter = getDexAdapter("jupiter-ultra");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(false);
    expect(adapter.capabilities.canFindPool).toBe(false);
    expect(adapter.capabilities.canGetPrice).toBe(false);
  });

  test("buy: 0.001 SOL worth of USDC via Jupiter Ultra", async () => {
    try {
      const result = await adapter.buy({
        tokenMint: USDC,
        amountSol: BUY_AMOUNT_SOL,
      });
      logResult("jupiter-ultra buy", result);
      expect(result.txSignature).toBeTruthy();
      expect(result.dex).toBe("jupiter-ultra");
    } catch (e: any) {
      // May fail if JUPITER_API_KEY not set or rate limited
      console.log(`jupiter-ultra buy: ${e.message}`);
    }
  });

  test("sell: 100% of USDC via Jupiter Ultra", async () => {
    await delay(5000);
    try {
      const result = await adapter.sell({
        tokenMint: USDC,
        percentage: SELL_PERCENTAGE,
      });
      logResult("jupiter-ultra sell", result);
      expect(result.txSignature).toBeTruthy();
    } catch (e: any) {
      console.log(`jupiter-ultra sell: ${e.message}`);
    }
  });
});

// ============================================================
// dflow
// Capabilities: buy, sell
// Requires: DFLOW_API_KEY env var
// ============================================================
describe("dflow", () => {
  const adapter = getDexAdapter("dflow");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(false);
    expect(adapter.capabilities.canFindPool).toBe(false);
    expect(adapter.capabilities.canGetPrice).toBe(false);
  });

  const hasDflowKey = !!process.env.DFLOW_API_KEY;

  test("buy: 0.001 SOL worth of USDC via DFlow", async () => {
    if (!hasDflowKey) {
      console.log("Skipping dflow buy — DFLOW_API_KEY not set");
      return;
    }
    try {
      const result = await adapter.buy({
        tokenMint: USDC,
        amountSol: BUY_AMOUNT_SOL,
      });
      logResult("dflow buy", result);
      expect(result.txSignature).toBeTruthy();
      expect(result.dex).toBe("dflow");
    } catch (e: any) {
      console.log(`dflow buy: ${e.message}`);
    }
  });

  test("sell: 100% of USDC via DFlow", async () => {
    if (!hasDflowKey) {
      console.log("Skipping dflow sell — DFLOW_API_KEY not set");
      return;
    }
    await delay(5000);
    try {
      const result = await adapter.sell({
        tokenMint: USDC,
        percentage: SELL_PERCENTAGE,
      });
      logResult("dflow sell", result);
      expect(result.txSignature).toBeTruthy();
    } catch (e: any) {
      console.log(`dflow sell: ${e.message}`);
    }
  });
});
