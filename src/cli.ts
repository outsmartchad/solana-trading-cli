#!/usr/bin/env node

// Suppress bigint-buffer native binding warning (pure JS fallback works fine)
// bigint-buffer@1.1.5 doesn't have Node 22+ bindings and prints to stderr on load
const _origWarn = process.stderr.write.bind(process.stderr);
(process.stderr.write as any) = (chunk: any, ...args: any[]) => {
  if (typeof chunk === "string" && chunk.includes("bigint: Failed to load bindings")) return true;
  return _origWarn(chunk, ...args);
};

/**
 * outsmart CLI — The Solana trading command-line interface.
 *
 * 18 DEX adapters, 12 TX landing providers, one unified interface.
 *
 * Usage:
 *   # On-chain DEX — pool address required, token auto-detected from pool
 *   outsmart buy  --dex meteora-dlmm --pool <POOL> --amount 0.1
 *   outsmart sell --dex meteora-dlmm --pool <POOL> --pct 100
 *
 *   # Stablecoin pool — auto-swaps SOL→USD1 then buys, no extra steps needed
 *   outsmart buy  --dex raydium-launchlab --pool <POOL> --amount 0.1
 *
 *   # Swap aggregator — requires token mint only (finds best route automatically)
 *   outsmart buy  --dex jupiter-ultra --token <MINT> --amount 0.1
 *   outsmart sell --dex jupiter-ultra --token <MINT> --pct 100
 *
 *   outsmart quote --dex meteora-dlmm --pool <POOL>
 *   outsmart list-dex
 *   outsmart list-dex --cap canSell
 *   outsmart config show
 *   outsmart init
 */

import "dotenv/config";
import { Command } from "commander";

// ---------------------------------------------------------------------------
// Side-effect imports — trigger adapter self-registration
// ---------------------------------------------------------------------------
import "./dex/raydium-amm-v4";
import "./dex/raydium-cpmm";
import "./dex/raydium-clmm";
import "./dex/raydium-launchlab";
import "./dex/meteora-damm-v1";
import "./dex/meteora-damm-v2";
import "./dex/meteora-dlmm";
import "./dex/meteora-dbc";

import "./dex/orca";
import "./dex/byreal-clmm";
import "./dex/pancakeswap-clmm";
import "./dex/fusion-amm";
import "./dex/futarchy-amm";
import "./dex/futarchy-launchpad";
import "./dex/pumpfun";
import "./dex/pumpfun-amm";
import "./dex/jupiter-ultra";
import "./dex/dflow";

// ---------------------------------------------------------------------------
// Internal imports
// ---------------------------------------------------------------------------
import {
  getDexAdapter,
  listDexAdapters,
  getRegistry,
  DexCapabilities,
  WSOL_MINT,
  DEFAULT_SLIPPAGE_BPS,
} from "./dex";

import {
  STABLECOIN_MINTS,
  USDC_MINT,
  USDT_MINT,
  USD1_MINT,
  SOL_STABLECOIN_POOLS,
} from "./dex/types";

import type {
  IDexAdapter,
  BuyParams,
  SellParams,
  PriceInfo,
  SwapOpts,
  SwapResult,
} from "./dex/types";

import { setDryRunMode } from "./transactions/send-rpc";

// ---------------------------------------------------------------------------
// Version from package.json
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../package.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(msg: string): never {
  console.error(`\n  error: ${msg}\n`);
  process.exit(1);
}

/** Suppress console.log during an async operation (hides noisy TX logs) */
async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
}

/** Base58 character set (no 0, O, I, l) */
const BASE58_CHARS = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

/**
 * Validate that a string is a valid Solana base58 address.
 * Checks length (32-44 chars), character set, and PublicKey construction.
 */
function validateBase58(value: string, flag: string): void {
  if (value.length < 32 || value.length > 44) {
    die(`Invalid ${flag}: "${value}" is not a valid Solana address (must be 32-44 characters, got ${value.length})`);
  }
  if (!BASE58_CHARS.test(value)) {
    die(`Invalid ${flag}: "${value}" is not a valid Solana address (contains invalid base58 characters)`);
  }
  try {
    // Dynamic import would be async; use require for synchronous validation
    // PublicKey is already used elsewhere in this file via dynamic import,
    // but for a sync helper we use require.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PublicKey } = require("@solana/web3.js");
    new PublicKey(value);
  } catch {
    die(`Invalid ${flag}: "${value}" is not a valid Solana address`);
  }
}

/**
 * Validate that a DEX name is registered in the adapter registry.
 * Shows available adapters if the name is not found.
 */
function validateDex(dexName: string): void {
  const registry = getRegistry();
  if (!registry.has(dexName)) {
    const available = registry.getNames();
    die(
      `Unknown --dex "${dexName}". Available adapters:\n` +
      available.map((n) => `    ${n}`).join("\n"),
    );
  }
}

/** Well-known token symbols for display */
const KNOWN_SYMBOLS: Record<string, string> = {
  So11111111111111111111111111111111111111112: "SOL",
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB: "USD1",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL: "MET",
};

/** Format a mint address for display — use symbol if known, otherwise abbreviate */
function formatMint(mint: string): string {
  if (KNOWN_SYMBOLS[mint]) return KNOWN_SYMBOLS[mint];
  if (mint === "SOL") return "SOL"; // some adapters already return "SOL"
  if (mint.length > 12) return mint.slice(0, 6) + "..." + mint.slice(-4);
  return mint;
}

function printResult(result: SwapResult): void {
  console.log();
  console.log(`  dex:       ${result.dex}`);
  if (result.txSignature) {
    console.log(`  tx:        ${result.txSignature}`);
  }
  console.log(`  confirmed: ${result.confirmed}`);
  console.log(`  in:        ${result.amountIn} ${formatMint(result.amountInToken)}`);
  if (result.amountOut != null) {
    console.log(`  out:       ${result.amountOut} ${formatMint(result.amountOutToken ?? "")}`);
  }
  if (result.poolAddress) {
    console.log(`  pool:      ${result.poolAddress}`);
  }
  if (result.priceImpactPct != null) {
    console.log(`  impact:    ${result.priceImpactPct.toFixed(2)}%`);
  }
  console.log();
}

/** Friendly label for a stablecoin mint */
function stablecoinLabel(mint: string): string {
  if (mint === USDC_MINT) return "USDC";
  if (mint === USDT_MINT) return "USDT";
  if (mint === USD1_MINT) return "USD1";
  return mint.slice(0, 8) + "...";
}

/**
 * Pool resolution result — contains both the token to trade and the quote mint.
 */
interface PoolResolution {
  tokenMint: string;
  quoteMint: string;
  price: PriceInfo;
}

/**
 * Resolve the token mint and quote mint from pool state.
 *
 * Calls adapter.getPrice(pool) which decodes the pool account and returns
 * baseMint + quoteMint. We determine which is the "token" (what the user
 * wants to buy/sell) and which is the "quote" (SOL or stablecoin).
 *
 * Priority: SOL > USDC/USDT/USD1 > error (ambiguous).
 */
async function resolvePool(
  adapter: IDexAdapter,
  poolAddress: string,
): Promise<PoolResolution> {
  if (!adapter.capabilities.canGetPrice || !adapter.getPrice) {
    die(`${adapter.name} cannot auto-detect token from pool — please provide --token <mint>`);
  }

  const price = await adapter.getPrice(poolAddress);
  const { baseMint, quoteMint } = price;

  // SOL as quote — most common
  if (quoteMint === WSOL_MINT) return { tokenMint: baseMint, quoteMint, price };
  if (baseMint === WSOL_MINT) return { tokenMint: quoteMint, quoteMint: baseMint, price };

  // Stablecoin as quote
  if (STABLECOIN_MINTS.has(quoteMint)) return { tokenMint: baseMint, quoteMint, price };
  if (STABLECOIN_MINTS.has(baseMint)) return { tokenMint: quoteMint, quoteMint: baseMint, price };

  // Neither side is SOL or stablecoin — ambiguous
  die(
    `Pool ${poolAddress} has no SOL or stablecoin side (${baseMint} / ${quoteMint}).\n`
    + `  Please specify --token <mint> to indicate which token to trade.`,
  );
}

/**
 * Get the SPL token balance for a mint in the user's wallet.
 */
async function getTokenBalance(mint: string): Promise<{ amount: number; raw: bigint; decimals: number }> {
  const { getConnection, getWallet } = await import("./helpers/config");
  const { PublicKey } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");

  const connection = getConnection();
  const wallet = getWallet();
  const mintPk = new PublicKey(mint);

  try {
    const ata = await getAssociatedTokenAddress(mintPk, wallet.publicKey);
    const res = await connection.getTokenAccountBalance(ata);
    return {
      amount: Number(res.value.uiAmount ?? 0),
      raw: BigInt(res.value.amount),
      decimals: res.value.decimals,
    };
  } catch {
    return { amount: 0, raw: 0n, decimals: 0 };
  }
}

/**
 * Get the native SOL balance for the wallet (in SOL, not lamports).
 */
async function getSolBalance(): Promise<number> {
  const { getConnection, getWallet } = await import("./helpers/config");
  const connection = getConnection();
  const wallet = getWallet();
  const lamports = await connection.getBalance(wallet.publicKey);
  return lamports / 1e9;
}

/**
 * Snapshot output balance, run a swap, then compute the delta to fill amountOut.
 * Works for both buy (output = token) and sell (output = SOL or quote token).
 */
async function fillAmountOut(
  result: SwapResult,
  outputMint: string,
  balanceBefore: number,
): Promise<void> {
  if (result.amountOut != null) return; // adapter already provided it
  if (!result.confirmed) return; // TX didn't confirm, no point checking

  // Small delay for balance settlement
  await new Promise((r) => setTimeout(r, 1500));

  let balanceAfter: number;
  if (outputMint === WSOL_MINT || outputMint === "SOL") {
    balanceAfter = await getSolBalance();
  } else {
    const bal = await getTokenBalance(outputMint);
    balanceAfter = bal.amount;
  }

  const delta = balanceAfter - balanceBefore;
  if (delta > 0) {
    result.amountOut = parseFloat(delta.toFixed(9));
    result.amountOutToken = result.amountOutToken ?? outputMint;
  }
}

/**
 * Check if Jupiter Ultra API is available (JUPITER_API_KEY is set).
 */
function hasJupiterApiKey(): boolean {
  return !!process.env.JUPITER_API_KEY;
}

/**
 * Auto-swap SOL → stablecoin. Uses jupiter-ultra if JUPITER_API_KEY is set,
 * otherwise falls back to on-chain DEX adapters from SOL_STABLECOIN_POOLS.
 * Returns the stablecoin amount received.
 */
