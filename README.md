# outsmart

**Solana trading CLI — buy, sell, snipe, and LP across 17 DEXes with 12 TX landing providers.**

```bash
npm install -g outsmart
outsmart buy --dex raydium-cpmm --token <MINT> --amount 0.1
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
# Buy 0.1 SOL worth of a token
outsmart buy --dex raydium-cpmm --token <MINT> --amount 0.1

# Sell 100% of held balance
outsmart sell --dex jupiter-ultra --token <MINT> --pct 100

# Check token info
outsmart info --token <MINT>
```

---

## Commands

### buy

Buy tokens with SOL (or a quote token).

```bash
outsmart buy --dex <name> --token <MINT> --amount <SOL>
outsmart buy --dex raydium-cpmm --token EPjF...Dt1v --amount 0.1
outsmart buy --dex meteora-damm-v2 --token <MINT> --amount 1 --pool <POOL> --tip 0.001
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.5 --slippage 500
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-t, --token <mint>` | Token mint address (required) |
| `-a, --amount <sol>` | SOL amount to spend (required) |
| `-p, --pool <address>` | Pool address (auto-discovered if omitted) |

### sell

Sell tokens for SOL (or a quote token). Specify what percentage of your balance to sell.

```bash
outsmart sell --dex <name> --token <MINT> --pct <0-100>
outsmart sell --dex raydium-cpmm --token <MINT> --pct 100
outsmart sell --dex dflow --token <MINT> --pct 50 --slippage 300
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-t, --token <mint>` | Token mint address (required) |
| `--pct <percentage>` | Percentage of balance to sell, 0-100 (required) |
| `-p, --pool <address>` | Pool address (auto-discovered if omitted) |

### snipe

Snipe a token on a known pool with MEV tip and concurrent TX landing. Requires a pool address.

```bash
outsmart snipe --dex <name> --token <MINT> --pool <POOL> --amount <SOL> --tip <SOL>
outsmart snipe --dex raydium-cpmm --token <MINT> --pool <POOL> --amount 0.5 --tip 0.01
outsmart snipe --dex meteora-dlmm --token <MINT> --pool <POOL> --amount 1 --tip 0.02 --jito
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-t, --token <mint>` | Token mint address (required) |
| `-p, --pool <address>` | Pool address (required) |
| `-a, --amount <sol>` | SOL amount to spend (required) |
| `--tip <sol>` | MEV tip in SOL (required) |

> **Note:** This is a one-shot snipe to a known pool. Full sniping with gRPC pool creation streaming will be available via `outsmart snipe-stream` in a future update.

### add-liq

Add liquidity to a pool.

```bash
outsmart add-liq --dex meteora-damm-v2 --pool <POOL> --amount-a 1.0
outsmart add-liq --dex meteora-lp-dlmm --pool <POOL> --amount-a 1.0 --amount-b 500
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--amount-a <amount>` | Amount of token A / SOL to deposit (required) |
| `--amount-b <amount>` | Amount of token B to deposit (optional) |

### remove-liq

Remove liquidity from a pool.

```bash
outsmart remove-liq --dex meteora-damm-v2 --pool <POOL> --pct 100
outsmart remove-liq --dex meteora-lp-dlmm --pool <POOL> --pct 50
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-p, --pool <address>` | Pool address (required) |
| `--pct <percentage>` | Percentage of LP position to remove, 0-100 (required) |

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

### list-dex

List all registered DEX adapters and their capabilities.

```bash
outsmart list-dex
outsmart list-dex --cap canSell
outsmart list-dex --cap canSnipe --json
outsmart list-dex --cap canAddLiquidity
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

## Shared Swap Options

All swap commands (`buy`, `sell`, `snipe`) accept these options:

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

17 adapters covering every major Solana DEX protocol:

| Adapter | Protocol | Buy | Sell | Snipe | Pool | Price | LP |
|---------|----------|:---:|:----:|:-----:|:----:|:-----:|:--:|
| raydium-amm-v4 | AMM v4 | x | x | x | x | x | |
| raydium-cpmm | CPMM | x | x | x | x | x | |
| raydium-clmm | CLMM | x | x | x | x | x | |
| raydium-launchlab | Launchlab | x | | | x | x | |
| meteora-damm-v1 | Dynamic AMM | x | x | x | x | x | |
| meteora-damm-v2 | CpAmm | x | x | x | x | x | add/remove/claim |
| meteora-dlmm | DLMM | x | x | x | | x | |
| meteora-dbc | DBC | x | x | x | | x | |
| meteora-lp-dlmm | DLMM LP | | | | | | add/remove |
| orca | Whirlpool | x | x | x | | x | |
| byreal-clmm | CLMM | x | x | x | | x | |
| pancakeswap-clmm | CLMM | x | x | x | | x | |
| fusion-amm | Fusion | x | x | x | | x | |
| futarchy-amm | Futarchy | x | x | x | | x | |
| futarchy-launchpad | Launchpad | | | | | | fund/claim |
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
│   └── 17 adapter files
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
