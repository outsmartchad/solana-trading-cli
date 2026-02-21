# outsmart

**Solana trading CLI — buy, sell, and LP across 18 DEXes with 12 TX landing providers.**

```bash
npm install -g outsmart
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1
```

> **This branch (`agent-trading-infra`) is under active development.** For the stable version, use [`typescript-main`](https://github.com/outsmartchad/outsmart-cli/tree/typescript-main).

---

## Quick Start

### 1. Install

```bash
# From source
git clone https://github.com/outsmartchad/outsmart-cli.git
cd outsmart-cli
nvm install && nvm use
npm install --legacy-peer-deps
npm run build

# Or globally (when published to npm)
npm install -g outsmart
```

### 2. Configure

Run the interactive setup — it prompts for your wallet key and RPC endpoint:

```bash
outsmart init
```

This writes your config to `~/.outsmart/config.env` (and `.env` in the project root if you cloned from source). You only need to do this once.

**Or configure manually:** copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```bash
# Required
PRIVATE_KEY=your_base58_private_key_here
MAINNET_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
```

See `.env.example` for all available options (TX landing provider keys, trading defaults, etc.).

### 3. Trade

```bash
# Buy 0.1 SOL worth of a token (token auto-detected from pool)
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1

# Sell 100% of held balance
outsmart sell --dex raydium-cpmm --pool <POOL> --pct 100

# Stablecoin-quoted pool — auto-swaps SOL → USD1, then buys token
outsmart buy --dex raydium-launchlab --pool <POOL> --amount 0.1

# Sell on a stablecoin pool — sells token → USD1, then auto-swaps USD1 → SOL
outsmart sell --dex raydium-launchlab --pool <POOL> --pct 100

# Swap aggregator (no pool needed, just token)
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.1

# Check token info
outsmart info --token <MINT>
```

---

## Commands

### buy

Buy tokens with SOL (or a quote token).

```bash
outsmart buy --dex <name> --pool <POOL> --amount <SOL>
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1
outsmart buy --dex meteora-damm-v2 --pool <POOL> --amount 1 --tip 0.001
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.5 --slippage 500
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-a, --amount <sol>` | SOL amount to spend (required) |
| `-p, --pool <address>` | Pool address (required for on-chain DEXes) |
| `-t, --token <mint>` | Token mint (auto-detected from pool; required for aggregators or non-SOL quote pools) |

### sell

Sell tokens for SOL (or a quote token). Specify what percentage of your balance to sell.

```bash
outsmart sell --dex <name> --pool <POOL> --pct <0-100>
outsmart sell --dex raydium-cpmm --pool <POOL> --pct 100
outsmart sell --dex dflow --token <MINT> --pct 50 --slippage 300
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `--pct <percentage>` | Percentage of balance to sell, 0-100 (required) |
| `-p, --pool <address>` | Pool address (required for on-chain DEXes) |
| `-t, --token <mint>` | Token mint (auto-detected from pool; required for aggregators or non-SOL quote pools) |

### add-liq

Add liquidity to a pool.

```bash
outsmart add-liq --dex meteora-damm-v2 --pool <POOL> --amount-sol 1.0
outsmart add-liq --dex meteora-dlmm --pool <POOL> --amount-sol 0.5 --amount-token 1000
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--amount-sol <amount>` | Amount of SOL to deposit |
| `--amount-token <amount>` | Amount of non-SOL token to deposit |
| `-t, --token <mint>` | Token mint (for single-sided token deposits) |
| `--strategy <type>` | Distribution: `spot` \| `curve` \| `bid-ask` (DLMM only, default: spot) |
| `--bins <count>` | Number of bins (DLMM only, default: 50, max: 70) |

### remove-liq

Remove liquidity from a pool.

```bash
outsmart remove-liq --dex meteora-damm-v2 --pool <POOL> --pct 100
outsmart remove-liq --dex meteora-dlmm --pool <POOL> --pct 50
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--pct <percentage>` | Percentage of LP position to remove, 0-100 (required) |
| `--position <address>` | Specific position to remove from (default: first found) |

### claim-fees

Claim accumulated swap fees from LP positions.

```bash
outsmart claim-fees --dex meteora-damm-v2 --pool <POOL>
outsmart claim-fees --dex meteora-dlmm --pool <POOL> --position <POSITION>
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--position <address>` | Specific position to claim from (default: all) |

### positions

List LP positions in a pool.

```bash
outsmart positions --dex meteora-damm-v2 --pool <POOL>
outsmart positions --dex meteora-dlmm --pool <POOL> --json
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--json` | Output as JSON |

### quote

Get the current on-chain price from a pool.

```bash
outsmart quote --dex raydium-cpmm --pool <POOL>
outsmart quote --dex meteora-dlmm --pool <POOL>
```

### find-pool

Discover a pool for a token pair on a specific DEX.

```bash
outsmart find-pool --dex raydium-cpmm --token <MINT>
outsmart find-pool --dex raydium-amm-v4 --token <MINT> --quote <USDC_MINT>
```

### create-pump-coin

Create a new PumpFun token with a bonding curve. The token is instantly tradeable on pump.fun.

```bash
outsmart create-pump-coin --name "My Token" --symbol "MYTKN" --uri "https://ipfs.io/ipfs/Qm..."
```

| Flag | Description |
|------|-------------|
| `--name <name>` | Token name (required) |
| `--symbol <symbol>` | Token symbol (required) |
| `--uri <uri>` | Metadata URI — IPFS/Arweave link to JSON metadata (required) |

Returns the new mint address and bonding curve address.

### create-pool

Create a new PumpSwap AMM pool with initial liquidity.

```bash
outsmart create-pool --base <MINT> --quote So111...112 --base-amount 1000000 --quote-amount 1
```

| Flag | Description |
|------|-------------|
| `--base <mint>` | Base token mint address (required) |
| `--quote <mint>` | Quote token mint address, usually WSOL (required) |
| `--base-amount <amount>` | Initial base token deposit, human-readable (required) |
| `--quote-amount <amount>` | Initial quote token deposit, human-readable (required) |
| `--index <number>` | Pool index (default: 1; 0 is reserved for canonical pump pools) |

### create-damm-pool

Create a Meteora DAMM v2 custom pool with full fee configuration. This is the primary method for token launches — gives full control over fee schedule, dynamic fees, and activation timing.

```bash
# Basic: create with default fee schedule (99% → 2% linear decay over 24h)
outsmart create-damm-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5

# Custom fees: exponential decay, dynamic fee enabled
outsmart create-damm-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5 \
  --max-fee 5000 --min-fee 100 --fee-mode 1 --dynamic-fee

# Scheduled activation (unix timestamp)
outsmart create-damm-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5 \
  --activation 1740000000
```

| Flag | Description | Default |
|------|-------------|---------|
| `--base <mint>` | Base token mint address (required) | |
| `--base-amount <amount>` | Initial base token deposit (required) | |
| `--quote-amount <amount>` | Initial quote token deposit (required) | |
| `--quote <mint>` | Quote token mint | WSOL |
| `--price <number>` | Initial price in quote/base units | quoteAmount / baseAmount |
| `--max-fee <bps>` | Max base fee at activation | 9900 |
| `--min-fee <bps>` | Min base fee after decay | 200 |
| `--periods <n>` | Number of fee decay periods | 1440 |
| `--duration <secs>` | Total fee decay duration in seconds | 86400 |
| `--fee-mode <0\|1>` | 0 = linear decay, 1 = exponential | 0 |
| `--dynamic-fee` | Enable dynamic fee on top of base fee | false |
| `--collect-mode <0\|1>` | 0 = both tokens, 1 = quote only | 1 |
| `--activation <timestamp>` | Activation unix timestamp | immediate |
| `--alpha-vault` | Create alpha vault after pool | false |

### create-damm-config-pool

Create a Meteora DAMM v2 pool using an existing on-chain config. Simpler than `create-damm-pool` — the config determines the fee schedule and price range.

```bash
outsmart create-damm-config-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5 \
  --config 2yAJha5NVgq5mEitTUvdWSUKrcYvxAAc2H6rPDbEQqSu
```

| Flag | Description | Default |
|------|-------------|---------|
| `--base <mint>` | Base token mint address (required) | |
| `--base-amount <amount>` | Initial base token deposit (required) | |
| `--quote-amount <amount>` | Initial quote token deposit (required) | |
| `--config <address>` | On-chain config address (required) | |
| `--quote <mint>` | Quote token mint | WSOL |
| `--price <number>` | Initial price in quote/base units | quoteAmount / baseAmount |
| `--activation <timestamp>` | Activation unix timestamp | immediate |
| `--lock` | Permanently lock initial liquidity | false |

### list-dex

List all registered DEX adapters and their capabilities.

```bash
outsmart list-dex
outsmart list-dex --cap canSell
outsmart list-dex --cap canAddLiquidity --json
```

### info

Fetch token market data from DexScreener.

```bash
outsmart info --token <MINT>
```

Returns: price, market cap, volume, liquidity, pair age, buyer counts, social links.

### init

Interactive setup — prompts for your wallet private key and RPC endpoint, validates the key, and writes config to `~/.outsmart/config.env`.

```bash
outsmart init
```

You only need to run this once. After that, all commands will use the saved config.

### config

View or generate configuration.

```bash
outsmart config show        # Show current env config (sensitive values masked)
outsmart config env         # Print a .env template
outsmart config env > .env  # Generate .env file
```

---

## Stablecoin Auto-Swap

Some pools use stablecoins (USDC, USDT, USD1) as the quote token instead of SOL. The CLI handles this automatically — no extra steps needed.

**On buy:** detects the stablecoin quote from the pool, swaps SOL → stablecoin, then buys the token with the full swapped amount.

**On sell:** sells the token for stablecoin on the DEX, then swaps the stablecoin proceeds back to SOL.

```bash
# LaunchLab pool quoted in USD1 — just specify SOL amount as usual
outsmart buy --dex raydium-launchlab --pool <POOL> --amount 0.1
# → auto-swaps 0.1 SOL → USD1 → buys token

outsmart sell --dex raydium-launchlab --pool <POOL> --pct 100
# → sells token → USD1 → auto-swaps USD1 → SOL
```

**How it works:**
- If `JUPITER_API_KEY` is set, uses Jupiter Ultra for the SOL↔stablecoin conversion
- If not set, falls back to on-chain DEX adapters with a curated pool registry (high-TVL Raydium CLMM, AMM v4, and Meteora DLMM pools)
- Only the swapped amount is used — pre-existing stablecoin balances in your wallet are untouched

Get a free Jupiter API key at [portal.jup.ag](https://portal.jup.ag) (optional — on-chain fallback works without it).

---

## Shared Swap Options

All swap commands (`buy`, `sell`) accept these options:

| Option | Description | Default |
|--------|-------------|---------|
| `--slippage <bps>` | Slippage tolerance in basis points | 300 (3%) |
| `--priority <microLamports>` | Priority fee per compute unit | from env |
| `--tip <sol>` | MEV tip in SOL | 0.001 |
| `--cu <units>` | Compute unit limit | auto |
| `--jito` | Use Jito bundle submission | false |
| `--strategy <mode>` | TX landing: `concurrent` \| `race` \| `random` \| `sequential` | concurrent |
| `--quote <mint>` | Quote token mint | WSOL |

---

## DEX Adapters

18 adapters covering every major Solana DEX protocol:

| Adapter | Protocol | Buy | Sell | Pool | Price | LP | Extra |
|---------|----------|:---:|:----:|:----:|:-----:|:--:|-------|
| raydium-amm-v4 | AMM v4 | x | x | x | x | | |
| raydium-cpmm | CPMM | x | x | x | x | | |
| raydium-clmm | CLMM | x | x | x | x | | |
| raydium-launchlab | Launchlab | x | x | x | x | | |
| meteora-damm-v1 | Dynamic AMM | x | x | x | x | | |
| meteora-damm-v2 | CpAmm | x | x | x | x | add/remove/claim/positions | create pool |
| meteora-dlmm | DLMM | x | x | | x | add/remove/claim/positions | |
| meteora-dbc | DBC | x | x | | x | | |
| **pumpfun** | Bonding Curve | x | x | | x | | create coin |
| **pumpfun-amm** | PumpSwap AMM | x | x | | x | | create pool |
| orca | Whirlpool | x | x | | x | | |
| byreal-clmm | CLMM | x | x | | x | | |
| pancakeswap-clmm | CLMM | x | x | | x | | |
| fusion-amm | Fusion | x | x | | x | | |
| futarchy-amm | Futarchy | x | x | | x | | |
| futarchy-launchpad | Launchpad | | | | | fund/claim | |
| jupiter-ultra | Ultra API | x | x | | | | |
| dflow | Intent | x | x | | | | |

## TX Landing Providers

12 providers with concurrent, race, random, and sequential submission strategies:

| Provider | Env Var |
|----------|---------|
| Jito | `JITO_API_KEY` |
| bloXroute | `BLOXROUTE_AUTH_HEADER` |
| Helius Sender | `HELIUS_API_KEY` |
| Nozomi | `NOZOMI_API_KEY` |
| Blockrazor | `BLOCKRAZOR_API_KEY` |
| NextBlock | `NEXTBLOCK_API_KEY` |
| 0slot | `ZERO_SLOT_API_KEY` |
| Soyas | `SOYAS_API_KEY` |
| Astralane | `ASTRALANE_API_KEY` |
| Stellium | `STELLIUM_API_KEY` |
| Flashblock | `FLASHBLOCK_API_KEY` |
| Node1 | `NODE1_API_KEY` |

Set any provider's API key in your `.env` and it's automatically enabled. The orchestrator sends your transaction through all enabled providers simultaneously for the fastest possible landing.

Durable nonce accounts prevent duplicate executions when the same transaction hits multiple providers concurrently.

---

## Snipe (Coming Soon)

The `outsmart snipe` command is not yet available. Real sniping is not just a buy with a tip — it's a background process that:

1. Connects to a **Geyser gRPC stream** (Yellowstone) using your own gRPC key
2. Listens for **new pool creation events** on the DEX(es) you select
3. When a new pool is created where the base or quote token matches your target token, it **instantly fires a buy** through concurrent multi-provider TX landing
4. Runs as a **background process** (cronjob/tmux) on your machine

This requires your own Geyser gRPC key (from Helius, Triton, or another provider). It will be added in a future update.

**In the meantime**, you can achieve a competitive buy on a known pool with:

```bash
outsmart buy --dex raydium-cpmm --token <MINT> --pool <POOL> --amount 0.5 --tip 0.01 --priority 12000000
```

This sends your buy transaction with a high priority fee and MEV tip through the TX landing layer.

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `SOLANA_RPC_URL` | Solana mainnet RPC endpoint |
| `WALLET_PRIVATE_KEY` | Base58-encoded wallet private key |

### Optional — Trading Defaults

| Variable | Description | Default |
|----------|-------------|---------|
| `TX_LANDING_MODE` | `concurrent` \| `race` \| `random` \| `sequential` | `concurrent` |
| `DEFAULT_TIP_SOL` | MEV tip in SOL | `0.001` |
| `DEFAULT_SLIPPAGE_BPS` | Slippage in basis points | `300` |
| `DEFAULT_PRIORITY_FEE` | Priority fee in microLamports per CU | `4000` |
| `JUPITER_API_KEY` | Jupiter Ultra/Metis API key ([portal.jup.ag](https://portal.jup.ag)) | on-chain fallback |
| `DFLOW_API_KEY` | DFlow intent API key | |

### Optional — TX Landing Provider Keys

See the [TX Landing Providers](#tx-landing-providers) table above.

---

## Programmatic API

Use outsmart as a library in your own bots:

```typescript
import { getDexAdapter, listDexAdapters } from "outsmart";

// Import only the adapters you need
import "outsmart/dist/dex/raydium-cpmm";
import "outsmart/dist/dex/jupiter-ultra";

const cpmm = getDexAdapter("raydium-cpmm");

// Buy
const result = await cpmm.buy({
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amountSol: 0.1,
  opts: { slippageBps: 300, tipSol: 0.001 },
});
console.log("TX:", result.txSignature);

// Sell
const sellResult = await cpmm.sell({
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  percentage: 100,
  opts: { slippageBps: 300 },
});

// Get price
const price = await cpmm.getPrice!("POOL_ADDRESS");
console.log("Price:", price.price);

// List adapters
const adapters = listDexAdapters();
```

For AI agent integration (MCP server, OpenClaw workflows), see [outsmart-agent](https://github.com/outsmartchad/outsmart-agent).

---

## Testing

```bash
npm test                 # All tests
npm run test:registry    # Registry smoke test (no RPC needed)
npm run test:raydium     # Raydium adapters (mainnet)
npm run test:meteora     # Meteora adapters (mainnet)
npm run test:orca        # Orca Whirlpool (mainnet)
npm run test:api         # Jupiter Ultra + DFlow (mainnet)
```

Mainnet tests require `WALLET_PRIVATE_KEY` and `SOLANA_RPC_URL` env vars. Tests use tiny amounts (0.001 SOL).

---

## Project Structure

```
src/
├── cli.ts                 # CLI entry point (Commander.js)
├── index.ts               # Library entry point
├── dex/
│   ├── types.ts           # IDexAdapter interface
│   ├── index.ts           # DexRegistry singleton
│   ├── shared/clmm-base.ts
│   └── 18 adapter files
├── dexscreener/           # Market data (DexScreener API)
├── helpers/               # Config, wallet, Token-2022 utils
└── transactions/
    └── landing/
        ├── orchestrator.ts    # Multi-provider concurrent submission
        ├── nonce-manager.ts   # Durable nonce for dedup
        ├── tip-accounts.ts    # Tip account registry
        └── providers/         # 12 provider implementations
```

## Discord

https://discord.gg/dc3Kh3Y3yJ

## Contributing

Contributions welcome. Fork, branch, PR.

```bash
git checkout -b feature/your-feature
git commit -m 'add your feature'
git push origin feature/your-feature
```

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The authors take no responsibility for any financial loss. Users are responsible for ensuring compliance with applicable laws.

Never share your private keys. The `.env` file is in `.gitignore` for your safety.

## License

ISC