async function autoSwapSolToStablecoin(
  stablecoinMint: string,
  amountSol: number,
): Promise<number> {
  const label = stablecoinLabel(stablecoinMint);

  // Snapshot balance BEFORE swap so we return only the delta
  const balanceBefore = await getTokenBalance(stablecoinMint);

  if (hasJupiterApiKey()) {
    // --- Jupiter Ultra path ---
    console.log(`\n  step 1: swapping ${amountSol} SOL → ${label} via jupiter-ultra...`);
    const jupAdapter = getDexAdapter("jupiter-ultra");
    const result = await jupAdapter.buy({
      tokenMint: stablecoinMint,
      amountSol,
    });

    if (!result.txSignature) {
      die(`Failed to swap SOL → ${label}: no transaction signature returned`);
    }
    console.log(`  ✓ tx: ${result.txSignature}`);
    if (result.confirmed) console.log(`  ✓ confirmed`);
  } else {
    // --- On-chain fallback path ---
    const pools = SOL_STABLECOIN_POOLS[stablecoinMint];
    if (!pools || pools.length === 0) {
      die(`No on-chain SOL/${label} pools configured and JUPITER_API_KEY is not set.`);
    }

    let swapped = false;
    for (const entry of pools) {
      try {
        const adapter = getDexAdapter(entry.dex);
        console.log(`\n  step 1: swapping ${amountSol} SOL → ${label} via ${entry.dex} (pool ${entry.pool.slice(0, 8)}...)...`);
        const result = await adapter.buy({
          tokenMint: stablecoinMint,
          amountSol,
          poolAddress: entry.pool,
          quoteMint: WSOL_MINT,
        });

        if (!result.txSignature) {
          console.log(`  ✗ no tx signature, trying next pool...`);
          continue;
        }
        console.log(`  ✓ tx: ${result.txSignature}`);
        if (result.confirmed) console.log(`  ✓ confirmed`);
        swapped = true;
        break;
      } catch (err: any) {
        console.log(`  ✗ ${entry.dex} failed: ${err.message ?? err}. Trying next pool...`);
      }
    }

    if (!swapped) {
      die(
        `All on-chain SOL/${label} pools failed. Set JUPITER_API_KEY for jupiter-ultra fallback,\n`
        + `  or check your SOL balance and RPC connection.`,
      );
    }
  }

  // Wait for balance to settle, then compute delta (only the swapped amount)
  await new Promise((r) => setTimeout(r, 2000));
  const balanceAfter = await getTokenBalance(stablecoinMint);
  const received = balanceAfter.amount - balanceBefore.amount;
  console.log(`  ✓ received: ${received.toFixed(6)} ${label} (wallet total: ${balanceAfter.amount} ${label})`);

  if (received <= 0) {
    die(`SOL → ${label} swap TX landed but received 0 ${label}. TX may have failed on-chain.`);
  }

  return received;
}

/**
 * Auto-swap stablecoin → SOL after a sell. Uses jupiter-ultra if JUPITER_API_KEY
 * is set, otherwise falls back to on-chain DEX adapters.
 */
async function autoSwapStablecoinToSol(stablecoinMint: string): Promise<void> {
  const balance = await getTokenBalance(stablecoinMint);
  if (balance.amount === 0) return;

  const label = stablecoinLabel(stablecoinMint);

  if (hasJupiterApiKey()) {
    // --- Jupiter Ultra path ---
    console.log(`\n  step 2: swapping ${balance.amount} ${label} → SOL via jupiter-ultra...`);
    const jupAdapter = getDexAdapter("jupiter-ultra");
    const result = await jupAdapter.sell({
      tokenMint: stablecoinMint,
      percentage: 100,
    });

    if (result.txSignature) {
      console.log(`  ✓ tx: ${result.txSignature}`);
      if (result.confirmed) console.log(`  ✓ confirmed`);
    }
  } else {
    // --- On-chain fallback path ---
    const pools = SOL_STABLECOIN_POOLS[stablecoinMint];
    if (!pools || pools.length === 0) {
      console.log(`\n  ⚠ No on-chain ${label}/SOL pools configured and JUPITER_API_KEY is not set. ${label} remains in wallet.`);
      return;
    }

    for (const entry of pools) {
      try {
        const adapter = getDexAdapter(entry.dex);
        console.log(`\n  step 2: swapping ${balance.amount} ${label} → SOL via ${entry.dex} (pool ${entry.pool.slice(0, 8)}...)...`);
        const result = await adapter.sell({
          tokenMint: stablecoinMint,
          percentage: 100,
          poolAddress: entry.pool,
          quoteMint: WSOL_MINT,
        });

        if (result.txSignature) {
          console.log(`  ✓ tx: ${result.txSignature}`);
          if (result.confirmed) console.log(`  ✓ confirmed`);
          return;
        }
        console.log(`  ✗ no tx signature, trying next pool...`);
      } catch (err: any) {
        console.log(`  ✗ ${entry.dex} failed: ${err.message ?? err}. Trying next pool...`);
      }
    }

    console.log(`\n  ⚠ All on-chain ${label}/SOL pools failed. ${label} remains in wallet.`);
  }
}

function buildSwapOpts(cmd: {
  slippage?: string;
  priority?: string;
  tip?: string;
  cu?: string;
  jito?: boolean;
  strategy?: string;
  dryRun?: boolean;
}): SwapOpts {
  const opts: SwapOpts = {};
  if (cmd.slippage != null) opts.slippageBps = Number(cmd.slippage);
  if (cmd.priority != null) opts.priorityFeeMicroLamports = Number(cmd.priority);
  if (cmd.tip != null) opts.tipSol = Number(cmd.tip);
  if (cmd.cu != null) opts.computeUnitLimit = Number(cmd.cu);
  if (cmd.jito) opts.useJito = true;
  if (cmd.strategy != null) {
    opts.landingStrategy = cmd.strategy as SwapOpts["landingStrategy"];
  }
  if (cmd.dryRun) opts.dryRun = true;
  return opts;
}

/**
 * Shared option definitions for swap commands.
 * @param includeTip - whether to add --tip (false for snipe, which has it as required)
 */
function addSwapOptions(cmd: Command, includeTip = true): Command {
  cmd
    .option("--slippage <bps>", `slippage tolerance in basis points (default: ${DEFAULT_SLIPPAGE_BPS})`)
    .option("--priority <microLamports>", "priority fee in microLamports per CU")
    .option("--cu <units>", "compute unit limit")
    .option("--jito", "use Jito bundle submission")
    .option("--strategy <mode>", "TX landing strategy: concurrent|race|random|sequential")
    .option("--quote <mint>", "quote token mint (default: WSOL)")
    .option("--dry-run", "simulate the transaction without sending (preview CU usage and errors)");
  if (includeTip) {
    cmd.option("--tip <sol>", "MEV tip in SOL");
  }
  return cmd;
}

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

const program = new Command()
  .name("outsmart")
  .description("The Solana trading CLI — 18 DEX adapters, 12 TX landing providers.")
  .version(pkg.version);

// ---------------------------------------------------------------------------
// outsmart buy
// ---------------------------------------------------------------------------

const buyCmd = new Command("buy")
  .description("Buy tokens with SOL (or quote token)")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. raydium-cpmm, jupiter-ultra)")
  .requiredOption("-a, --amount <sol>", "amount of SOL to spend")
  .option("-p, --pool <address>", "pool address (required for on-chain DEXes)")
  .option("-t, --token <mint>", "token mint address to buy")
  .action(async (cmdOpts) => {
    // --- Input sanitization ---
    validateDex(cmdOpts.dex);
    if (cmdOpts.pool) validateBase58(cmdOpts.pool, "--pool");
    if (cmdOpts.token) validateBase58(cmdOpts.token, "--token");
    if (cmdOpts.quote) validateBase58(cmdOpts.quote, "--quote");

    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canBuy) {
      die(`${adapter.name} does not support buy`);
    }

    // Validate inputs based on adapter type
    if (adapter.capabilities.isAggregator) {
      // Aggregators (jupiter-ultra, dflow): need --token, no --pool needed
      if (!cmdOpts.token) {
        die(`${adapter.name} is a swap aggregator — --token <mint> is required.\n  Example: outsmart buy --dex ${adapter.name} --token <MINT> --amount 0.1`);
      }
    } else {
      // On-chain DEXes: need --pool (--token is optional, auto-resolved from pool)
      if (!cmdOpts.pool) {
        die(`${adapter.name} is an on-chain DEX — --pool <address> is required.\n  Example: outsmart buy --dex ${adapter.name} --pool <POOL> --amount 0.1`);
      }
    }

    // Auto-resolve token + quote from pool state
    let tokenMint: string = cmdOpts.token;
    let quoteMint: string | undefined = cmdOpts.quote;
    let amountToSpend = Number(cmdOpts.amount);
    if (isNaN(amountToSpend) || amountToSpend <= 0) {
      die(`Invalid --amount: ${cmdOpts.amount}. Must be a positive number.`);
    }

    if (!tokenMint && cmdOpts.pool) {
      const resolved = await resolvePool(adapter, cmdOpts.pool);
      tokenMint = resolved.tokenMint;
      quoteMint = quoteMint ?? resolved.quoteMint;
      console.log(`  auto-detected token: ${tokenMint}`);

      // If the quote is a stablecoin (not SOL), auto-swap SOL → stablecoin first
      if (resolved.quoteMint !== WSOL_MINT && STABLECOIN_MINTS.has(resolved.quoteMint)) {
        const label = stablecoinLabel(resolved.quoteMint);
        console.log(`  pool quote: ${label} (not SOL)`);
        quoteMint = resolved.quoteMint;

        // Check existing balance
        const existingBalance = await getTokenBalance(resolved.quoteMint);
        if (existingBalance.amount > 0) {
          console.log(`  wallet has ${existingBalance.amount} ${label}`);
        }

        // Swap SOL → stablecoin, then use full stablecoin balance for the buy
        amountToSpend = await autoSwapSolToStablecoin(resolved.quoteMint, amountToSpend);
      }
    }

    const params: BuyParams = {
      tokenMint,
      amountSol: amountToSpend,
      poolAddress: cmdOpts.pool,
      quoteMint,
      opts: buildSwapOpts(cmdOpts),
    };

    const isStablecoinQuote = quoteMint && STABLECOIN_MINTS.has(quoteMint);
    const isDryRun = !!cmdOpts.dryRun;

    // Activate global dry-run mode so all send functions simulate without sending
    if (isDryRun) {
      setDryRunMode(true);
      console.log(`\n  DRY RUN — simulating only, no transaction will be sent\n`);
    }

    const stepLabel = isStablecoinQuote ? "step 2: " : "";
    console.log(`\n  ${stepLabel}buying on ${adapter.name}...`);

    // Snapshot output token balance before swap to compute amountOut
    const outputMint = tokenMint;
    const balBefore = outputMint && !isDryRun ? (await getTokenBalance(outputMint)).amount : 0;

    const result = await adapter.buy(params);

    // Fill amountOut from balance delta if adapter didn't provide it
    if (outputMint && !isDryRun) {
      await fillAmountOut(result, outputMint, balBefore);
      result.amountOutToken = result.amountOutToken ?? outputMint;
    }

    if (isDryRun) {
      setDryRunMode(false);
    }

    printResult(result);
  });

