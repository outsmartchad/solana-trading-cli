/**
 * Mainnet integration tests for Raydium adapters.
 *
 * Covers: raydium-amm-v4, raydium-cpmm, raydium-clmm, raydium-launchlab
 *
 * CAUTION: These tests execute real transactions on Solana mainnet.
 * They will spend small amounts of SOL from your wallet.
 */

import { getDexAdapter } from "../src/dex";
import {
  ensureMainnetReady,
  delay,
  logResult,
  BUY_AMOUNT_SOL,
  SELL_PERCENTAGE,
  WSOL,
  FARTCOIN,
  USELESS,
  RAY,
  USD1,
  FREEDOM,
  RAYDIUM_V4_SOL_FARTCOIN,
  RAYDIUM_CPMM_SOL_USELESS,
  RAYDIUM_CLMM_SOL_RAY,
  RAYDIUM_LAUNCHLAB_FREEDOM_USD1,
} from "./helpers";

beforeAll(async () => {
  await ensureMainnetReady();
});

// ============================================================
// raydium-amm-v4
// Pool: SOL/Fartcoin
// Capabilities: buy, sell, findPool, getPrice
// ============================================================
describe("raydium-amm-v4", () => {
  const adapter = getDexAdapter("raydium-amm-v4");
  const pool = RAYDIUM_V4_SOL_FARTCOIN;

  test("getPrice: SOL/Fartcoin pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("raydium-amm-v4 getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.source).toBe("on-chain");
  });

  test("buy: 0.02 SOL worth of Fartcoin", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: FARTCOIN,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("raydium-amm-v4 buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-amm-v4");
  });

  test("sell: 100% of Fartcoin just bought", async () => {
    await delay(5000); // extra wait for buy to settle
    const result = await adapter.sell({
      tokenMint: FARTCOIN,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("raydium-amm-v4 sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-amm-v4");
  });
});

// ============================================================
// raydium-cpmm
// Pool: SOL/USELESS
// Capabilities: buy, sell, findPool, getPrice
// ============================================================
describe("raydium-cpmm", () => {
  const adapter = getDexAdapter("raydium-cpmm");
  const pool = RAYDIUM_CPMM_SOL_USELESS;

  test("getPrice: SOL/USELESS pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("raydium-cpmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.02 SOL worth of USELESS", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: USELESS,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("raydium-cpmm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-cpmm");
  });

  test("sell: 100% of USELESS just bought", async () => {
    await delay(5000);
    const result = await adapter.sell({
      tokenMint: USELESS,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("raydium-cpmm sell", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-cpmm");
  });
});

// ============================================================
// raydium-clmm
// Pool: SOL/RAY
// Capabilities: buy, sell, findPool, getPrice
// ============================================================
describe("raydium-clmm", () => {
  const adapter = getDexAdapter("raydium-clmm");
  const pool = RAYDIUM_CLMM_SOL_RAY;

  test("getPrice: SOL/RAY pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("raydium-clmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);
  });

  test("buy: 0.02 SOL worth of RAY", async () => {
    await delay();
    const result = await adapter.buy({
      tokenMint: RAY,
      amountSol: BUY_AMOUNT_SOL,
      poolAddress: pool,
    });
    logResult("raydium-clmm buy", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-clmm");
  });

  test("sell: 100% of RAY just bought", async () => {
    await delay(10000); // CLMM buys may take longer to confirm
    const result = await adapter.sell({
      tokenMint: RAY,
      percentage: SELL_PERCENTAGE,
      poolAddress: pool,
    });
    logResult("raydium-clmm sell", result);
    expect(result.txSignature).toBeTruthy();
  });
});

// ============================================================
// raydium-launchlab
// Pool: FREEDOM/USD1 (stablecoin-quoted bonding curve)
// Capabilities: buy, findPool, getPrice
// NOTE: This test pre-swaps SOL → USD1 via jupiter-ultra, then buys
//       FREEDOM with USD1. This mirrors the CLI auto-swap flow.
// ============================================================
describe("raydium-launchlab", () => {
  const adapter = getDexAdapter("raydium-launchlab");
  const pool = RAYDIUM_LAUNCHLAB_FREEDOM_USD1;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canSell).toBe(false);
    expect(adapter.capabilities.canSnipe).toBe(false);
  });

  test("getPrice: FREEDOM/USD1 pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("raydium-launchlab getPrice", price);
    expect(price.price).toBeGreaterThan(0);
    expect(price.quoteMint).toBe(USD1);
  });

  test("buy: pre-swap SOL → USD1, then buy FREEDOM", async () => {
    await delay();

    // Step 1: Swap SOL → USD1 via jupiter-ultra
    const jupAdapter = getDexAdapter("jupiter-ultra");
    const preSwap = await jupAdapter.buy({
      tokenMint: USD1,
      amountSol: BUY_AMOUNT_SOL,
    });
    logResult("jupiter-ultra SOL→USD1 pre-swap", preSwap);
    expect(preSwap.txSignature).toBeTruthy();

    // Wait for USD1 to arrive
    await delay(5000);

    // Step 2: Buy FREEDOM with USD1 on LaunchLab
    // amountSol here is actually the USD1 amount (6 decimals)
    // We use the pre-swapped amount — approximately BUY_AMOUNT_SOL * SOL price in USD
    // For safety, just use a small fixed USD amount
    const result = await adapter.buy({
      tokenMint: FREEDOM,
      amountSol: 1, // 1 USD1
      poolAddress: pool,
      quoteMint: USD1,
    });
    logResult("raydium-launchlab buy FREEDOM", result);
    expect(result.txSignature).toBeTruthy();
    expect(result.dex).toBe("raydium-launchlab");
  });
});
