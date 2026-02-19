# outsmart

**Trading infrastructure for AI agents and humans on Solana.**

17 DEX adapters. 12 TX landing providers. Full on-chain read/write/listen stack. One interface.

> **This branch (`agent-trading-infra`) is under active development.** If you want the stable, battle-tested version, use the [`typescript-main`](https://github.com/outsmartchad/solana-trading-cli/tree/typescript-main) branch instead.

```bash
outsmart buy  --dex raydium-cpmm --token <MINT> --amount 0.1
outsmart sell --dex jupiter-ultra --token <MINT> --pct 100
outsmart add-liq --dex meteora-damm-v2 --pool <POOL> --amount-a 1.0
```

---

## Vision

Most AI agents that claim to "trade on Solana" are wrappers around a single API endpoint. They can't choose which DEX to route through, can't provide liquidity, can't snipe new pools, and can't land transactions competitively. They delegate everything to a third-party aggregator and hope for the best.

**outsmart** is different. It's a complete on-chain trading infrastructure — a CLI for humans and a programmatic SDK for AI agents — that gives direct, low-level access to every major Solana DEX protocol.

### The Three Layers

An agent that actually operates on-chain needs three capabilities:

| Layer | What it does | How outsmart implements it |
|-------|-------------|---------------------------|
| **Write** | Submit transactions — swaps, LP, sniping | 17 DEX adapters build raw instructions, 12 TX landing providers race to land them on-chain |
| **Read** | Query on-chain state — pool prices, positions, balances | Direct RPC calls to decode pool accounts, vault balances, position states. No API middleman. |
| **Listen** | React to real-time events — new pools, price moves | gRPC streams (Yellowstone) + WebSocket subscriptions for pool creation monitoring *(coming soon)* |

Most tools give you **Write** through an aggregator. outsmart gives you all three, with the code-level control to choose exactly which DEX, which pool, which landing provider, and which submission strategy to use.

### Why This Matters for Agents

When an AI agent (OpenClaw, or your own) needs to execute a trade, it shouldn't be a black box. The agent should be able to:

- **Pick the DEX** — Route through Raydium CPMM for deep liquidity, or hit a Meteora DLMM pool for tighter spreads, or use Jupiter Ultra for aggregated routing. The agent decides based on the situation, not a hardcoded default.
- **Control execution** — Set slippage, compute budget, MEV tips. Send through Jito bundles or blast through 12 providers concurrently. Use durable nonces to prevent duplicate buys.
- **Provide liquidity** — Not just swap. Create LP positions on Meteora DAMM v2 or DLMM pools, collect fees, rebalance. Agents that can LP are agents that can earn yield.
- **Read the chain directly** — Decode pool state from raw account data. Calculate prices from on-chain reserves, not from a cached API. Know the real price at the moment of execution.
- **Listen and react** — Subscribe to pool creation events via gRPC. Snipe new tokens the moment liquidity appears. React to on-chain events in real time, not on a polling interval.

### outsmart + OpenClaw

outsmart handles the **code layer** — raw RPC writes, on-chain reads, gRPC listeners. It's the muscle.

[OpenClaw](https://github.com/AnomalyCo/OpenClaw) handles the **browser layer** — it has a hand and eye that can navigate DeFi frontends, click buttons, sign transactions through wallet extensions, and interact with dApps that don't expose APIs. It's the hands.

Together, they cover the full surface area of Solana DeFi:

```
                    outsmart (code layer)              OpenClaw (browser layer)
                    ─────────────────────              ────────────────────────
Write (txns)        RPC → raw instructions → land      Browser → wallet → sign → submit
Read (state)        RPC → decode accounts → parse       Browser → scrape UI → extract
Listen (events)     gRPC/WebSocket → stream → react     Browser → poll pages → detect
```

An agent using both can do things neither could alone: snipe a new pool via gRPC stream (outsmart), then go to the project's website to verify the token metadata (OpenClaw), then provide liquidity on the optimal DEX (outsmart), then monitor the position through a dashboard (OpenClaw).

### The Trencher's Toolkit

Real on-chain traders don't just use DEXes. They live on a handful of sites that aggregate token intelligence, LP analytics, and market data. An agent that can actually trade needs to know these sites and use them the way a human trencher would:

| Site | What trenchers use it for | How the agent uses it |
|------|--------------------------|----------------------|
| [GMGN](https://gmgn.ai) | Smart money tracking, wallet profiling, new token discovery, insider activity detection | OpenClaw browses GMGN to check who's buying, spot smart money wallets accumulating, and flag insider-heavy tokens before outsmart executes |
| [Axiom](https://axiom.trade) | Fast trading terminal, real-time charts, quick snipe UI | OpenClaw reads Axiom's token pages for sentiment, holder distribution, and recent trade flow. For tokens that only list on Axiom first, OpenClaw can interact with the UI directly |
| [LPAgent](https://lpagent.ai) | LP position management, fee analytics, pool selection, yield tracking | OpenClaw monitors LP positions via LPAgent dashboards, checks fee APR across pools, and feeds that data back so outsmart can rebalance or exit positions |
| [DexScreener](https://dexscreener.com) | Price charts, liquidity depth, market cap, volume, social links | outsmart queries DexScreener API directly (`outsmart info --token`). OpenClaw reads the social links and project pages that DexScreener surfaces |
| [Birdeye](https://birdeye.so) | Portfolio tracking, token analytics, holder analysis | OpenClaw monitors portfolio performance and token holder trends that aren't available via RPC alone |

The pattern: **outsmart reads the chain, OpenClaw reads the internet.** outsmart executes trades at the code level, OpenClaw gathers the intelligence that informs those trades. Neither is complete without the other.

### Integration: MCP Tool Server

outsmart exposes itself to AI agents via [MCP (Model Context Protocol)](https://modelcontextprotocol.io) — the standard way AI agents call external tools. Every `IDexAdapter` method maps to an MCP tool:

```
MCP Tools exposed by outsmart:
  buy         → adapter.buy({ dex, token, amount, ... })
  sell        → adapter.sell({ dex, token, percentage, ... })
  snipe       → adapter.snipe({ dex, token, pool, tip, ... })
  add_liq     → adapter.addLiquidity({ dex, pool, amountA, ... })
  remove_liq  → adapter.removeLiquidity({ dex, pool, percentage, ... })
  get_price   → adapter.getPrice({ dex, pool })
  find_pool   → adapter.findPool({ dex, token, quote })
  list_dex    → registry.listDexAdapters()
  claim_fees  → adapter.claimFees({ dex, pool })
```

Any MCP-compatible agent — OpenClaw, Claude, or your own — can call these tools without knowing anything about Solana internals. The agent says "buy 0.1 SOL of token X on raydium-cpmm", outsmart handles the rest: pool discovery, slippage calculation, instruction building, TX landing through 12 providers.

---

## DEX Adapters

| Adapter | Protocol | Buy | Sell | Snipe | Pool Discovery | Price | LP |
|---------|----------|-----|------|-------|----------------|-------|----|
| raydium-amm-v4 | AMM v4 | x | | x | x | x | |
| raydium-cpmm | CPMM | x | x | x | x | x | |
| raydium-clmm | CLMM | x | x | x | x | x | |
| raydium-launchlab | Launchlab | x | | | x | x | |
| meteora-damm-v1 | Dynamic AMM | x | | x | x | x | |
| meteora-damm-v2 | CpAmm | x | x | x | x | x | add/remove/claim |
| meteora-dlmm | DLMM | x | | x | | x | |
| meteora-dbc | DBC | x | x | x | | x | |
| meteora-lp-dlmm | DLMM LP | | | | | | add/remove |
| orca | Whirlpool | x | | x | | x | |
| byreal-clmm | CLMM | x | | x | | x | |
| pancakeswap-clmm | CLMM | x | | x | | x | |
| fusion-amm | Fusion | x | | x | | x | |
| futarchy-amm | Futarchy | x | | x | | x | |
| futarchy-launchpad | Launchpad | | | | | | fund/claim |
| jupiter-ultra | Ultra API | x | x | | | | |
| dflow | Intent | x | x | | | | |

> **Note on snipe:** The `snipe` command builds and submits a swap transaction to a known pool with MEV tip and concurrent TX landing. Full sniping (gRPC pool creation streaming + background monitoring) requires a gRPC key and will be added in a future update with `outsmart snipe-stream`.

## TX Landing Providers

12 providers with concurrent, race, random, and sequential submission strategies:

**0slot, nozomi, helius-sender, blockrazor, node1.me, soyas, bloXroute, astralane, stellium, flashblock, jito, nextblock**

Each provider is enabled by setting its API key in the environment. The orchestrator sends transactions through multiple providers simultaneously for fastest landing. Durable nonce accounts prevent duplicate executions when the same transaction hits multiple providers.

## Installation

```bash
git clone https://github.com/outsmartchad/solana-trading-cli.git
cd solana-trading-cli
nvm install && nvm use
npm install --legacy-peer-deps
npm run build
```

Or install globally (when published to npm):

```bash
npm install -g outsmart
```

## Configuration

Create a `.env` file in the project root:

```bash
outsmart config env > .env
# Edit .env with your values
```

Required:
- `MAINNET_ENDPOINT` — Solana RPC URL
- `PRIVATE_KEY` — Base58-encoded wallet secret key

Optional (enable TX landing providers):
- `HELIUS_API_KEY`, `JITO_API_KEY`, `BLOXROUTE_AUTH_HEADER`, `NOZOMI_API_KEY`
- `BLOCKRAZOR_API_KEY`, `NEXTBLOCK_API_KEY`, `ZERO_SLOT_API_KEY`, `SOYAS_API_KEY`
- `ASTRALANE_API_KEY`, `STELLIUM_API_KEY`, `FLASHBLOCK_API_KEY`, `NODE1_API_KEY`

Trading defaults:
- `TX_LANDING_MODE` — `concurrent` | `race` | `random` | `sequential` (default: `concurrent`)
- `DEFAULT_TIP_SOL` — MEV tip in SOL (default: `0.001`)
- `DEFAULT_SLIPPAGE_BPS` — Slippage in basis points (default: `300` = 3%)

View current config:
```bash
outsmart config show
```

## CLI Commands

### Buy

```bash
outsmart buy --dex raydium-cpmm --token <MINT> --amount 0.1
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.5 --slippage 500
outsmart buy --dex meteora-damm-v2 --token <MINT> --amount 1 --pool <POOL> --tip 0.001
```

### Sell

```bash
outsmart sell --dex raydium-cpmm --token <MINT> --pct 100
outsmart sell --dex jupiter-ultra --token <MINT> --pct 50
outsmart sell --dex dflow --token <MINT> --pct 100 --slippage 300
```

### Snipe

```bash
outsmart snipe --dex raydium-cpmm --token <MINT> --pool <POOL> --amount 0.5 --tip 0.01
outsmart snipe --dex meteora-dlmm --token <MINT> --pool <POOL> --amount 1 --tip 0.02 --jito
```

Uses durable nonce accounts for concurrent TX landing to avoid duplicate buys.

### Add Liquidity

```bash
outsmart add-liq --dex meteora-damm-v2 --pool <POOL> --amount-a 1.0
outsmart add-liq --dex meteora-lp-dlmm --pool <POOL> --amount-a 1.0 --amount-b 500
```

Supported by: `meteora-damm-v2` (full-range positions with Token-2022 support), `meteora-lp-dlmm` (DLMM bin positions).

### Remove Liquidity

```bash
outsmart remove-liq --dex meteora-damm-v2 --pool <POOL> --pct 100
outsmart remove-liq --dex meteora-lp-dlmm --pool <POOL> --pct 50
```

Supported by: `meteora-damm-v2` (full/partial removal + close position), `meteora-lp-dlmm` (remove with claim-and-close).

### Quote

```bash
outsmart quote --dex raydium-cpmm --pool <POOL>
outsmart quote --dex meteora-dlmm --pool <POOL>
```

### Find Pool

```bash
outsmart find-pool --dex raydium-cpmm --token <MINT>
outsmart find-pool --dex raydium-amm-v4 --token <MINT> --quote <USDC_MINT>
```

### List DEX Adapters

```bash
outsmart list-dex
outsmart list-dex --cap canSell
outsmart list-dex --cap canSnipe --json
outsmart list-dex --cap canAddLiquidity
```

### Token Info

```bash
outsmart info --token <MINT>
```

Fetches market data from DexScreener: price, market cap, volume, liquidity, socials.

### Swap Options

All swap commands (buy, sell, snipe) share these options:

| Option | Description |
|--------|-------------|
| `--slippage <bps>` | Slippage tolerance in basis points (default: 300) |
| `--priority <microLamports>` | Priority fee per compute unit |
| `--tip <sol>` | MEV tip in SOL |
| `--cu <units>` | Compute unit limit |
| `--jito` | Use Jito bundle submission |
| `--strategy <mode>` | TX landing strategy override |
| `--quote <mint>` | Quote token mint (default: WSOL) |

## Programmatic API

Use outsmart as a library in your own bots or agents:

```typescript
import { getDexAdapter, listDexAdapters } from "outsmart";

// Import adapters to register them
import "outsmart/dist/dex/raydium-cpmm";
import "outsmart/dist/dex/jupiter-ultra";
import "outsmart/dist/dex/meteora-damm-v2";

// Buy tokens
const cpmm = getDexAdapter("raydium-cpmm");
const buyResult = await cpmm.buy({
  tokenMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amountSol: 0.1,
  opts: { slippageBps: 300, tipSol: 0.001 },
});
console.log("Buy TX:", buyResult.txSignature);

// Add liquidity
const damm = getDexAdapter("meteora-damm-v2");
const lpResult = await damm.addLiquidity!({
  poolAddress: "POOL_ADDRESS",
  amountA: 1.0,
});
console.log("LP TX:", lpResult.txSignature);

// Read on-chain price
const price = await cpmm.getPrice!("POOL_ADDRESS");
console.log("Price:", price.price);

// List what's available
const adapters = listDexAdapters();
console.log(adapters.map(a => `${a.name}: ${a.protocol}`));
```

## Architecture

```
src/
├── cli.ts                 # CLI entry point (Commander.js)
├── index.ts               # Library entry point (programmatic API)
├── dex/
│   ├── types.ts           # IDexAdapter interface, params, results
│   ├── index.ts           # DexRegistry singleton
│   ├── shared/
│   │   └── clmm-base.ts  # Shared CLMM base (1049 lines)
│   └── 17 adapter files   # One per DEX protocol
├── dexscreener/           # Market data utility
├── helpers/               # Config, wallet, connection, Token-2022 utils
└── transactions/
    ├── landing/
    │   ├── orchestrator.ts    # Multi-provider concurrent submission
    │   ├── nonce-manager.ts   # Durable nonce for dedup
    │   ├── tip-accounts.ts    # 100+ tip accounts registry
    │   └── providers/         # 12 provider implementations
    └── legacy executors
```

Each DEX adapter implements `IDexAdapter` and self-registers with the `DexRegistry` on import. The CLI imports all adapters at startup; the library API lets you import only what you need.

## Testing

Mainnet integration tests for all 17 adapters:

```bash
npm test                 # Run all tests
npm run test:registry    # Registry smoke test (no RPC needed)
npm run test:raydium     # Raydium adapters
npm run test:meteora     # Meteora adapters
npm run test:orca        # Orca Whirlpool
npm run test:api         # Jupiter Ultra + DFlow
```

Requires `PRIVATE_KEY` and `RPC_URL` env vars. Tests execute real transactions on mainnet with tiny amounts (0.001 SOL).

## Roadmap

- [x] 17 DEX adapters with unified IDexAdapter interface
- [x] 12 TX landing providers with concurrent submission
- [x] DAMM v2 full LP lifecycle (add/remove/claim fees)
- [x] Mainnet integration test suite
- [ ] MCP tool server — expose all adapter methods to AI agents
- [ ] OpenClaw integration — browser intelligence from GMGN, Axiom, LPAgent, DexScreener, Birdeye
- [ ] gRPC-powered snipe streaming (`outsmart snipe-stream`) — completes the Listen layer
- [ ] Hybrid agent workflows — snipe-with-verification, LP management with APR tracking
- [ ] More DEX adapters as new protocols launch

## Credits

- [Raydium SDK v2](https://github.com/raydium-io/raydium-sdk-V2)
- [Meteora SDKs](https://github.com/MeteoraAg)
- [Orca Whirlpools](https://github.com/orca-so/whirlpools)
- [yellowstone-grpc](https://github.com/rpcpool/yellowstone-grpc)

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The authors take no responsibility for any financial loss caused by the use of this software. Users are responsible for ensuring compliance with applicable laws and regulations.

Never share your private keys. The `.env` file is in `.gitignore` for your safety.

## Contributing

Contributions welcome. Fork it, branch off, open a PR.

```bash
git checkout -b feature/your-feature
git commit -m 'add your feature'
git push origin feature/your-feature
```

## Discord

https://discord.gg/dc3Kh3Y3yJ

## License

ISC