addSwapOptions(buyCmd);
program.addCommand(buyCmd);

// ---------------------------------------------------------------------------
// outsmart sell
// ---------------------------------------------------------------------------

const sellCmd = new Command("sell")
  .description("Sell tokens for SOL (or quote token)")
  .requiredOption("-d, --dex <name>", "DEX adapter name")
  .requiredOption("--pct <percentage>", "percentage of held balance to sell (0-100)")
  .option("-p, --pool <address>", "pool address (required for on-chain DEXes)")
  .option("-t, --token <mint>", "token mint address to sell")
  .action(async (cmdOpts) => {
    // --- Input sanitization ---
    validateDex(cmdOpts.dex);
    if (cmdOpts.pool) validateBase58(cmdOpts.pool, "--pool");
    if (cmdOpts.token) validateBase58(cmdOpts.token, "--token");
    if (cmdOpts.quote) validateBase58(cmdOpts.quote, "--quote");

    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canSell) {
      die(`${adapter.name} does not support sell`);
    }

    // Validate inputs based on adapter type
    if (adapter.capabilities.isAggregator) {
      // Aggregators (jupiter-ultra, dflow): need --token, no --pool needed
      if (!cmdOpts.token) {
        die(`${adapter.name} is a swap aggregator — --token <mint> is required.\n  Example: outsmart sell --dex ${adapter.name} --token <MINT> --pct 100`);
      }
    } else {
      // On-chain DEXes: need --pool (--token is optional, auto-resolved from pool)
      if (!cmdOpts.pool) {
        die(`${adapter.name} is an on-chain DEX — --pool <address> is required.\n  Example: outsmart sell --dex ${adapter.name} --pool <POOL> --pct 100`);
      }
    }

    const pct = Number(cmdOpts.pct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      die(`Invalid --pct: ${cmdOpts.pct}. Must be between 1 and 100.`);
    }

    // Auto-resolve token + quote from pool state
    let tokenMint: string = cmdOpts.token;
    let quoteMint: string | undefined = cmdOpts.quote;
    let isStablecoinQuote = false;

    if (!tokenMint && cmdOpts.pool) {
      const resolved = await resolvePool(adapter, cmdOpts.pool);
      tokenMint = resolved.tokenMint;
      quoteMint = quoteMint ?? resolved.quoteMint;
      console.log(`  auto-detected token: ${tokenMint}`);

      if (resolved.quoteMint !== WSOL_MINT && STABLECOIN_MINTS.has(resolved.quoteMint)) {
        isStablecoinQuote = true;
        const label = stablecoinLabel(resolved.quoteMint);
        console.log(`  pool quote: ${label} (will auto-convert to SOL after sell)`);
      }
    }

    const params: SellParams = {
      tokenMint,
      percentage: pct,
      poolAddress: cmdOpts.pool,
      quoteMint,
      opts: buildSwapOpts(cmdOpts),
    };

    const isDryRun = !!cmdOpts.dryRun;

    // Activate global dry-run mode so all send functions simulate without sending
    if (isDryRun) {
      setDryRunMode(true);
      console.log(`\n  DRY RUN — simulating only, no transaction will be sent\n`);
    }

    const stepLabel = isStablecoinQuote ? "step 1: " : "";
    console.log(`\n  ${stepLabel}selling ${params.percentage}% on ${adapter.name}...`);

    // Snapshot output balance before swap to compute amountOut
    const sellOutputMint = quoteMint ?? WSOL_MINT;
    const sellBalBefore = !isDryRun
      ? ((sellOutputMint === WSOL_MINT || sellOutputMint === "SOL")
        ? await getSolBalance()
        : (await getTokenBalance(sellOutputMint)).amount)
      : 0;

    const result = await adapter.sell(params);

    // Fill amountOut from balance delta if adapter didn't provide it
    if (!isDryRun) {
      await fillAmountOut(result, sellOutputMint, sellBalBefore);
      result.amountOutToken = result.amountOutToken ?? sellOutputMint;
    }

    if (isDryRun) {
      setDryRunMode(false);
    }

    printResult(result);

    // Auto-swap stablecoin proceeds → SOL
    if (isStablecoinQuote && quoteMint && result.txSignature && !isDryRun) {
      await autoSwapStablecoinToSol(quoteMint);
    }
  });

addSwapOptions(sellCmd);
program.addCommand(sellCmd);

// ---------------------------------------------------------------------------
// outsmart snipe — NOT YET IMPLEMENTED
//
// Real sniping requires a gRPC (Geyser/Yellowstone) listener that monitors
// pool creation events in real time. When a new pool is created where the
// base or quote token matches the target, it fires an instant buy through
// concurrent multi-provider TX landing.
//
// This needs the user's own Geyser gRPC key and runs as a background
// process (cronjob/tmux). Will be added when gRPC integration is built.
//
// For now, use `outsmart buy --pool <POOL> --tip <SOL>` to execute a
// competitive buy on a known pool.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// outsmart quote
// ---------------------------------------------------------------------------

program
  .command("quote")
  .description("Get the current on-chain price from a pool")
  .requiredOption("-d, --dex <name>", "DEX adapter name")
  .requiredOption("-p, --pool <address>", "pool address")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canGetPrice) {
      die(`${adapter.name} does not support getPrice`);
    }
    if (!adapter.getPrice) {
      die(`${adapter.name} declares canGetPrice but has no getPrice() implementation`);
    }

    const price = await adapter.getPrice(cmdOpts.pool);
    console.log();
    console.log(`  dex:       ${adapter.name}`);
    console.log(`  pool:      ${price.poolAddress}`);
    console.log(`  price:     ${price.price}`);
    console.log(`  base:      ${price.baseMint}`);
    console.log(`  quote:     ${price.quoteMint}`);
    console.log(`  source:    ${price.source}`);
    console.log(`  time:      ${new Date(price.timestamp).toISOString()}`);
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart find-pool
// ---------------------------------------------------------------------------

program
  .command("find-pool")
  .description("Discover a pool for a token pair on a specific DEX")
  .requiredOption("-d, --dex <name>", "DEX adapter name")
  .requiredOption("-t, --token <mint>", "base token mint address")
  .option("--quote <mint>", "quote token mint (default: WSOL)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canFindPool) {
      die(`${adapter.name} does not support findPool`);
    }
    if (!adapter.findPool) {
      die(`${adapter.name} declares canFindPool but has no findPool() implementation`);
    }

    const pool = await adapter.findPool(cmdOpts.token, cmdOpts.quote);
    if (!pool) {
      console.log(`\n  No pool found for ${cmdOpts.token} on ${adapter.name}\n`);
      process.exit(1);
    }

    console.log();
    console.log(`  dex:            ${pool.dex}`);
    console.log(`  protocol:       ${pool.protocol}`);
    console.log(`  pool:           ${pool.address}`);
    console.log(`  base:           ${pool.baseMint} (${pool.baseDecimals} decimals)`);
    console.log(`  quote:          ${pool.quoteMint} (${pool.quoteDecimals} decimals)`);
    if (pool.liquidity != null) {
      console.log(`  liquidity:      $${pool.liquidity.toLocaleString()}`);
    }
    if (pool.price != null) {
      console.log(`  price:          ${pool.price}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart add-liq
// ---------------------------------------------------------------------------

program
  .command("add-liq")
  .description("Add liquidity to a pool")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .option("--amount-sol <amount>", "amount of SOL to deposit")
  .option("--amount-token <amount>", "amount of non-SOL token to deposit")
  .option("-t, --token <mint>", "token mint (for single-sided token deposits)")
  .option("--strategy <type>", "distribution strategy: spot|curve|bid-ask (default: spot)")
  .option("--bins <count>", "number of bins to spread across (default: 50, max: 70)")
  .option("--amount-a <amount>", "amount of token A (legacy, use --amount-sol instead)")
  .option("--amount-b <amount>", "amount of token B (legacy, use --amount-token instead)")
  .option("--slippage <bps>", "slippage tolerance in basis points")
  .option("--priority <microLamports>", "priority fee in microLamports per CU")
  .option("--tip <sol>", "MEV tip in SOL")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canAddLiquidity) {
      die(`${adapter.name} does not support addLiquidity`);
    }
    if (!adapter.addLiquidity) {
      die(`${adapter.name} declares canAddLiquidity but has no addLiquidity() implementation`);
    }

    // Validate: at least one amount must be provided
    const hasAmountSol = cmdOpts.amountSol != null;
    const hasAmountToken = cmdOpts.amountToken != null;
    const hasLegacyA = cmdOpts.amountA != null;
    const hasLegacyB = cmdOpts.amountB != null;

    if (!hasAmountSol && !hasAmountToken && !hasLegacyA && !hasLegacyB) {
      die("At least one of --amount-sol or --amount-token must be provided.\n"
        + "  Examples:\n"
        + `    outsmart add-liq --dex ${adapter.name} --pool <POOL> --amount-sol 0.5\n`
        + `    outsmart add-liq --dex ${adapter.name} --pool <POOL> --amount-token 1000 --token <MINT>\n`
        + `    outsmart add-liq --dex ${adapter.name} --pool <POOL> --amount-sol 0.5 --amount-token 1000`);
    }

    // Validate strategy
    const validStrategies = ["spot", "curve", "bid-ask"];
    if (cmdOpts.strategy && !validStrategies.includes(cmdOpts.strategy)) {
      die(`Invalid strategy "${cmdOpts.strategy}". Must be one of: ${validStrategies.join(", ")}`);
    }

    const params: import("./dex/types").AddLiquidityParams = {
      poolAddress: cmdOpts.pool,
      amountSol: hasAmountSol ? Number(cmdOpts.amountSol) : undefined,
      amountToken: hasAmountToken ? Number(cmdOpts.amountToken) : undefined,
      tokenMint: cmdOpts.token,
      strategy: cmdOpts.strategy,
      bins: cmdOpts.bins != null ? Number(cmdOpts.bins) : undefined,
      amountA: hasLegacyA ? Number(cmdOpts.amountA) : undefined,
      amountB: hasLegacyB ? Number(cmdOpts.amountB) : undefined,
      opts: buildSwapOpts(cmdOpts),
    };

    const mode = params.amountSol && params.amountToken
      ? "balanced" : params.amountSol ? "one-sided SOL" : "one-sided token";
    console.log(`\n  adding ${mode} liquidity on ${adapter.name} (pool: ${params.poolAddress})...`);
    if (cmdOpts.strategy) console.log(`  strategy:  ${cmdOpts.strategy}`);
    if (cmdOpts.bins) console.log(`  bins:      ${cmdOpts.bins}`);

    const result = await adapter.addLiquidity(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.positionAddress) {
      console.log(`  position:  ${result.positionAddress}`);
    }
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart remove-liq
// ---------------------------------------------------------------------------

program
  .command("remove-liq")
  .description("Remove liquidity from a pool")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .requiredOption("--pct <percentage>", "percentage of LP position to remove (0-100)")
  .option("--position <address>", "specific position address to remove from (default: first found)")
  .option("--slippage <bps>", "slippage tolerance in basis points")
  .option("--priority <microLamports>", "priority fee in microLamports per CU")
  .option("--tip <sol>", "MEV tip in SOL")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canRemoveLiquidity) {
      die(`${adapter.name} does not support removeLiquidity`);
    }
    if (!adapter.removeLiquidity) {
      die(`${adapter.name} declares canRemoveLiquidity but has no removeLiquidity() implementation`);
    }

    const params: import("./dex/types").RemoveLiquidityParams = {
      poolAddress: cmdOpts.pool,
      percentage: Number(cmdOpts.pct),
      positionAddress: cmdOpts.position,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  removing ${params.percentage}% liquidity on ${adapter.name} (pool: ${params.poolAddress})...`);
    if (params.positionAddress) {
      console.log(`  position:  ${params.positionAddress}`);
    }
    const result = await adapter.removeLiquidity(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.positionAddress) {
      console.log(`  position:  ${result.positionAddress}`);
    }
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart claim-fees
// ---------------------------------------------------------------------------

program
  .command("claim-fees")
  .description("Claim accumulated swap fees from LP positions")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .option("--position <address>", "specific position address to claim from (default: first found)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canClaimFees) {
      die(`${adapter.name} does not support claimFees`);
    }
    if (!adapter.claimFees) {
      die(`${adapter.name} declares canClaimFees but has no claimFees() implementation`);
    }

    console.log(`\n  claiming fees on ${adapter.name} (pool: ${cmdOpts.pool})...`);
    const result = await adapter.claimFees(cmdOpts.pool, cmdOpts.position);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.positionAddress) {
      console.log(`  position:  ${result.positionAddress}`);
    }
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart positions
// ---------------------------------------------------------------------------

