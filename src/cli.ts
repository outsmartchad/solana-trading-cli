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
 *   outsmart buy  --dex raydium-cpmm --token <MINT> --amount 0.1
 *   outsmart sell --dex raydium-cpmm --token <MINT> --pct 100
 *   outsmart snipe --dex raydium-cpmm --token <MINT> --pool <POOL> --amount 0.5 --tip 0.01
 *   outsmart quote --dex meteora-dlmm --pool <POOL>
 *   outsmart list-dex
 *   outsmart list-dex --cap canSell
 *   outsmart config show
 *   outsmart config set RPC_URL https://...
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
import "./dex/meteora-lp-dlmm";
import "./dex/orca";
import "./dex/byreal-clmm";
import "./dex/pancakeswap-clmm";
import "./dex/fusion-amm";
import "./dex/futarchy-amm";
import "./dex/futarchy-launchpad";
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
  SnipeParams,
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
  .description("The Solana trading CLI — 18 DEXes, 12 TX landing providers.")
  .version(pkg.version);

// ---------------------------------------------------------------------------
// outsmart buy
// ---------------------------------------------------------------------------

const buyCmd = new Command("buy")
  .description("Buy tokens with SOL (or quote token)")
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. raydium-cpmm)")
  .requiredOption("-t, --token <mint>", "token mint address to buy")
  .requiredOption("-a, --amount <sol>", "amount of SOL to spend")
  .option("-p, --pool <address>", "pool address (auto-discovered if omitted)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canBuy) {
      die(`${adapter.name} does not support buy`);
    }

    const params: BuyParams = {
      tokenMint: cmdOpts.token,
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
  .requiredOption("-t, --token <mint>", "token mint address to sell")
  .requiredOption("--pct <percentage>", "percentage of held balance to sell (0-100)")
  .option("-p, --pool <address>", "pool address (auto-discovered if omitted)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canSell) {
      die(`${adapter.name} does not support sell`);
    }

    const params: SellParams = {
      tokenMint: cmdOpts.token,
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
// outsmart snipe
// ---------------------------------------------------------------------------

const snipeCmd = new Command("snipe")
  .description("Snipe a token on a known pool with concurrent TX landing")
  .requiredOption("-d, --dex <name>", "DEX adapter name")
  .requiredOption("-t, --token <mint>", "token mint address to snipe")
  .requiredOption("-p, --pool <address>", "pool address (required for sniping)")
  .requiredOption("-a, --amount <sol>", "amount of SOL to spend")
  .requiredOption("--tip <sol>", "MEV tip in SOL (required for competitive sniping)")
  .action(async (cmdOpts) => {
    const adapter = getDexAdapter(cmdOpts.dex);
    if (!adapter.capabilities.canSnipe) {
      die(`${adapter.name} does not support snipe`);
    }
    if (!adapter.snipe) {
      die(`${adapter.name} declares canSnipe but has no snipe() implementation`);
    }

    const params: SnipeParams = {
      tokenMint: cmdOpts.token,
      amountSol: Number(cmdOpts.amount),
      poolAddress: cmdOpts.pool,
      tipSol: Number(cmdOpts.tip),
      quoteMint: cmdOpts.quote,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  sniping on ${adapter.name} (pool: ${params.poolAddress})...`);
    const result = await adapter.snipe(params);
    printResult(result);
  });

addSwapOptions(snipeCmd, false); // --tip already defined as required option
program.addCommand(snipeCmd);

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
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-lp-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .requiredOption("--amount-a <amount>", "amount of token A (or SOL) to deposit")
  .option("--amount-b <amount>", "amount of token B to deposit (if required)")
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

    const params = {
      poolAddress: cmdOpts.pool,
      amountA: Number(cmdOpts.amountA),
      amountB: cmdOpts.amountB != null ? Number(cmdOpts.amountB) : undefined,
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  adding liquidity on ${adapter.name} (pool: ${params.poolAddress})...`);
    const result = await adapter.addLiquidity(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
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
  .requiredOption("-d, --dex <name>", "DEX adapter name (e.g. meteora-lp-dlmm)")
  .requiredOption("-p, --pool <address>", "pool address")
  .requiredOption("--pct <percentage>", "percentage of LP position to remove (0-100)")
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

    const params = {
      poolAddress: cmdOpts.pool,
      percentage: Number(cmdOpts.pct),
      opts: buildSwapOpts(cmdOpts),
    };

    console.log(`\n  removing ${params.percentage}% liquidity on ${adapter.name} (pool: ${params.poolAddress})...`);
    const result = await adapter.removeLiquidity(params);
    console.log();
    console.log(`  tx:        ${result.txSignature}`);
    console.log(`  confirmed: ${result.confirmed}`);
    if (result.error) {
      console.log(`  error:     ${result.error}`);
    }
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
    console.log("    outsmart buy --dex raydium-cpmm --token <MINT> --amount 0.1");
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
