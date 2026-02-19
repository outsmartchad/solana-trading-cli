/**
 * Mainnet integration tests for Fusion AMM and Futarchy adapters.
 *
 * Covers: fusion-amm, futarchy-amm, futarchy-launchpad
 *
 * These are niche DEXes with limited pool availability.
 * Most tests require known pool addresses to be filled in.
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
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// fusion-amm
// Capabilities: buy, snipe, getPrice
// ============================================================
describe("fusion-amm", () => {
  const adapter = getDexAdapter("fusion-amm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canSell).toBe(false);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  // Fusion AMM pools: need a known pool address.
  test.skip("buy: requires known Fusion AMM pool", async () => {
    const FUSION_POOL = "REPLACE_WITH_FUSION_POOL_ADDRESS";
    const FUSION_TOKEN = "REPLACE_WITH_FUSION_TOKEN_MINT";

    const price = await adapter.getPrice!(FUSION_POOL);
    logResult("fusion-amm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: FUSION_TOKEN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: FUSION_POOL,
    });
    logResult("fusion-amm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("fusion-amm");
  });
});

// ============================================================
// futarchy-amm
// Capabilities: buy, snipe, getPrice
// ============================================================
describe("futarchy-amm", () => {
  const adapter = getDexAdapter("futarchy-amm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canSell).toBe(false);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  // Futarchy AMM: DAO-based pools. Need a known DAO address.
  test.skip("buy: requires known Futarchy DAO pool", async () => {
    const FUTARCHY_DAO = "REPLACE_WITH_FUTARCHY_DAO_ADDRESS";
    const FUTARCHY_TOKEN = "REPLACE_WITH_FUTARCHY_TOKEN_MINT";

    const price = await adapter.getPrice!(FUTARCHY_DAO);
    logResult("futarchy-amm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    await delay();
    const result = await adapter.buy({
      tokenMint: FUTARCHY_TOKEN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: FUTARCHY_DAO,
    });
    logResult("futarchy-amm buy", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// futarchy-launchpad
// Capabilities: ALL FALSE (custom fund/claim methods)
// ============================================================
describe("futarchy-launchpad", () => {
  const adapter = getDexAdapter("futarchy-launchpad");

  test("capabilities: all disabled (custom methods only)", () => {
    expect(adapter.capabilities.canBuy).toBe(false);
    expect(adapter.capabilities.canSell).toBe(false);
    expect(adapter.capabilities.canSnipe).toBe(false);
    expect(adapter.capabilities.canFindPool).toBe(false);
    expect(adapter.capabilities.canGetPrice).toBe(false);
    expect(adapter.capabilities.canAddLiquidity).toBe(false);
    expect(adapter.capabilities.canRemoveLiquidity).toBe(false);
  });

  // The futarchy-launchpad adapter has custom fund() and claim() methods
  // that are NOT part of the IDexAdapter interface. They require active
  // launchpad campaigns. Skip for automated testing.
  test.skip("fund/claim: requires active launchpad campaign", () => {
    // To test manually:
    // import { FutarchyLaunchpadAdapter } from "../src/dex/futarchy-launchpad";
    // const lp = adapter as FutarchyLaunchpadAdapter;
    // await lp.fund({ launchAddress: "...", amountSol: 0.001 });
    // await lp.claim({ launchAddress: "..." });
  });
});