program
  .command("positions")
  .description("List LP positions in a pool")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .option("--json", "output as JSON")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canListPositions) {
      die(`${adapter.name} does not support listPositions`);
    }
    if (!adapter.listPositions) {
      die(`${adapter.name} declares canListPositions but has no listPositions() implementation`);
    }

    const positions = await adapter.listPositions(cmdOpts.pool);

    if (cmdOpts.json) {
      console.log(JSON.stringify(positions, null, 2));
      return;
    }

    if (positions.length === 0) {
      console.log(`\n  No positions found in pool ${cmdOpts.pool}\n`);
      return;
    }

    console.log(`\n  ${positions.length} position(s) in pool ${cmdOpts.pool}:\n`);

    for (const pos of positions) {
      console.log(`  position:  ${pos.positionAddress}`);
      console.log(`  bins:      ${pos.lowerBinId} → ${pos.upperBinId}`);
      console.log(`  in-range:  ${pos.inRange}`);
      console.log(`  tokenX:    ${pos.amountX} (${pos.tokenXMint})`);
      console.log(`  tokenY:    ${pos.amountY} (${pos.tokenYMint})`);
      console.log(`  feeX:      ${pos.feeX}`);
      console.log(`  feeY:      ${pos.feeY}`);
      console.log();
    }
  });

// ---------------------------------------------------------------------------
// outsmart create-pump-coin (PumpFun bonding curve)
// ---------------------------------------------------------------------------

program
  .command("create-pump-coin")
  .description("Create a new PumpFun token with a bonding curve")
  .requiredOption("--name <name>", "token name")
  .requiredOption("--symbol <symbol>", "token symbol")
  .requiredOption("--uri <uri>", "metadata URI (IPFS link to JSON metadata)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter("pumpfun") as import("./dex/pumpfun").PumpFunAdapter;

    console.log(`\n  creating token "${cmdOpts.name}" (${cmdOpts.symbol}) on pump.fun...`);
    const result = await adapter.create(cmdOpts.name, cmdOpts.symbol, cmdOpts.uri);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.positionAddress) {
      console.log(`  mint:      ${result.positionAddress}`);
    }
    if (result.poolAddress) {
      console.log(`  curve:     ${result.poolAddress}`);
    }
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart create-pool (PumpSwap AMM)
// ---------------------------------------------------------------------------

program
  .command("create-pool")
  .description("Create a new PumpSwap AMM pool with initial liquidity")
  .requiredOption("--base <mint>", "base token mint address")
  .requiredOption("--quote <mint>", "quote token mint address (usually WSOL)")
  .requiredOption("--base-amount <amount>", "initial base token deposit (human-readable)")
  .requiredOption("--quote-amount <amount>", "initial quote token deposit (human-readable)")
  .option("--index <number>", "pool index (default: 1; 0 is reserved for canonical pump pools)", "1")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter("pumpfun-amm") as import("./dex/pumpfun-amm").PumpFunAmmAdapter;

    console.log(`\n  creating pool on PumpSwap AMM...`);
    console.log(`  base:      ${cmdOpts.base}`);
    console.log(`  quote:     ${cmdOpts.quote}`);
    console.log(`  amounts:   ${cmdOpts.baseAmount} base + ${cmdOpts.quoteAmount} quote`);
    console.log(`  index:     ${cmdOpts.index}`);

    const result = await adapter.createPool(
      cmdOpts.base,
      cmdOpts.quote,
      Number(cmdOpts.baseAmount),
      Number(cmdOpts.quoteAmount),
      Number(cmdOpts.index),
    );
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.poolAddress) {
      console.log(`  pool:      ${result.poolAddress}`);
    }
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart create-damm-pool (DAMM v2 custom pool — full fee config)
// ---------------------------------------------------------------------------

program
  .command("create-damm-pool")
  .description("Create a Meteora DAMM v2 custom pool with full fee configuration")
  .requiredOption("--base <mint>", "base token mint address")
  .requiredOption("--base-amount <amount>", "initial base token deposit (human-readable)")
  .requiredOption("--quote-amount <amount>", "initial quote token deposit (human-readable)")
  .option("--quote <mint>", "quote token mint (default: WSOL)")
  .option("--price <number>", "initial price in quote/base units (default: quoteAmount / baseAmount)")
  .option("--max-fee <bps>", "max base fee in bps, charged at activation (default: 9900)", "9900")
  .option("--min-fee <bps>", "min base fee in bps, reached after decay (default: 200)", "200")
  .option("--periods <n>", "number of fee decay periods (default: 1440)", "1440")
  .option("--duration <secs>", "total fee decay duration in seconds (default: 86400)", "86400")
  .option("--fee-mode <0|1>", "fee scheduler: 0=linear, 1=exponential (default: 0)", "0")
  .option("--dynamic-fee", "enable dynamic fee on top of base fee")
  .option("--collect-mode <0|1>", "fee collection: 0=both tokens, 1=quote only (default: 1)", "1")
  .option("--activation <timestamp>", "activation unix timestamp (default: immediate)")
  .option("--alpha-vault", "create alpha vault after pool")
  .option("--priority <microLamports>", "priority fee in microLamports per CU")
  .option("--cu <units>", "compute unit limit")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter("meteora-damm-v2") as import("./dex/meteora-damm-v2").MeteoraDammV2Adapter;

    const params: import("./dex/types").CreateCustomPoolParams = {
      baseMint: cmdOpts.base,
      quoteMint: cmdOpts.quote,
      baseAmount: Number(cmdOpts.baseAmount),
      quoteAmount: Number(cmdOpts.quoteAmount),
      initPrice: cmdOpts.price ? Number(cmdOpts.price) : undefined,
      poolFees: {
        maxBaseFeeBps: Number(cmdOpts.maxFee),
        minBaseFeeBps: Number(cmdOpts.minFee),
        numberOfPeriod: Number(cmdOpts.periods),
        totalDuration: Number(cmdOpts.duration),
        feeSchedulerMode: Number(cmdOpts.feeMode),
        useDynamicFee: !!cmdOpts.dynamicFee,
        dynamicFeeConfig: null,
      },
      collectFeeMode: Number(cmdOpts.collectMode),
      activationType: 1, // timestamp
      activationPoint: cmdOpts.activation ? Number(cmdOpts.activation) : null,
      hasAlphaVault: !!cmdOpts.alphaVault,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  creating DAMM v2 custom pool...`);
    console.log(`  base:      ${cmdOpts.base}`);
    console.log(`  quote:     ${cmdOpts.quote ?? "WSOL"}`);
    console.log(`  amounts:   ${cmdOpts.baseAmount} base + ${cmdOpts.quoteAmount} quote`);
    console.log(`  fees:      ${cmdOpts.maxFee} → ${cmdOpts.minFee} bps (${cmdOpts.feeMode === "1" ? "exponential" : "linear"})`);

    const result = await adapter.createCustomPool(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.poolAddress) console.log(`  pool:      ${result.poolAddress}`);
    if (result.positionAddress) console.log(`  position:  ${result.positionAddress}`);
    if (result.error) console.log(`  error:     ${result.error}`);
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart create-damm-config-pool (DAMM v2 config-based pool)
// ---------------------------------------------------------------------------

program
  .command("create-damm-config-pool")
  .description("Create a Meteora DAMM v2 pool using an existing config")
  .requiredOption("--base <mint>", "base token mint address")
  .requiredOption("--base-amount <amount>", "initial base token deposit (human-readable)")
  .requiredOption("--quote-amount <amount>", "initial quote token deposit (human-readable)")
  .requiredOption("--config <address>", "on-chain config address")
  .option("--quote <mint>", "quote token mint (default: WSOL)")
  .option("--price <number>", "initial price in quote/base units (default: quoteAmount / baseAmount)")
  .option("--activation <timestamp>", "activation unix timestamp (default: immediate)")
  .option("--lock", "permanently lock the initial liquidity")
  .option("--priority <microLamports>", "priority fee in microLamports per CU")
  .option("--cu <units>", "compute unit limit")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter("meteora-damm-v2") as import("./dex/meteora-damm-v2").MeteoraDammV2Adapter;

    const params: import("./dex/types").CreateConfigPoolParams = {
      baseMint: cmdOpts.base,
      quoteMint: cmdOpts.quote,
      baseAmount: Number(cmdOpts.baseAmount),
      quoteAmount: Number(cmdOpts.quoteAmount),
      initPrice: cmdOpts.price ? Number(cmdOpts.price) : undefined,
      configAddress: cmdOpts.config,
      activationPoint: cmdOpts.activation ? Number(cmdOpts.activation) : null,
      lockLiquidity: !!cmdOpts.lock,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  creating DAMM v2 config-based pool...`);
    console.log(`  base:      ${cmdOpts.base}`);
    console.log(`  quote:     ${cmdOpts.quote ?? "WSOL"}`);
    console.log(`  config:    ${cmdOpts.config}`);
    console.log(`  amounts:   ${cmdOpts.baseAmount} base + ${cmdOpts.quoteAmount} quote`);

    const result = await adapter.createConfigPool(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.poolAddress) console.log(`  pool:      ${result.poolAddress}`);
    if (result.positionAddress) console.log(`  position:  ${result.positionAddress}`);
    if (result.error) console.log(`  error:     ${result.error}`);
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart list-dex
// ---------------------------------------------------------------------------

