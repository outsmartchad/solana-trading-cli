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

/** Raydium AMM v4: SOL/Fartcoin */
export const RAYDIUM_V4_SOL_FARTCOIN = "Bzc9NZfMqkXR6fz1DBph7BDf9BroyEf6pnzESP7v5iiw";

/** Raydium CPMM: SOL/USELESS */
export const RAYDIUM_CPMM_SOL_USELESS = "Q2sPHPdUWFMg7M7wwrQKLrn619cAucfRsmhVJffodSp";

/** Raydium CLMM: SOL/RAY */
export const RAYDIUM_CLMM_SOL_RAY = "2AXXcN6oN9bBT5owwmTH53C7QHUXvhLeu718Kqt8rvY2";

/** MET token mint */
export const MET = "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL";

/** Fartcoin token mint */
export const FARTCOIN = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";

/** USELESS token mint */
export const USELESS = "Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk";

/** RAY token mint */
export const RAY = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";

/** USD1 stablecoin mint */
export const USD1 = "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB";

/** FREEDOM token mint (LaunchLab test token) */
export const FREEDOM = "WAh2JyAzyCusXZC4kmLPpaHz1DoaJHyCwmEBkYpbonk";

/** Raydium LaunchLab: FREEDOM/USD1 */
export const RAYDIUM_LAUNCHLAB_FREEDOM_USD1 = "8AmiUTD86mV64nDbTyWBzVybHhRQJxfjTFhkFkubJhb9";

/** PumpFun bonding curve: OSMTEST token (created for testing) */
export const PUMPFUN_OSMTEST_MINT = "EZdWgakAjiBRyuGbGEe8Pf7tNFCEB4BBDUH8EVkfSNiu";
export const PUMPFUN_OSMTEST_BONDING_CURVE = "7fY2uG79YWdKdqeF7HVn7NRxtgQSA6mt42zoFCw9oJoq";

/** PumpSwap AMM pool */
export const PUMPSWAP_AMM_POOL = "FDrY5i5kuadZ1ik8gPS26qjj9Rw9mpufXMegGC2HNSP7";

/** PumpSwap AMM token mint (base token from pool above) */
export const PUMPSWAP_TOKEN = "8J69rbLTzWWgUJziFY8jeu5tDwEPBwUz4pKBMr5rpump";

/** Random Meteora DBC: 6mwEqau1eKHch1QYCTRv5sdnGtJzVouzaLbKY5LDdoge/SOL pool */
export const METEORA_DBC_GRACE_SOL = "DgxYpXJB2adQ9wFdyoCdnh5fNGfcLxXZsdkdqoyZZmwX";

/** Meteora DAMM v2: MET/SOL pool */
export const METEORA_DAMM_V2_MET_SOL = "9x7WTWq66KbMC1w7AUX72khNg31nQmWRE4N4cDvJY7JT";

/** Meteora DLMM: MET/SOL pool */
export const METEORA_DLMM_MET_SOL = "AsSyvUnbfaZJPRrNh3kUuvZTeHKoMVWEoHz86f4Q5D9x";

/** Orca Whirlpool: SOL/USDC */
export const ORCA_SOL_USDC = "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE";

/** Orca Whirlpool: SOL/pump-token pool for testing buy/sell */
export const ORCA_WHIRLPOOL_POOL = "GpuWWgWuiWkn9fL6EQK55rdwQExkwQJsjuDmhnT3otdK";
export const ORCA_WHIRLPOOL_TOKEN = "8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump";

/** Futarchy AMM pool */
export const FUTARCHY_AMM_POOL = "3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn";
export const FUTARCHY_AMM_TOKEN = "BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta";

/** Byreal CLMM: token/USDC pool */
export const BYREAL_CLMM_POOL = "FYuG64kU4fi6PVt7Sfc5ubwiiSjxg7ux5LFZDDHrp6pp";

/** PancakeSwap CLMM: WSOL/token pool */
export const PANCAKESWAP_CLMM_POOL = "DbRUHWgc6xmdzn619JWFjCMYJRNZmDsDYSdbsbiF7i6b";

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
