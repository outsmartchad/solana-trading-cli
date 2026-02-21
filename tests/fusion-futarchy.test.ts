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
import { getConnection, getWallet } from "../src/helpers/config";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  WSOL,
  USDC,
  FUTARCHY_AMM_POOL,
  FUTARCHY_AMM_TOKEN,
} from "./helpers";

/** Raydium CLMM SOL/USDC pool for auto-swap */
const RAYDIUM_SOL_USDC_CLMM = "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv";

/** Read USDC balance (UI amount) for wallet */
async function getUsdcBalance(): Promise<number> {
  const conn = getConnection();
  const wallet = getWallet();
  const ata = getAssociatedTokenAddressSync(new PublicKey(USDC), wallet.publicKey);
  try {
    const bal = await conn.getTokenAccountBalance(ata);
    return Number(bal.value.uiAmount ?? 0);
  } catch {
    return 0;
  }
}

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// fusion-amm
// Capabilities: buy, sell, getPrice
// ============================================================
describe("fusion-amm", () => {
  const adapter = getDexAdapter("fusion-amm");

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
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
// Capabilities: buy, sell, getPrice
// ============================================================
describe("futarchy-amm", () => {
  const adapter = getDexAdapter("futarchy-amm");
  const pool = FUTARCHY_AMM_POOL;
  const token = FUTARCHY_AMM_TOKEN;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  test("getPrice: Futarchy AMM pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("futarchy-amm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: swap SOL→USDC then buy token (auto-swap with balance delta)", async () => {
    // Step 1: Record pre-swap USDC balance
    const preBalance = await getUsdcBalance();
    console.log(`Pre-swap USDC balance: ${preBalance}`);

    // Step 2: Swap SOL→USDC via raydium-clmm (pool quote is USDC)
    const raydiumClmm = getDexAdapter("raydium-clmm");
    await delay();
    const swapResult = await raydiumClmm.buy({
      tokenMint: USDC,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: RAYDIUM_SOL_USDC_CLMM,
    });
    logResult("SOL→USDC swap", swapResult);
    expect(swapResult.txSignature).toBeTruthy();

    // Step 3: Measure balance delta (how much USDC we actually received)
    await delay(5000);
    const postBalance = await getUsdcBalance();
    const usdcReceived = postBalance - preBalance;
    console.log(`Post-swap USDC balance: ${postBalance}, delta: ${usdcReceived}`);
    expect(usdcReceived).toBeGreaterThan(0);

    // Step 4: Buy BANK token with ALL received USDC via futarchy-amm
    // amountSol is repurposed as USDC amount (adapter auto-detects USDC quote)
    const result = await adapter.buy({
      tokenMint: token,
      amountSol: usdcReceived,
      poolAddress: pool,
    });
    logResult("futarchy-amm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("futarchy-amm");
  });

  test("sell: 100% of token just bought", async () => {
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: token,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("futarchy-amm sell", result);
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
