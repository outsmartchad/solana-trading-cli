/**
 * Mainnet integration tests for PumpFun adapters.
 *
 * Covers: pumpfun (bonding curve), pumpfun-amm (PumpSwap graduated AMM)
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
  PUMPFUN_OSMTEST_MINT,
  PUMPFUN_OSMTEST_BONDING_CURVE,
  PUMPSWAP_AMM_POOL,
  PUMPSWAP_TOKEN,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// pumpfun (bonding curve)
// Token: OSMTEST (created via adapter.create for testing)
// ============================================================
describe("pumpfun", () => {
  const adapter = getDexAdapter("pumpfun");
  const pool = PUMPFUN_OSMTEST_BONDING_CURVE;
  const token = PUMPFUN_OSMTEST_MINT;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
    expect(adapter.capabilities.canGetPrice).toBe(true);
  });

  test("getPrice: OSMTEST bonding curve", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("pumpfun getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.quoteMint).toBe(WSOL);
  });

  test("buy: 0.02 SOL worth of OSMTEST", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: token,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("pumpfun buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun");
  });

  test("sell: 100% of OSMTEST just bought", async () => {
    // Longer delay — pumpfun buy may not confirm immediately
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: token,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("pumpfun sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun");
  });
});

// ============================================================
// pumpfun-amm (PumpSwap graduated AMM)
// Pool: FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7
// ============================================================
describe("pumpfun-amm", () => {
  const adapter = getDexAdapter("pumpfun-amm");
  const pool = PUMPSWAP_AMM_POOL;
  const token = PUMPSWAP_TOKEN;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
    expect(adapter.capabilities.canGetPrice).toBe(true);
  });

  test("getPrice: PumpSwap AMM pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("pumpfun-amm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.quoteMint).toBe(WSOL);
  });

  test("buy: 0.02 SOL worth of token", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: token,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("pumpfun-amm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun-amm");
  });

  test("sell: 100% of token just bought", async () => {
    // Longer delay — wait for buy to fully confirm
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: token,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("pumpfun-amm sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("pumpfun-amm");
  });
});
