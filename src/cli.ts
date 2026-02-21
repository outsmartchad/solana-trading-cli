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
 * 17 DEX adapters, 12 TX landing providers, one unified interface.
 *
 * Usage:
 *   # On-chain DEX — pool address required, token auto-detected from pool
 *   outsmart buy  --dex meteora-dlmm --pool <POOL> --amount 0.1
 *   outsmart sell --dex meteora-dlmm --pool <POOL> --pct 100
 *
 *   # On-chain DEX — explicit token (for non-SOL quote pools)
 *   outsmart buy  --dex meteora-dlmm --pool <POOL> --token <MINT> --amount 0.1
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

import type {
  BuyParams,
  SellParams,
  SwapOpts,
  SwapResult,
} from "./dex/types";

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

function printResult(result: SwapResult): void {
  console.log();
  console.log(`  dex:       ${result.dex}`);
  console.log(`  tx:        ${result.txSignature}`);
  console.log(`  confirmed: ${result.confirmed}`);
  console.log(`  in:        ${result.amountIn} ${result.amountInToken}`);
  if (result.amountOut != null) {
    console.log(`  out:       ${result.amountOut} ${result.amountOutToken ?? ""}`);
  }
  if (result.poolAddress) {
    console.log(`  pool:      ${result.poolAddress}`);
  }
  if (result.priceImpactPct != null) {
    console.log(`  impact:    ${result.priceImpactPct.toFixed(2)}%`);
  }
  console.log();
}

/**
 * Resolve the token mint from pool state when --token is omitted.
 *
 * Calls adapter.getPrice(pool) which decodes the pool account and returns
 * baseMint + quoteMint. We return whichever is NOT WSOL. If neither is WSOL
 * (e.g. USDC/TOKEN pool), we error and ask the user to specify --token.
 */
async function resolveTokenMint(
  adapter: import("./dex/types").IDexAdapter,
  poolAddress: string,
): Promise<string> {
  if (!adapter.capabilities.canGetPrice || !adapter.getPrice) {
    die(`${adapter.name} cannot auto-detect token from pool — please provide --token <mint>`);
  }

  const price = await adapter.getPrice(poolAddress);
  const { baseMint, quoteMint } = price;

  // Pick the non-SOL side
  if (quoteMint === WSOL_MINT) return baseMint;
  if (baseMint === WSOL_MINT) return quoteMint;

  // Neither side is SOL — ambiguous
  die(
    `Pool ${poolAddress} has no SOL side (${baseMint} / ${quoteMint}).\n`
    + `  Please specify --token <mint> to indicate which token to trade.`,
  );
}

function buildSwapOpts(cmd: {
  slippage?: string;
  priority?: string;
  tip?: string;
  cu?: string;
  jito?: boolean;
  strategy?: string;
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
    .option("--quote <mint>", "quote token mint (default: WSOL)");
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
  .description("The Solana trading CLI — 17 DEX adapters, 12 TX landing providers.")
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

    // Auto-resolve token mint from pool state if not provided
    let tokenMint: string = cmdOpts.token;
    if (!tokenMint && cmdOpts.pool) {
      tokenMint = await resolveTokenMint(adapter, cmdOpts.pool);
      console.log(`  auto-detected token: ${tokenMint}`);
    }

    const params: BuyParams = {
      tokenMint,
      amountSol: Number(cmdOpts.amount),
      poolAddress: cmdOpts.pool,
      quoteMint: cmdOpts.quote,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  buying on ${adapter.name}...`);
    const result = await adapter.buy(params);
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

    // Auto-resolve token mint from pool state if not provided
    let tokenMint: string = cmdOpts.token;
    if (!tokenMint && cmdOpts.pool) {
      tokenMint = await resolveTokenMint(adapter, cmdOpts.pool);
      console.log(`  auto-detected token: ${tokenMint}`);
    }

    const params: SellParams = {
      tokenMint,
      percentage: Number(cmdOpts.pct),
      poolAddress: cmdOpts.pool,
      quoteMint: cmdOpts.quote,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  selling ${params.percentage}% on ${adapter.name}...`);
    const result = await adapter.sell(params);
    printResult(result);
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
// Parse & run
// ---------------------------------------------------------------------------

program.parseAsync(process.argv).catch((err) => {
  console.error(`\n  fatal: ${err.message}\n`);
  if (process.env.DEBUG) {
    console.error(err.stack);
  }
  process.exit(1);
});