program
  .command("list-dex")
  .description("List all registered DEX adapters")
  .option("--cap <capability>", "filter by capability (e.g. canBuy, canSell, canSnipe)")
  .option("--json", "output as JSON")
  .action((cmdOpts) => {
    let adapters = listDexAdapters();

    if (cmdOpts.cap) {
      const cap = cmdOpts.cap as keyof DexCapabilities;
      adapters = adapters.filter((a) => a.capabilities[cap]);
    }

    if (cmdOpts.json) {
      console.log(JSON.stringify(adapters, null, 2));
      return;
    }

    console.log();
    console.log(`  ${adapters.length} DEX adapter(s) registered:\n`);

    // Table header
    const nameWidth = 22;
    const protoWidth = 14;
    console.log(
      `  ${"NAME".padEnd(nameWidth)}${"PROTOCOL".padEnd(protoWidth)}CAPABILITIES`,
    );
    console.log(`  ${"─".repeat(nameWidth)}${"─".repeat(protoWidth)}${"─".repeat(40)}`);

    for (const a of adapters) {
      const caps = Object.entries(a.capabilities)
        .filter(([, v]) => v)
        .map(([k]) => k.replace("can", "").toLowerCase())
        .join(", ");

      console.log(
        `  ${a.name.padEnd(nameWidth)}${a.protocol.padEnd(protoWidth)}${caps}`,
      );
    }
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart wallet
// ---------------------------------------------------------------------------

import {
  listWallets,
  addWallet,
  switchWallet,
  removeWallet,
  getActiveWallet,
  migrateFromEnvIfNeeded,
} from "./helpers/wallets";

const walletCmd = new Command("wallet")
  .description("Manage wallets — show, add, switch, remove")
  .action(async () => {
    // Default action: show current wallet
    const active = getActiveWallet();
    if (!active) {
      die("No wallet configured. Run 'outsmart init' or 'outsmart wallet add --label <name>'.");
    }

    const { getConnection } = await import("./helpers/config");
    const connection = getConnection();
    const lamports = await connection.getBalance(active.keypair.publicKey);
    const sol = lamports / 1e9;

    console.log();
    console.log(`  label:   ${active.label}`);
    console.log(`  address: ${active.keypair.publicKey.toBase58()}`);
    console.log(`  balance: ${sol.toFixed(6)} SOL`);
    console.log();
  });

walletCmd
  .command("list")
  .description("List all saved wallets")
  .action(async () => {
    const wallets = listWallets();
    if (wallets.length === 0) {
      die("No wallets saved. Run 'outsmart init' or 'outsmart wallet add --label <name>'.");
    }

    const { getConnection } = await import("./helpers/config");
    const connection = getConnection();

    console.log();
    console.log("  LABEL              ADDRESS                                         SOL");
    console.log("  " + "─".repeat(78));

    for (const w of wallets) {
      const marker = w.isActive ? " *" : "  ";
      let solStr = "";
      try {
        const { PublicKey } = await import("@solana/web3.js");
        const lamports = await connection.getBalance(new PublicKey(w.publicKey));
        solStr = (lamports / 1e9).toFixed(4);
      } catch {
        solStr = "err";
      }
      console.log(`${marker} ${w.label.padEnd(18)} ${w.publicKey}  ${solStr}`);
    }

    console.log();
    console.log("  * = active wallet");
    console.log();
  });

walletCmd
  .command("add")
  .description("Add a new wallet")
  .requiredOption("-l, --label <name>", "label for this wallet")
  .action(async (opts) => {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (q: string): Promise<string> =>
      new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));

    const privateKey = await ask("  Private key (base58): ");
    rl.close();

    if (!privateKey) {
      die("Aborted — no private key provided.");
    }

    try {
      const pubkey = addWallet(opts.label, privateKey);
      console.log();
      console.log(`  Added wallet "${opts.label}": ${pubkey}`);
      console.log(`  Switch to it: outsmart wallet switch ${opts.label}`);
      console.log();
    } catch (e: any) {
      die(e.message);
    }
  });

walletCmd
  .command("switch <label>")
  .description("Switch the active wallet")
  .action(async (label: string) => {
    try {
      const pubkey = switchWallet(label);
      console.log();
      console.log(`  Switched to "${label}": ${pubkey}`);
      console.log();
    } catch (e: any) {
      die(e.message);
    }
  });

walletCmd
  .command("remove <label>")
  .description("Remove a saved wallet")
  .action(async (label: string) => {
    // Validate wallet exists before asking for confirmation
    const wallets = listWallets();
    const exists = wallets.find((w) => w.label === label);
    if (!exists) {
      die(`Wallet "${label}" not found.`);
    }

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (q: string): Promise<string> =>
      new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));

    const confirm = await ask(`  Remove wallet "${label}" (${exists.publicKey})? (yes/no): `);
    rl.close();

    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("\n  Aborted.\n");
      return;
    }

    try {
      removeWallet(label);
      console.log();
      console.log(`  Removed wallet "${label}".`);
      console.log();
    } catch (e: any) {
      die(e.message);
    }
  });

program.addCommand(walletCmd);

// ---------------------------------------------------------------------------
// outsmart balance
// ---------------------------------------------------------------------------

const balanceCmd = new Command("balance")
  .description("Show token balances for the active wallet")
  .option("-t, --token <mint>", "specific token mint to check")
  .action(async (opts) => {
    const { getConnection, getWallet } = await import("./helpers/config");
    const { PublicKey } = await import("@solana/web3.js");
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");

    const connection = getConnection();
    const wallet = getWallet();
    const pubkey = wallet.publicKey;

    console.log();
    console.log(`  Wallet: ${pubkey.toBase58()}`);
    console.log();

    if (opts.token) {
      // Show specific token balance
      validateBase58(opts.token, "--token");
      const mintPk = new PublicKey(opts.token);
      try {
        const ata = await getAssociatedTokenAddress(mintPk, pubkey);
        const res = await connection.getTokenAccountBalance(ata);
        const symbol = formatMint(opts.token);
        console.log(`  ${symbol.padEnd(10)} ${res.value.uiAmount ?? 0}`);
      } catch {
        console.log(`  ${formatMint(opts.token).padEnd(10)} 0`);
      }
      console.log();
      return;
    }

    // Show SOL + stablecoin balances
    const lamports = await connection.getBalance(pubkey);
    const sol = lamports / 1e9;
    console.log(`  ${"SOL".padEnd(10)} ${sol.toFixed(6)}`);

    const stablecoins: [string, string][] = [
      [USDC_MINT, "USDC"],
      [USDT_MINT, "USDT"],
      [USD1_MINT, "USD1"],
    ];

    for (const [mint, label] of stablecoins) {
      try {
        const mintPk = new PublicKey(mint);
        const ata = await getAssociatedTokenAddress(mintPk, pubkey);
        const res = await connection.getTokenAccountBalance(ata);
        console.log(`  ${label.padEnd(10)} ${res.value.uiAmount ?? 0}`);
      } catch {
        console.log(`  ${label.padEnd(10)} 0`);
      }
    }

    console.log();
  });

program.addCommand(balanceCmd);

// ---------------------------------------------------------------------------
// outsmart config
// ---------------------------------------------------------------------------

const configCmd = new Command("config")
  .description("View or update outsmart configuration");

configCmd
  .command("show")
  .description("Show current configuration from environment")
  .action(() => {
    const envVars = [
      "SOLANA_RPC_URL",
      "RPC_URL",
      "HELIUS_API_KEY",
      "JITO_API_KEY",
      "BLOXROUTE_AUTH_HEADER",
      "NOZOMI_API_KEY",
      "BLOCKRAZOR_API_KEY",
      "NEXTBLOCK_API_KEY",
      "ZERO_SLOT_API_KEY",
      "SOYAS_API_KEY",
      "ASTRALANE_API_KEY",
      "STELLIUM_API_KEY",
      "FLASHBLOCK_API_KEY",
      "NODE1_API_KEY",
      "TX_LANDING_MODE",
      "TX_LANDING_PROVIDERS",
      "DEFAULT_TIP_SOL",
      "DEFAULT_SLIPPAGE_BPS",
      "DEFAULT_PRIORITY_FEE",
    ];

    console.log();
    console.log("  outsmart configuration (from environment):\n");

    for (const key of envVars) {
      const val = process.env[key];
      if (val) {
        // Mask sensitive values
        const isSensitive = key.includes("KEY") || key.includes("AUTH") || key.includes("PRIVATE");
        const display = isSensitive ? val.slice(0, 6) + "..." + val.slice(-4) : val;
        console.log(`  ${key.padEnd(28)} ${display}`);
      } else {
        console.log(`  ${key.padEnd(28)} (not set)`);
      }
    }
    console.log();
  });

configCmd
  .command("env")
  .description("Print a .env template with all supported variables")
  .action(() => {
    console.log(`# outsmart .env configuration
# Copy this to .env in your project root

# ─── Solana RPC ───
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# RPC_URL=              # fallback alias

# ─── Wallet ───
# WALLET_PRIVATE_KEY=   # base58 private key (or set WALLET_PATH)
# WALLET_PATH=          # path to keypair JSON file

# ─── TX Landing Providers (API keys) ───
# HELIUS_API_KEY=
# JITO_API_KEY=
# BLOXROUTE_AUTH_HEADER=
# NOZOMI_API_KEY=
# BLOCKRAZOR_API_KEY=
# NEXTBLOCK_API_KEY=
# ZERO_SLOT_API_KEY=
# SOYAS_API_KEY=
# ASTRALANE_API_KEY=
# STELLIUM_API_KEY=
# FLASHBLOCK_API_KEY=
# NODE1_API_KEY=

# ─── TX Landing Strategy ───
# TX_LANDING_MODE=race          # concurrent|race|random|sequential
# TX_LANDING_PROVIDERS=         # comma-separated provider names (empty = all enabled)
# DEFAULT_TIP_SOL=0.001

# ─── Defaults ───
# DEFAULT_SLIPPAGE_BPS=300      # 3%
# DEFAULT_PRIORITY_FEE=4000     # microLamports per CU
`);
  });

