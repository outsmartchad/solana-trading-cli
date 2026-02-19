# outsmart

The most powerful Solana trading CLI. 17 DEXes, 12 TX landing providers, one unified interface.

```bash
outsmart buy  --dex raydium-cpmm --token <MINT> --amount 0.1
outsmart sell --dex jupiter-ultra --token <MINT> --pct 100
outsmart add-liq --dex meteora-lp-dlmm --pool <POOL> --amount-a 1.0
```

## DEX Adapters

| Adapter | Protocol | Buy | Sell | Snipe | Pool Discovery | Price | LP |
|---------|----------|-----|------|-------|----------------|-------|----|
| raydium-amm-v4 | AMM v4 | x | | x | x | x | |
| raydium-cpmm | CPMM | x | x | x | x | x | |
| raydium-clmm | CLMM | x | x | x | x | x | |
| raydium-launchlab | Launchlab | x | | | x | x | |
| meteora-damm-v1 | Dynamic AMM | x | | x | x | x | |
| meteora-damm-v2 | CpAmm | x | x | x | x | x | |
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

> **Note on snipe:** The `snipe` command currently builds and submits a swap transaction to a known pool with MEV tip and concurrent TX landing. Full sniping (gRPC pool creation streaming + background monitoring) requires a gRPC key and will be added in a future update with a dedicated `outsmart snipe-stream` command.

## TX Landing Providers

12 providers with concurrent, race, random, and sequential submission strategies:

0slot, nozomi, helius-sender, blockrazor, node1.me, soyas, bloXroute, astralane, stellium, flashblock, jito, nextblock

Each provider is enabled by setting its API key in the environment. The orchestrator sends transactions through multiple providers simultaneously for fastest landing.

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

Submits a swap transaction to a known pool with MEV tip and concurrent TX landing:

```bash
outsmart snipe --dex raydium-cpmm --token <MINT> --pool <POOL> --amount 0.5 --tip 0.01
outsmart snipe --dex meteora-dlmm --token <MINT> --pool <POOL> --amount 1 --tip 0.02 --jito
```

Uses durable nonce accounts for concurrent TX landing to avoid duplicate buys. Full gRPC-powered sniping (pool creation streaming + background monitoring) is coming in a future update.

### Add Liquidity

```bash
outsmart add-liq --dex meteora-lp-dlmm --pool <POOL> --amount-a 1.0
outsmart add-liq --dex meteora-lp-dlmm --pool <POOL> --amount-a 1.0 --amount-b 500
```

Currently supported by: `meteora-lp-dlmm` (DLMM positions with one-sided or balanced liquidity).

### Remove Liquidity

```bash
outsmart remove-liq --dex meteora-lp-dlmm --pool <POOL> --pct 100
outsmart remove-liq --dex meteora-lp-dlmm --pool <POOL> --pct 50
```

Currently supported by: `meteora-lp-dlmm` (removes liquidity from existing DLMM positions with claim-and-close).

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

Use outsmart as a library in your own bots:

```typescript
import { getDexAdapter, listDexAdapters } from "outsmart";

// Import adapters to register them
import "outsmart/dist/dex/raydium-cpmm";
import "outsmart/dist/dex/jupiter-ultra";

// Buy
const adapter = getDexAdapter("raydium-cpmm");
const result = await adapter.buy({
  tokenMint: "So11111111111111111111111111111111111111112",
  amountSol: 0.1,
  opts: { slippageBps: 300 },
});

console.log(result.txSignature);

// List all adapters
const adapters = listDexAdapters();
console.log(adapters.map(a => `${a.name}: ${a.protocol}`));
```

## Architecture

```
src/
├── cli.ts              # CLI entry point (Commander.js)
├── index.ts            # Library entry point (programmatic API)
├── dex/
│   ├── types.ts        # IDexAdapter interface, BuyParams, SwapResult, etc.
│   ├── index.ts        # DexRegistry singleton
│   ├── shared/
│   │   └── clmm-base.ts   # Shared CLMM base class
│   └── 17 adapter files
├── dexscreener/        # DexScreener market data
├── helpers/            # Config, wallet, connection, utilities
└── transactions/
    ├── landing/
    │   ├── orchestrator.ts    # Multi-provider TX submission
    │   ├── nonce-manager.ts   # Durable nonce for concurrent landing
    │   ├── tip-accounts.ts    # Tip account registry
    │   └── providers/         # 12 provider implementations
    └── legacy executors
```

Each DEX adapter implements `IDexAdapter` and self-registers with the `DexRegistry` on import. The CLI imports all adapters at startup; the library API lets you import only what you need.

## Roadmap

- [ ] gRPC-powered snipe streaming (`outsmart snipe-stream` with background monitoring)
- [ ] DAMM v2 add/remove liquidity + fee claiming
- [ ] OpenClaw AI agent plugin wrapper
- [ ] More DEX adapters as new protocols launch

## Credits

- [Raydium SDK v2](https://github.com/raydium-io/raydium-sdk-V2)
- [pumpdotfun-sdk](https://github.com/rckprtr/pumpdotfun-sdk)
- [yellowstone-grpc](https://github.com/rpcpool/yellowstone-grpc)
- [Meteora SDKs](https://github.com/MeteoraAg)
- [Orca Whirlpools](https://github.com/orca-so/whirlpools)

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
