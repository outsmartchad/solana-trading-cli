/**
 * Mainnet integration tests for shared CLMM adapters.
 *
 * Covers: byreal-clmm, pancakeswap-clmm
 *
 * Both extend ClmmBaseAdapter with different program IDs.
 * Capabilities: buy, sell, getPrice
 *
 * NOTE: These DEXes may have limited pool availability for common pairs.
 *       Tests use try/catch for graceful handling.
 *
 * CAUTION: Real transactions on Solana mainnet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  WSOL,
  USDC,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// byreal-clmm
// ============================================================
describe("byreal-clmm", () => {
  const adapter = getDexAdapter("byreal-clmm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  // Byreal CLMM pools: you need a known pool address.
  // If you have one, replace below. Otherwise skip.
  test.skip("buy: requires known Byreal CLMM pool", async () => {
    const BYREAL_POOL = "REPLACE_WITH_BYREAL_POOL_ADDRESS";

    const price = await adapter.getPrice!(BYREAL_POOL);
    logResult("byreal-clmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: BYREAL_POOL,
    });
    logResult("byreal-clmm buy", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// pancakeswap-clmm
// ============================================================
describe("pancakeswap-clmm", () => {
  const adapter = getDexAdapter("pancakeswap-clmm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  // PancakeSwap CLMM pools: need a known pool address.
  test.skip("buy: requires known PancakeSwap CLMM pool", async () => {
    const PANCAKE_POOL = "REPLACE_WITH_PANCAKESWAP_POOL_ADDRESS";

    const price = await adapter.getPrice!(PANCAKE_POOL);
    logResult("pancakeswap-clmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: PANCAKE_POOL,
    });
    logResult("pancakeswap-clmm buy", result);
    expect(result.txSignature).toBeTruthy();
  });
});