program.addCommand(configCmd);

// ---------------------------------------------------------------------------
// outsmart init
// ---------------------------------------------------------------------------

program
  .command("init")
  .description("Set up outsmart — prompts for wallet key and RPC endpoint")
  .action(async () => {
    const readline = await import("readline");
    const fs = await import("fs");
    const path = await import("path");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const ask = (question: string): Promise<string> =>
      new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));

    console.log();
    console.log("  outsmart init");
    console.log("  ─────────────");
    console.log();

    // Determine config location
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const globalDir = path.join(homeDir, ".outsmart");
    const globalConfig = path.join(globalDir, "config.env");
    const localConfig = path.join(process.cwd(), ".env");

    // Check if local .env already exists
    const hasLocalEnv = fs.existsSync(localConfig);
    const hasGlobalConfig = fs.existsSync(globalConfig);

    if (hasLocalEnv) {
      console.log(`  Found existing .env at ${localConfig}`);
    }
    if (hasGlobalConfig) {
      console.log(`  Found existing config at ${globalConfig}`);
    }

    // Ask for required values
    const privateKey = await ask("  Wallet private key (base58): ");
    if (!privateKey) {
      console.log("\n  Aborted — no private key provided.\n");
      rl.close();
      return;
    }

    // Validate the key
    try {
      const bs58Module = await import("bs58");
      const { Keypair } = await import("@solana/web3.js");
      const decoded = bs58Module.default.decode(privateKey);
      const kp = Keypair.fromSecretKey(decoded);
      console.log(`  Wallet: ${kp.publicKey.toBase58()}`);
    } catch {
      console.log("\n  Error: invalid private key. Must be base58-encoded.\n");
      rl.close();
      return;
    }

    const rpcUrl = await ask("  RPC endpoint (e.g. https://mainnet.helius-rpc.com/?api-key=...): ");
    if (!rpcUrl) {
      console.log("\n  Aborted — no RPC endpoint provided.\n");
      rl.close();
      return;
    }

    // Build config content
    const configContent = [
      "# outsmart configuration",
      `# Generated by outsmart init on ${new Date().toISOString()}`,
      "",
      "# ─── Required ───",
      `PRIVATE_KEY=${privateKey}`,
      `MAINNET_ENDPOINT=${rpcUrl}`,
      "",
      "# ─── TX Landing Providers (optional) ───",
      "# HELIUS_API_KEY=",
      "# JITO_API_KEY=",
      "# BLOXROUTE_AUTH_HEADER=",
      "# NOZOMI_API_KEY=",
      "# BLOCKRAZOR_API_KEY=",
      "# NEXTBLOCK_API_KEY=",
      "# ZERO_SLOT_API_KEY=",
      "# SOYAS_API_KEY=",
      "# ASTRALANE_API_KEY=",
      "# STELLIUM_API_KEY=",
      "# FLASHBLOCK_API_KEY=",
      "# NODE1_API_KEY=",
      "",
      "# ─── Trading Defaults (optional) ───",
      "# TX_LANDING_MODE=concurrent",
      "# DEFAULT_TIP_SOL=0.001",
      "# DEFAULT_SLIPPAGE_BPS=300",
      "# DEFAULT_PRIORITY_FEE=4000",
      "",
    ].join("\n");

    // Write to global config (~/.outsmart/config.env)
    if (!fs.existsSync(globalDir)) {
      fs.mkdirSync(globalDir, { recursive: true });
    }
    fs.writeFileSync(globalConfig, configContent, { mode: 0o600 });
    console.log(`\n  Config written to ${globalConfig}`);
    console.log("  (file permissions set to owner-only read/write)");

    // Also write local .env if we're in a project directory
    const hasPkgJson = fs.existsSync(path.join(process.cwd(), "package.json"));
    if (hasPkgJson && !hasLocalEnv) {
      fs.writeFileSync(localConfig, configContent, { mode: 0o600 });
      console.log(`  Also written to ${localConfig}`);
    }

    console.log();
    console.log("  You're ready to trade:");
    console.log("    outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1");
    console.log("    outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.1");
    console.log("    outsmart list-dex");
    console.log();

    rl.close();
  });

// ---------------------------------------------------------------------------
// outsmart info
// ---------------------------------------------------------------------------

program
  .command("info")
  .description("Show token info from DexScreener")
  .requiredOption("-t, --token <mint>", "token mint address")
  .action(async (cmdOpts) => {
    const { getInfoFromDexscreener } = await import("./dexscreener/info");
    const info = await getInfoFromDexscreener(cmdOpts.token);

    console.log();
    console.log(`  name:       ${info.name}`);
    console.log(`  address:    ${info.address}`);
    console.log(`  price:      $${info.priceInUSD}`);
    console.log(`  mcap:       $${Number(info.marketCap).toLocaleString()}`);
    console.log(`  age:        ${info.pairAge}`);
    console.log(`  liq (SOL):  ${info.liquidityInSOL}`);
    console.log(`  pool:       ${info.poolId}`);
    console.log();
    console.log(`  vol 5m/1h/6h/24h:    ${info.volume5m} / ${info.volume1h} / ${info.volume6h} / ${info.volume24h}`);
    console.log(`  buyers 5m/1h/6h/24h: ${info.buyers5m} / ${info.buyers1h} / ${info.buyers6h} / ${info.buyers24h}`);
    console.log();
    if (info.dexscreenerURL) console.log(`  dexscreener: ${info.dexscreenerURL}`);
    if (info.twitterURL) console.log(`  twitter:     ${info.twitterURL}`);
    if (info.telegramURL) console.log(`  telegram:    ${info.telegramURL}`);
    if (info.websiteURL) console.log(`  website:     ${info.websiteURL}`);
    console.log();
  });

// ---------------------------------------------------------------------------
// outsmart perp — Percolator perpetual futures
// ---------------------------------------------------------------------------

const perpCmd = new Command("perp")
  .description("Percolator perpetual futures — create markets, trade, LP");

/** Auto-crank a market (suppressed output). Swallows errors — stale crank is not fatal. */
async function autoCrank(adapter: any, market: string, network: string): Promise<void> {
  try { await quiet(() => adapter.crank(market, network, "small")); } catch { /* ok */ }
}

