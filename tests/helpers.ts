/**
 * Shared test helpers for mainnet integration tests.
 *
 * These tests execute REAL transactions on Solana mainnet.
 * They require:
 *   - PRIVATE_KEY env var (base58-encoded wallet secret key)
 *   - RPC_URL or HELIUS_RPC_URL env var
 *   - Wallet funded with SOL (tests use tiny amounts: 0.001-0.005 SOL)
 *
 * Run: npm test -- --testPathPattern=<test-file>
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getWallet } from "../src/helpers/config";

// ---------------------------------------------------------------------------
// Well-known token mints (mainnet)
// ---------------------------------------------------------------------------

export const WSOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// ---------------------------------------------------------------------------
// Well-known pool addresses (mainnet, verified active)
//
// These are high-liquidity pools unlikely to disappear.
// If a test fails with PoolNotFound, the pool may have migrated.
// ---------------------------------------------------------------------------

/** Raydium AMM v4: SOL/USDC */
export const RAYDIUM_V4_SOL_USDC = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";

/** Raydium CPMM: SOL/USDC */
export const RAYDIUM_CPMM_SOL_USDC = "7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny";

/** Raydium CLMM: SOL/USDC */
export const RAYDIUM_CLMM_SOL_USDC = "2QdhepnKRTLjjSqPL1PtKNwqrUkoLee2B1d3S4TNagMs";

/** MET token mint */
export const MET = "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL";

/** Random Meteora DBC: 6mwEqau1eKHch1QYCTRv5sdnGtJzVouzaLbKY5LDdoge/SOL pool */
export const METEORA_DBC_GRACE_SOL = "DgxYpXJB2adQ9wFdyoCdnh5fNGfcLxXZsdkdqoyZZmwX";

/** Meteora DAMM v2: MET/SOL pool */
export const METEORA_DAMM_V2_MET_SOL = "9x7WTWq66KbMC1w7AUX72khNg31nQmWRE4N4cDvJY7JT";

/** Meteora DLMM: MET/SOL pool */
export const METEORA_DLMM_MET_SOL = "AsSyvUnbfaZJPRrNh3kUuvZTeHKoMVWEoHz86f4Q5D9x";

/** Orca Whirlpool: SOL/USDC */
export const ORCA_SOL_USDC = "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE";

// ---------------------------------------------------------------------------
// Test amounts
//
// IMPORTANT: Keep these tiny to minimize cost. Even failed TXs cost fees.
// ---------------------------------------------------------------------------

/** Amount of SOL to spend on buy tests */
export const BUY_AMOUNT_SOL = 0.02;

/** Sell percentage for sell tests (sell everything we just bought) */
export const SELL_PERCENTAGE = 100;

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

/**
 * Ensure environment is configured for mainnet tests.
 * Call this in beforeAll() of each test suite.
 */
export async function ensureMainnetReady(): Promise<void> {
  // These will throw if env vars are missing
  const wallet = getWallet();
  const connection = getConnection();

  const balance = await connection.getBalance(wallet.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;

  if (solBalance < 0.01) {
    throw new Error(
      `Wallet ${wallet.publicKey.toBase58()} has only ${solBalance} SOL. ` +
        `Need at least 0.01 SOL to run mainnet tests.`,
    );
  }

  console.log(
    `Wallet: ${wallet.publicKey.toBase58()} | Balance: ${solBalance.toFixed(4)} SOL`,
  );
}

/**
 * Wait for a short delay between tests to avoid RPC rate limiting.
 */
export function delay(ms: number = 2000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log a SwapResult in a readable format.
 */
export function logResult(label: string, result: any): void {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(result, null, 2));
  if (result?.txSignature) {
    console.log(`https://solscan.io/tx/${result.txSignature}`);
  }
}
