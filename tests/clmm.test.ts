/**
 * Mainnet integration tests for shared CLMM adapters.
 *
 * Covers: byreal-clmm, pancakeswap-clmm
 *
 * Both extend ClmmBaseAdapter with different program IDs.
 * Capabilities: buy, sell, getPrice
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
  BYREAL_CLMM_POOL,
} from "./helpers";

/** Raydium CLMM SOL/USDC pool for auto-swap */
const RAYDIUM_SOL_USDC_CLMM = "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv";

/** Stablecoins that are not the "token" side */
const STABLES = new Set([WSOL, USDC]);

/** Read token balance (UI amount) for a given mint */
async function getTokenBalance(mint: string): Promise<number> {
  const conn = getConnection();
  const wallet = getWallet();
  const ata = getAssociatedTokenAddressSync(new PublicKey(mint), wallet.publicKey);
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
// byreal-clmm
// ============================================================
describe("byreal-clmm", () => {
  const adapter = getDexAdapter("byreal-clmm");
  const pool = BYREAL_CLMM_POOL;

  // Auto-detected from pool state in getPrice test
  let token: string;
  let quoteMint: string;

  test("capabilities check", () => {
    expect(adapter.capabilities.canBuy).toBe(true);
    expect(adapter.capabilities.canSell).toBe(true);
    expect(adapter.capabilities.canSnipe).toBe(true);
    expect(adapter.capabilities.canGetPrice).toBe(true);
    expect(adapter.capabilities.canFindPool).toBe(false);
  });

  test("getPrice: auto-detect token and quote from pool", async () => {
    const price = await adapter.getPrice!(pool);
    logResult("byreal-clmm getPrice", price);
    expect(price.price).toBeGreaterThan(0);

    // Auto-detect: the non-stablecoin side is the token
    if (STABLES.has(price.baseMint)) {
      token = price.quoteMint;
      quoteMint = price.baseMint;
    } else {
      token = price.baseMint;
      quoteMint = price.quoteMint;
    }
    console.log(`Detected token: ${token}, quote: ${quoteMint}`);
  });

  test("buy: swap SOL→quote then buy token (auto-swap with balance delta)", async () => {
    expect(token).toBeTruthy(); // getPrice must run first

    const isUsdcQuote = quoteMint === USDC;

    if (isUsdcQuote) {
      // Step 1: Record pre-swap USDC balance
      const preBalance = await getTokenBalance(USDC);
      console.log(`Pre-swap USDC balance: ${preBalance}`);

      // Step 2: Swap SOL→USDC via raydium-clmm
      const raydiumClmm = getDexAdapter("raydium-clmm");
      await delay();
      const swapResult = await raydiumClmm.buy({
        tokenMint: USDC,
        amountSol: BUY_AMOUNT_SOL,
        poolAddress: RAYDIUM_SOL_USDC_CLMM,
      });
      logResult("SOL→USDC swap", swapResult);
      expect(swapResult.txSignature).toBeTruthy();

      // Step 3: Measure USDC balance delta
      await delay(5000);
      const postBalance = await getTokenBalance(USDC);
      const usdcReceived = postBalance - preBalance;
      console.log(`Post-swap USDC balance: ${postBalance}, delta: ${usdcReceived}`);
      expect(usdcReceived).toBeGreaterThan(0);

      // Step 4: Buy token with ALL received USDC
      const result = await adapter.buy({
        tokenMint: token,
        amountSol: usdcReceived,
        quoteMint,
        poolAddress: pool,
      });
      logResult("byreal-clmm buy", result);
      expect(result.txSignature).toBeTruthy();
      expect(result.dex).toBe("byreal-clmm");
    } else {
      // WSOL-quoted: buy directly
      await delay();
      const result = await adapter.buy({
        tokenMint: token,
        amountSol: BUY_AMOUNT_SOL,
        poolAddress: pool,
      });
      logResult("byreal-clmm buy", result);
      expect(result.txSignature).toBeTruthy();
      expect(result.dex).toBe("byreal-clmm");
    }
  });

  test("sell: 100% of token just bought", async () => {
    expect(token).toBeTruthy();
    await delay(10000);
    const result = await adapter.sell({
      tokenMint: token,
      percentage: SELL_PERCENTAGE,
      quoteMint,
      poolAddress: pool,
    });
    logResult("byreal-clmm sell", result);
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

  test.skip("buy: requires known PancakeSwap CLMM pool", async () => {
    // Replace with a real pool address when available
  });
});