// --- perp long ---
perpCmd
  .command("long")
  .description("Open a long position on a perp market")
  .requiredOption("-m, --market <address>", "slab/market address")
  .requiredOption("-s, --size <units>", "position size in native units")
  .option("--lp <idx>", "LP index (default: 0)", "0")
  .option("--user <idx>", "user index (auto-detected if omitted)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    const size = BigInt(opts.size);
    if (size <= 0n) die("--size must be positive");

    let userIdx = opts.user != null ? Number(opts.user) : undefined;
    if (userIdx === undefined) {
      const pos = await adapter.getMyPosition(opts.market, opts.network);
      if (!pos) die("No user account found. Run: outsmart perp init-user -m <address>");
      userIdx = pos.idx;
    }

    console.log(`\n  longing ${size} on ${opts.market.slice(0, 8)}...`);
    await autoCrank(adapter, opts.market, opts.network);
    const sig = await quiet(() => adapter.trade({
      slabAddress: opts.market, lpIdx: Number(opts.lp), userIdx, size, network: opts.network,
    }));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp short ---
perpCmd
  .command("short")
  .description("Open a short position on a perp market")
  .requiredOption("-m, --market <address>", "slab/market address")
  .requiredOption("-s, --size <units>", "position size in native units (positive number)")
  .option("--lp <idx>", "LP index (default: 0)", "0")
  .option("--user <idx>", "user index (auto-detected if omitted)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    const size = BigInt(opts.size);
    if (size <= 0n) die("--size must be positive");

    let userIdx = opts.user != null ? Number(opts.user) : undefined;
    if (userIdx === undefined) {
      const pos = await adapter.getMyPosition(opts.market, opts.network);
      if (!pos) die("No user account found. Run: outsmart perp init-user -m <address>");
      userIdx = pos.idx;
    }

    console.log(`\n  shorting ${size} on ${opts.market.slice(0, 8)}...`);
    await autoCrank(adapter, opts.market, opts.network);
    const sig = await quiet(() => adapter.trade({
      slabAddress: opts.market, lpIdx: Number(opts.lp), userIdx, size: -size, network: opts.network,
    }));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp close ---
perpCmd
  .command("close")
  .description("Close an open position (trade back to flat)")
  .requiredOption("-m, --market <address>", "slab/market address")
  .option("--lp <idx>", "LP index (default: 0)", "0")
  .option("--user <idx>", "user index (auto-detected if omitted)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();

    const pos = await adapter.getMyPosition(opts.market, opts.network);
    if (!pos) die("No position found");

    const currentSize = BigInt(pos.account.positionSize);
    if (currentSize === 0n) {
      console.log("\n  already flat\n");
      return;
    }

    const side = currentSize > 0n ? "long" : "short";
    const userIdx = opts.user != null ? Number(opts.user) : pos.idx;

    console.log(`\n  closing ${side} ${currentSize > 0n ? currentSize : -currentSize}...`);
    await autoCrank(adapter, opts.market, opts.network);
    const sig = await quiet(() => adapter.trade({
      slabAddress: opts.market, lpIdx: Number(opts.lp), userIdx, size: -currentSize, network: opts.network,
    }));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp status ---
perpCmd
  .command("status")
  .description("Show market state and your position")
  .requiredOption("-m, --market <address>", "slab/market address")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();

    const state = await adapter.getMarketState(opts.market, opts.network);
    const pos = await adapter.getMyPosition(opts.market, opts.network);

    console.log();
    console.log(`  market:     ${opts.market}`);
    console.log(`  accounts:   ${state.accounts.length}`);
    console.log(`  vault:      ${state.engine.vault}`);
    console.log(`  oracle:     ${state.config.lastEffectivePriceE6} (e6)`);

    if (pos) {
      const size = BigInt(pos.account.positionSize);
      const capital = BigInt(pos.account.capital);
      const side = size > 0n ? "LONG" : size < 0n ? "SHORT" : "FLAT";
      console.log();
      console.log(`  your position:`);
      console.log(`    index:    ${pos.idx}`);
      console.log(`    side:     ${side}`);
      console.log(`    size:     ${size}`);
      console.log(`    capital:  ${capital}`);
      console.log(`    entry:    ${pos.account.entryPrice} (e6)`);
    } else {
      console.log(`\n  no position (run: outsmart perp init-user -m ${opts.market})`);
    }
    console.log();
  });

// --- perp deposit ---
perpCmd
  .command("deposit")
  .description("Deposit collateral to your account")
  .requiredOption("-m, --market <address>", "slab/market address")
  .requiredOption("-a, --amount <sol>", "amount in SOL (e.g. 0.5)")
  .option("--user <idx>", "user index (auto-detected if omitted)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    const solAmount = Number(opts.amount);
    if (isNaN(solAmount) || solAmount <= 0) die("--amount must be a positive number");
    const lamports = BigInt(Math.round(solAmount * 1e9));

    let userIdx = opts.user != null ? Number(opts.user) : undefined;
    if (userIdx === undefined) {
      const pos = await adapter.getMyPosition(opts.market, opts.network);
      if (!pos) die("No user account. Run: outsmart perp init-user -m <address>");
      userIdx = pos.idx;
    }

    console.log(`\n  depositing ${solAmount} SOL...`);
    const sig = await quiet(() => adapter.deposit(opts.market, userIdx!, lamports, opts.network, "small"));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp withdraw ---
perpCmd
  .command("withdraw")
  .description("Withdraw collateral from your account")
  .requiredOption("-m, --market <address>", "slab/market address")
  .requiredOption("-a, --amount <sol>", "amount in SOL (e.g. 0.5), or 'all'")
  .option("--user <idx>", "user index (auto-detected if omitted)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();

    let userIdx = opts.user != null ? Number(opts.user) : undefined;
    if (userIdx === undefined) {
      const pos = await adapter.getMyPosition(opts.market, opts.network);
      if (!pos) die("No user account. Run: outsmart perp init-user -m <address>");
      userIdx = pos.idx;
    }

    let lamports: bigint;
    if (opts.amount === "all") {
      const pos = await adapter.getMyPosition(opts.market, opts.network);
      if (!pos) die("No position found");
      lamports = BigInt(pos.account.capital);
      if (lamports <= 0n) die("No collateral to withdraw");
    } else {
      const solAmount = Number(opts.amount);
      if (isNaN(solAmount) || solAmount <= 0) die("--amount must be a positive number or 'all'");
      lamports = BigInt(Math.round(solAmount * 1e9));
    }

    console.log(`\n  withdrawing ${Number(lamports) / 1e9} SOL...`);
    const sig = await quiet(() => adapter.withdraw(opts.market, userIdx!, lamports, opts.network, "small"));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp init-user ---
perpCmd
  .command("init-user")
  .description("Register a trader account on a market")
  .requiredOption("-m, --market <address>", "slab/market address")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();

    console.log(`\n  registering trader...`);
    const { userIdx, signature } = await quiet(() => adapter.initUser(opts.market, opts.network, "small"));
    console.log(`  done  index: ${userIdx}  tx: ${signature}\n`);
  });

// --- perp create-market ---
perpCmd
  .command("create-market")
  .description("Create a new perp market (you become admin + LP)")
  .option("--mint <address>", "collateral token mint (default: WSOL)", "So11111111111111111111111111111111111111112")
  .option("--price <usd>", "initial oracle price in USD (e.g. 150)", "1")
  .option("--lp <sol>", "LP collateral in SOL", "1")
  .option("--tier <size>", "slab tier: small, medium, large", "small")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .option("--oracle <feedId>", "Pyth feed ID hex (64 chars) — creates Pyth-pinned market instead of admin-oracle")
  .action(async (opts) => {
    validateBase58(opts.mint, "--mint");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const { NATIVE_MINT } = await import("@solana/spl-token");
    const { getWallet } = await import("./helpers/config");
    const { Connection, SystemProgram, Transaction } = await import("@solana/web3.js");
    const { getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction } = await import("@solana/spl-token");

    const adapter = new PercolatorAdapter();
    const usdPrice = Number(opts.price);
    const lpSol = Number(opts.lp);
    if (isNaN(usdPrice) || usdPrice <= 0) die("--price must be a positive number");
    if (isNaN(lpSol) || lpSol <= 0) die("--lp must be a positive number");
    const priceE6 = BigInt(Math.round(usdPrice * 1e6));
    const lpAmount = BigInt(Math.round(lpSol * 1e9));
    const isWSol = opts.mint === NATIVE_MINT.toBase58();

    // Validate Pyth feed ID if provided
    const pythFeedId = opts.oracle as string | undefined;
    if (pythFeedId) {
      const hex = pythFeedId.startsWith("0x") ? pythFeedId.slice(2) : pythFeedId;
      if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
        die("--oracle must be a 64-char hex string (Pyth feed ID)");
      }
    }

    const oracleMode = pythFeedId ? "pyth" : "admin";
    console.log(`\n  creating perp market (price=$${usdPrice}, LP=${lpSol} SOL, ${opts.tier} tier, oracle=${oracleMode})...`);

    // Auto-wrap SOL if collateral is WSOL
    if (isWSol) {
      const wallet = getWallet();
      const devRpc = process.env.DEVNET_ENDPOINT || "https://api.devnet.solana.com";
      const conn = new Connection(opts.network === "mainnet" ? process.env.MAINNET_ENDPOINT! : devRpc, "confirmed");
      const wrapAmount = lpAmount + 100_000_000n;
      const ata = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey, false);
      const tx = new Transaction();
      tx.add(createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, ata, wallet.publicKey, NATIVE_MINT));
      tx.add(SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: ata, lamports: wrapAmount }));
      tx.add(createSyncNativeInstruction(ata));
      const { blockhash } = await conn.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.sign(wallet);
      const sig = await conn.sendRawTransaction(tx.serialize());
      await conn.confirmTransaction(sig, "confirmed");
    }

    const result = await quiet(() => adapter.createMarket({
      collateralMint: opts.mint,
      initialPriceE6: priceE6,
      tier: opts.tier,
      network: opts.network,
      lpCollateral: lpAmount,
      pythFeedId: pythFeedId ? (pythFeedId.startsWith("0x") ? pythFeedId.slice(2) : pythFeedId) : undefined,
    }));

    console.log(`  done\n`);
    console.log(`  market:  ${result.slabAddress}`);
    console.log(`  oracle:  ${oracleMode}${pythFeedId ? ` (feed: ${pythFeedId.slice(0, 16)}...)` : ""}`);
    console.log(`  browse:  https://percolatorlaunch.com/trade/${result.slabAddress}\n`);
  });

// --- perp crank ---
perpCmd
  .command("crank")
  .description("Run keeper crank (permissionless)")
  .requiredOption("-m, --market <address>", "slab/market address")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    console.log(`\n  cranking...`);
    const sig = await quiet(() => adapter.crank(opts.market, opts.network, "small"));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp set-price ---
perpCmd
  .command("set-price")
  .description("Push oracle price (admin only)")
  .requiredOption("-m, --market <address>", "slab/market address")
  .requiredOption("--price <usd>", "price in USD (e.g. 150.50)")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    validateBase58(opts.market, "--market");
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    const usd = Number(opts.price);
    if (isNaN(usd) || usd <= 0) die("--price must be a positive number");
    const priceE6 = BigInt(Math.round(usd * 1e6));
    console.log(`\n  setting price to $${usd}...`);
    const sig = await quiet(() => adapter.pushOraclePrice(opts.market, priceE6, opts.network, "small"));
    console.log(`  done  tx: ${sig}\n`);
  });

// --- perp markets ---
perpCmd
  .command("markets")
  .description("Discover all markets on a network")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .action(async (opts) => {
    const { PercolatorAdapter } = await import("./dex/percolator/adapter");
    const adapter = new PercolatorAdapter();
    const markets = await adapter.discoverMarkets(opts.network);
    console.log(`\n  ${markets.length} markets on ${opts.network}\n`);
    for (const m of markets.slice(0, 20)) {
      console.log(`  ${m.slabAddress.toBase58()}`);
    }
    if (markets.length > 20) {
      console.log(`  ... and ${markets.length - 20} more`);
    }
    console.log();
  });

