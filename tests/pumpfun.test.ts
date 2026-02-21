/**
 * Mainnet integration tests for PumpFun adapters.
 *
 * Covers: pumpfun (bonding curve), pumpfun-amm (PumpSwap graduated AMM)
 *
 * CAUTION: These tests execute real transactions on Solana mainnet.
 *
 * NOTE: PumpFun pools are ephemeral. Bonding curve pools graduate to
 * PumpSwap AMM. You need to find active pools on pump.fun or DexScreener.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  WSOL,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// pumpfun (bonding curve)
// Capabilities: buy, sell, snipe, findPool, getPrice
// ============================================================
describe("pumpfun", () => {
  const adapter = getDexAdapter("pumpfun");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
  });

  // PumpFun bonding curve pools are ephemeral — find an active one on pump.fun
  test.skip("buy: requires active bonding curve token", async () => {
    const PUMP_TOKEN = "REPLACE_WITH_ACTIVE_PUMP_MINT";
    const PUMP_BONDING_CURVE = "REPLACE_WITH_BONDING_CURVE_ADDRESS";

    const price = await adapter.getPrice!(PUMP_BONDING_CURVE);
    logResult("pumpfun getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: PUMP_TOKEN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: PUMP_BONDING_CURVE,
    });
    logResult("pumpfun buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun");
  });

  test.skip("sell: 100% of token just bought", async () => {
    const PUMP_TOKEN = "REPLACE_WITH_ACTIVE_PUMP_MINT";
    const PUMP_BONDING_CURVE = "REPLACE_WITH_BONDING_CURVE_ADDRESS";

    await delay(5000);
    const result = await adapter.sell({
      tokenMint: PUMP_TOKEN,
      percentage: SELL_PERCENTAGE,
      poolAddress: PUMP_BONDING_CURVE,
    });
    logResult("pumpfun sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun");
  });
});

// ============================================================
// pumpfun-amm (PumpSwap graduated AMM)
// Capabilities: buy, sell, snipe, findPool, getPrice
// ============================================================
describe("pumpfun-amm", () => {
  const adapter = getDexAdapter("pumpfun-amm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
  });

  // PumpSwap AMM pools — find a graduated token on DexScreener
  test.skip("buy: requires known PumpSwap AMM pool", async () => {
    const PUMPSWAP_TOKEN = "REPLACE_WITH_PUMPSWAP_TOKEN_MINT";
    const PUMPSWAP_POOL = "REPLACE_WITH_PUMPSWAP_POOL_ADDRESS";

    const price = await adapter.getPrice!(PUMPSWAP_POOL);
    logResult("pumpfun-amm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: PUMPSWAP_TOKEN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: PUMPSWAP_POOL,
    });
    logResult("pumpfun-amm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun-amm");
  });

  test.skip("sell: 100% of token just bought", async () => {
    const PUMPSWAP_TOKEN = "REPLACE_WITH_PUMPSWAP_TOKEN_MINT";
    const PUMPSWAP_POOL = "REPLACE_WITH_PUMPSWAP_POOL_ADDRESS";

    await delay(5000);
    const result = await adapter.sell({
      tokenMint: PUMPSWAP_TOKEN,
      percentage: SELL_PERCENTAGE,
      poolAddress: PUMPSWAP_POOL,
    });
    logResult("pumpfun-amm sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun-amm");
  });
});