// --- perp keeper ---
perpCmd
  .command("keeper")
  .description("Start WebSocket oracle keeper — push live DEX prices to Percolator markets")
  .option("-p, --pool <address>", "DEX pool address (single-pool mode)")
  .option("-m, --market <address>", "Percolator slab/market address (single-pool mode)")
  .option("-d, --dex <type>", "DEX type: raydium-cpmm, raydium-amm-v4, raydium-clmm, raydium-launchlab, pumpswap, meteora-damm-v2, meteora-dbc, meteora-dlmm")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .option("-c, --config <path>", "JSON config file for multi-pool mode")
  .action(async (opts) => {
    const { WsKeeper, loadKeeperConfig } = await import("./dex/percolator/ws-keeper");
    type KeeperPoolConfig = import("./dex/percolator/ws-keeper").KeeperPoolConfig;
    type DexType = import("./dex/percolator/ws-keeper").DexType;

    let pools: KeeperPoolConfig[];

    if (opts.config) {
      pools = await loadKeeperConfig(opts.config);
      console.log(`\n  Loaded ${pools.length} pool(s) from ${opts.config}`);
    } else {
      if (!opts.pool) die("--pool is required (or use --config for multi-pool mode)");
      if (!opts.market) die("--market is required");
      if (!opts.dex) die("--dex is required");
      validateBase58(opts.pool, "--pool");
      validateBase58(opts.market, "--market");
      pools = [{
        pool: opts.pool,
        market: opts.market,
        dex: opts.dex as DexType,
        network: opts.network,
      }];
    }

    console.log(`\n  WebSocket Oracle Keeper`);
    console.log(`  ──────────────────────`);
    console.log(`  mode:     ${pools.length === 1 ? "single-pool" : "multi-pool"}`);
    console.log(`  pools:    ${pools.length}`);
    console.log(`  network:  ${opts.network}`);
    console.log(`  source:   on-chain WebSocket\n`);

    const keeper = new WsKeeper(pools, {
      network: opts.network,
      logLevel: "info",
    });

    await keeper.start();

    // Keep process alive — shutdown via Ctrl+C (handled by global SIGINT handler)
    const shutdown = async () => {
      await keeper.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Block forever
    await new Promise(() => {});
  });

// --- perp grpc-keeper ---
perpCmd
  .command("grpc-keeper")
  .description("Start gRPC oracle keeper — push live DEX prices via Yellowstone gRPC (Geyser)")
  .option("-p, --pool <address>", "DEX pool address (single-pool mode)")
  .option("-m, --market <address>", "Percolator slab/market address (single-pool mode)")
  .option("-d, --dex <type>", "DEX type: raydium-cpmm, raydium-amm-v4, raydium-clmm, raydium-launchlab, pumpswap, meteora-damm-v2, meteora-dbc, meteora-dlmm")
  .option("-n, --network <net>", "devnet or mainnet (default: devnet)", "devnet")
  .option("-c, --config <path>", "JSON config file for multi-pool mode")
  .action(async (opts) => {
    const { GrpcKeeper } = await import("./dex/percolator/grpc-keeper");
    const { loadKeeperConfig } = await import("./dex/percolator/ws-keeper");
    type KeeperPoolConfig = import("./dex/percolator/ws-keeper").KeeperPoolConfig;
    type DexType = import("./dex/percolator/ws-keeper").DexType;

    let pools: KeeperPoolConfig[];

    if (opts.config) {
      pools = await loadKeeperConfig(opts.config);
      console.log(`\n  Loaded ${pools.length} pool(s) from ${opts.config}`);
    } else {
      if (!opts.pool) die("--pool is required (or use --config for multi-pool mode)");
      if (!opts.market) die("--market is required");
      if (!opts.dex) die("--dex is required");
      validateBase58(opts.pool, "--pool");
      validateBase58(opts.market, "--market");
      pools = [{
        pool: opts.pool,
        market: opts.market,
        dex: opts.dex as DexType,
        network: opts.network,
      }];
    }

    console.log(`\n  gRPC Oracle Keeper`);
    console.log(`  ──────────────────`);
    console.log(`  mode:      ${pools.length === 1 ? "single-pool" : "multi-pool"}`);
    console.log(`  pools:     ${pools.length}`);
    console.log(`  network:   ${opts.network}`);
    console.log(`  transport: Yellowstone gRPC\n`);

    const keeper = new GrpcKeeper(pools, {
      network: opts.network,
      logLevel: "info",
    });

    await keeper.start();

    const shutdown = async () => {
      await keeper.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await new Promise(() => {});
  });

program.addCommand(perpCmd);

// ---------------------------------------------------------------------------
// Graceful shutdown — prevents hanging on Ctrl+C during long RPC calls
// ---------------------------------------------------------------------------

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log("\nShutting down...");
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// lp-manage — Autonomous LP Manager
// ---------------------------------------------------------------------------

program
  .command("lp-manage")
  .description("Autonomous LP position management — rebalance, compound fees, risk monitoring")
  .requiredOption("-p, --pool <address>", "Pool address to manage")
  .requiredOption("-d, --dex <name>", "DEX adapter: meteora-dlmm | meteora-damm-v2")
  .option("--position <address>", "Specific position address (default: all positions in pool)")
  .option("--rebalance-range <pct>", "Rebalance when price exits +/-N% range (DLMM)", "5")
  .option("--bins <count>", "Number of bins for new position after rebalance", "50")
  .option("--strategy <type>", "LP strategy: spot | curve | bid-ask (DLMM)", "spot")
  .option("--compound-interval <min>", "Compound fees every N minutes (0=disabled)", "30")
  .option("--il-threshold <pct>", "Exit if impermanent loss exceeds N%", "10")
  .option("--stop-loss <pct>", "Exit if token price drops N% from entry (0=disabled)", "0")
  .option("--dry-run", "Log actions without executing")
  .option("--ws", "Use WebSocket streaming (free)")
  .option("--json", "Output events as JSON")
  .option("-v, --verbose", "Verbose logging")
  .action(async (opts) => {
    const { LpManager } = await import("./lp-manager");

    if (opts.dex !== "meteora-dlmm" && opts.dex !== "meteora-damm-v2") {
      console.error("\n  error: --dex must be meteora-dlmm or meteora-damm-v2\n");
      process.exit(1);
    }

    // Ensure adapter is loaded
    if (opts.dex === "meteora-dlmm") await import("./dex/meteora-dlmm");
    else await import("./dex/meteora-damm-v2");

    const manager = new LpManager({
      poolAddress: opts.pool,
      dex: opts.dex,
      positionAddress: opts.position,
      rebalanceRangePct: parseFloat(opts.rebalanceRange),
      rebalanceBins: parseInt(opts.bins),
      rebalanceStrategy: opts.strategy as any,
      compoundIntervalMin: parseInt(opts.compoundInterval),
      ilThresholdPct: parseFloat(opts.ilThreshold),
      stopLossPct: parseFloat(opts.stopLoss),
      dryRun: !!opts.dryRun,
      useWebSocket: !!opts.ws,
      logLevel: opts.verbose ? "debug" : "info",
    });

    manager.on("event", (event: any) => {
      if (opts.json) {
        console.log(JSON.stringify(event));
      } else {
        const ts = new Date(event.timestamp).toLocaleTimeString();
        const pos = event.position ? ` pos:${event.position.slice(0, 8)}...` : "";
        console.log(`  [${ts}] ${event.type}${pos} — ${event.message}`);
      }
    });

    process.on("SIGINT", async () => {
      console.log("\n  Stopping LP Manager...");
      await manager.stop();
      const stats = manager.getStats();
      console.log(`\n  Rebalances: ${stats.totalRebalances}  Compounds: ${stats.totalCompounds}  Fees claimed: ${stats.totalFeesClaimed.toFixed(6)}\n`);
      process.exit(0);
    });

    try {
      await manager.start();
    } catch (err: any) {
      console.error(`\n  lp-manage error: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command("lp-find")
  .description("Find the best LP pool for a token")
  .requiredOption("-t, --token <mint>", "Token mint address")
  .option("-d, --dex <name>", "Filter by DEX: meteora-dlmm | meteora-damm-v2")
  .option("--json", "Output as JSON")
  .action(async (opts) => {
    const { LpManager } = await import("./lp-manager");

    console.log(`\n  Searching for best LP pools for ${opts.token.slice(0, 12)}...\n`);

    const pools = await LpManager.findBestPool(opts.token, opts.dex);

    if (pools.length === 0) {
      console.log("  No Meteora pools found for this token.\n");
      return;
    }

    if (opts.json) {
      console.log(JSON.stringify(pools, null, 2));
      return;
    }

    console.log("  SCORE  DEX               PAIR                    APR%     VOL/TVL  TVL          POOL");
    console.log("  " + "─".repeat(110));

    for (const pool of pools.slice(0, 10)) {
      console.log(
        `  ${pool.score.toFixed(0).padStart(5)}  ${pool.dex.padEnd(18)}${pool.pair.padEnd(24)}${pool.estimatedApr.toFixed(1).padStart(6)}%  ${pool.volumeTvlRatio.toFixed(2).padStart(7)}  $${(pool.tvlUsd / 1000).toFixed(1).padStart(8)}k  ${pool.poolAddress.slice(0, 12)}...`,
      );
    }
    console.log("");
  });

// ---------------------------------------------------------------------------
// stream — Real-time event streaming via Yellowstone gRPC
// ---------------------------------------------------------------------------

program
  .command("stream")
  .description("Stream real-time DEX events via Yellowstone gRPC or WebSocket")
  .option(
    "-p, --preset <preset>",
    "Subscription preset: all-dex-swaps | new-pools | pumpfun-bonding | pumpswap | raydium | meteora | other-dexes | wallet-trades",
    "pumpswap",
  )
  .option("-w, --wallet <addresses...>", "Wallet addresses for wallet-trades preset")
  .option("--threshold <sol>", "Large swap threshold in SOL", "10")
  .option("--events <types...>", "Filter event types: Swap NewPool BondingComplete LargeSwap")
  .option("--json", "Output events as JSON (one per line)")
  .option("--ws", "Use WebSocket mode (free, no gRPC endpoint needed)")
  .option("-v, --verbose", "Verbose logging (debug level)")
  .action(async (opts) => {
    const { EventStream, WsEventStream } = await import("./streaming");

    const logLevel = opts.verbose ? "debug" : "info";
    const threshold = parseFloat(opts.threshold);

    // Use WebSocket mode if --ws flag is set or no gRPC endpoint is configured
    const useWs = opts.ws || (!process.env.GRPC_URL && !process.env.GRPC_XTOKEN);

    const stream = useWs
      ? new WsEventStream({
          largeSwapThresholdSol: threshold,
          logLevel: logLevel as any,
        })
      : new EventStream({
          largeSwapThresholdSol: threshold,
          logLevel: logLevel as any,
        });

    const eventFilter = opts.events
      ? new Set(opts.events as string[])
      : null;

    // Set up event listeners
    stream.on("*", (event: any) => {
      // Apply event type filter
      if (eventFilter && !eventFilter.has(event.type)) return;

      if (opts.json) {
        console.log(JSON.stringify(event));
      } else {
        printEvent(event);
      }
    });

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n  Stopping stream...");
      await stream.stop();
      process.exit(0);
    });

    try {
      await stream.start(opts.preset, { wallets: opts.wallet });
    } catch (err: any) {
      console.error(`\n  stream error: ${err.message}\n`);
      process.exit(1);
    }
  });

function printEvent(event: any): void {
  const ts = event.timestamp
    ? new Date(event.timestamp * 1000).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  switch (event.type) {
    case "Swap": {
      const dir = event.direction === "buy" ? "BUY " : "SELL";
      const sol = event.direction === "buy" ? event.amountIn : event.amountOut;
      console.log(
        `  [${ts}] ${dir} ${event.dex.padEnd(16)} ${sol.toFixed(4)} SOL  ${event.mint?.slice(0, 8) ?? "???"}...  pool:${event.pool?.slice(0, 8) ?? "???"}...  sig:${event.signature.slice(0, 8)}...`,
      );
      break;
    }
    case "NewPool": {
      console.log(
        `  [${ts}] NEW  ${event.dex.padEnd(16)} pool:${event.pool?.slice(0, 8) ?? "???"}...  ${event.tokenA?.slice(0, 8) ?? "???"}... / ${event.tokenB?.slice(0, 8) ?? "???"}...  sig:${event.signature.slice(0, 8)}...`,
      );
      break;
    }
    case "BondingComplete": {
      console.log(
        `  [${ts}] GRAD pumpfun          mint:${event.mint?.slice(0, 8) ?? "???"}...  pool:${event.migrationPool?.slice(0, 8) ?? "???"}...  sig:${event.signature.slice(0, 8)}...`,
      );
      break;
    }
    case "LargeSwap": {
      const s = event.swap;
      const dir = s.direction === "buy" ? "BUY " : "SELL";
      const sol = s.direction === "buy" ? s.amountIn : s.amountOut;
      console.log(
        `  [${ts}] 🐋   ${s.dex.padEnd(16)} ${dir} ${sol.toFixed(4)} SOL  ${s.mint?.slice(0, 8) ?? "???"}...  sig:${s.signature.slice(0, 8)}...`,
      );
      break;
    }
    default:
      console.log(`  [${ts}] ${event.type} ${JSON.stringify(event).slice(0, 120)}...`);
  }
}

// ---------------------------------------------------------------------------
// Parse & run
// ---------------------------------------------------------------------------

program.parseAsync(process.argv).catch((err) => {
  console.error(`\n  fatal: ${err.message}\n`);
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
