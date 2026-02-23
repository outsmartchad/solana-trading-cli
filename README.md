# outsmart

**Solana trading CLI — buy, sell, LP, and operate perp exchanges across 18 DEXes with 12 TX landing providers.**

**[Documentation](https://outsmartchad.github.io/outsmart-cli/)** | **[npm](https://www.npmjs.com/package/outsmart)** | **[Discord](https://discord.gg/dc3Kh3Y3yJ)**

```bash
npm install -g outsmart@alpha
outsmart init
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1
```

---

## Quick Start

### 1. Install

```bash
# From npm (recommended)
npm install -g outsmart@alpha

# Or from source
git clone https://github.com/outsmartchad/outsmart-cli.git
cd outsmart-cli
npm install --legacy-peer-deps
npm run build
```

### 2. Configure

```bash
outsmart init
```

Prompts for your wallet key and RPC endpoint. Writes config to `~/.outsmart/config.env`. You only need to do this once.

### 3. Trade

```bash
# Buy 0.1 SOL worth of a token (token auto-detected from pool)
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1

# Sell 100% of held balance
outsmart sell --dex raydium-cpmm --pool <POOL> --pct 100

# Swap aggregator (no pool needed, just token mint)
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.1

# Check your balances
outsmart balance
```

**Example output:**

```
  buying on raydium-cpmm...
  TX sent: 5zwjta... — confirming...

  dex:       raydium-cpmm
  tx:        5zwjtaMj8LCzf4cY7Kt2QU2CAcAn3BAwvpVCbTjsR3qJ...
  confirmed: true
  in:        0.001 SOL
  out:       2.001886 USELESS
  pool:      Q2sPHPdUWFMg7M7wwrQKLrn619cAucfRsmhVJffodSp
```

---

## Commands

### Trading

#### buy

Buy tokens with SOL (or a quote token).

```bash
outsmart buy --dex <name> --pool <POOL> --amount <SOL>
outsmart buy --dex raydium-cpmm --pool <POOL> --amount 0.1
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.5
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `-a, --amount <sol>` | SOL amount to spend (required) |
| `-p, --pool <address>` | Pool address (required for on-chain DEXes) |
| `-t, --token <mint>` | Token mint (auto-detected from pool; required for aggregators) |

#### sell

Sell tokens for SOL. Specify what percentage of your balance to sell.

```bash
outsmart sell --dex <name> --pool <POOL> --pct <1-100>
outsmart sell --dex raydium-cpmm --pool <POOL> --pct 100
outsmart sell --dex jupiter-ultra --token <MINT> --pct 50
```

| Flag | Description |
|------|-------------|
| `-d, --dex <name>` | DEX adapter name (required) |
| `--pct <percentage>` | Percentage of balance to sell, 1-100 (required) |
| `-p, --pool <address>` | Pool address (required for on-chain DEXes) |
| `-t, --token <mint>` | Token mint (auto-detected from pool; required for aggregators) |

#### quote

Get the current on-chain price from a pool.

```bash
outsmart quote --dex raydium-cpmm --pool <POOL>
```

#### find-pool

Discover a pool for a token pair on a specific DEX.

```bash
outsmart find-pool --dex raydium-cpmm --token <MINT>
```

### Wallet Management

#### wallet

Show the active wallet address and SOL balance.

```bash
outsmart wallet
```

```
  label:   default
  address: tstXr3NbiMd6FFZF2qbPzxJqxCGXuSjpZVvdjeXiPv1
  balance: 0.377743 SOL
```

#### wallet list

Show all saved wallets with their balances. Active wallet marked with `*`.

```bash
outsmart wallet list
```

```
  LABEL              ADDRESS                                         SOL
  ──────────────────────────────────────────────────────────────────────────
 * default            tstXr3NbiMd6FFZF2qbPzxJqxCGXuSjpZVvdjeXiPv1  0.3777
   trading            7xKXt...                                       1.2340

  * = active wallet
```

#### wallet add

Add a new wallet. Prompts for the private key.

```bash
outsmart wallet add --label trading
```

#### wallet switch

Switch the active wallet. All subsequent commands use the new wallet.

```bash
outsmart wallet switch trading
```

#### wallet remove

Remove a saved wallet (with confirmation prompt).

```bash
outsmart wallet remove trading
```

### Balances

#### balance

Show SOL + stablecoin balances for the active wallet.

```bash
outsmart balance
```

```
  Wallet: tstXr3NbiMd6FFZF2qbPzxJqxCGXuSjpZVvdjeXiPv1

  SOL        0.377743
  USDC       0.000001
  USDT       0
  USD1       0
```

#### balance --token

Check the balance of a specific token.

```bash
outsmart balance --token <MINT>
```

### Liquidity

#### add-liq

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
| `--strategy <type>` | Distribution: `spot` \| `curve` \| `bid-ask` (DLMM only, default: spot) |
| `--bins <count>` | Number of bins (DLMM only, default: 50, max: 70) |

#### remove-liq

Remove liquidity from a pool.

```bash
outsmart remove-liq --dex meteora-damm-v2 --pool <POOL> --pct 100
```

#### claim-fees

Claim accumulated swap fees from LP positions.

```bash
outsmart claim-fees --dex meteora-damm-v2 --pool <POOL>
```

#### positions

List LP positions in a pool.

```bash
outsmart positions --dex meteora-damm-v2 --pool <POOL>
```

### Pool Creation

#### create-pump-coin

Create a new PumpFun token with a bonding curve.

```bash
outsmart create-pump-coin --name "My Token" --symbol "MYTKN" --uri "https://ipfs.io/ipfs/Qm..."
```

#### create-pool

Create a new PumpSwap AMM pool with initial liquidity.

```bash
outsmart create-pool --base <MINT> --quote So111...112 --base-amount 1000000 --quote-amount 1
```

#### create-damm-pool

Create a Meteora DAMM v2 custom pool with full fee configuration.

```bash
outsmart create-damm-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5
outsmart create-damm-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5 \
  --max-fee 5000 --min-fee 100 --fee-mode 1 --dynamic-fee
```

#### create-damm-config-pool

Create a Meteora DAMM v2 pool using an existing on-chain config.

```bash
outsmart create-damm-config-pool --base <MINT> --base-amount 1000000 --quote-amount 0.5 \
  --config <CONFIG_ADDRESS>
```

### Perpetual Futures (Percolator)

Create and operate on-chain perpetual futures exchanges. All prices in USD, all amounts in SOL.

#### perp create-market

Create a new perp market. You become the admin/oracle authority.

```bash
outsmart perp create-market --price 150 --lp 2
outsmart perp create-market --price 0.00001 --lp 5 --tier medium --network mainnet
```

| Flag | Description | Default |
|------|-------------|---------|
| `--price <usd>` | Initial oracle price in USD (required) | |
| `--lp <sol>` | Initial LP collateral in SOL (required) | |
| `--tier <size>` | `small` \| `medium` \| `large` | `small` |
| `--network <net>` | `devnet` \| `mainnet` | `devnet` |

#### perp long / short

Open a leveraged position.

```bash
outsmart perp long  -m <MARKET> -s 0.1
outsmart perp short -m <MARKET> -s 0.05
```

| Flag | Description |
|------|-------------|
| `-m, --market <address>` | Market (slab) address (required) |
| `-s, --size <sol>` | Position size in SOL (required) |

#### perp close

Close your open position.

```bash
outsmart perp close -m <MARKET>
```

#### perp status

View your position and market state.

```bash
outsmart perp status -m <MARKET>
```

#### perp deposit / withdraw

Manage collateral in your trading account.

```bash
outsmart perp deposit  -m <MARKET> -a 1.0
outsmart perp withdraw -m <MARKET> -a 0.5
outsmart perp withdraw -m <MARKET> -a all
```

#### perp init-user

Register a trading account on a market (required before first deposit/trade).

```bash
outsmart perp init-user -m <MARKET>
```

#### perp set-price

Push a new oracle price (admin-oracle markets only).

```bash
outsmart perp set-price -m <MARKET> --price 155.50
```

#### perp crank

Run the permissionless keeper crank (updates funding rates).

```bash
outsmart perp crank -m <MARKET>
```

#### perp keeper

Start the WebSocket oracle keeper — watches DEX pool accounts in real-time and pushes prices to your market.

```bash
# Single pool
outsmart perp keeper --pool <POOL> --market <MARKET> --dex raydium-cpmm

# Multi-pool config
outsmart perp keeper --config ~/.outsmart/keeper.json
```

| Flag | Description |
|------|-------------|
| `-p, --pool <address>` | DEX pool address |
| `-m, --market <address>` | Percolator market address |
| `-d, --dex <type>` | DEX type (see supported list below) |
| `-c, --config <path>` | JSON config for multi-pool mode |
| `-n, --network <net>` | `devnet` \| `mainnet` (default: devnet) |

Supported DEX types: `raydium-cpmm`, `raydium-amm-v4`, `raydium-clmm`, `raydium-launchlab`, `pumpswap`, `meteora-damm-v2`, `meteora-dbc`, `meteora-dlmm`

Config format (`keeper.json`):
```json
[
  { "pool": "<POOL>", "market": "<SLAB>", "dex": "raydium-cpmm", "network": "devnet" }
]
```

#### perp grpc-keeper

Same as `perp keeper` but uses Yellowstone gRPC (Geyser) instead of WebSocket. More reliable for production — handles reconnects and works with dedicated gRPC endpoints.

```bash
outsmart perp grpc-keeper --pool <POOL> --market <MARKET> --dex pumpswap
```

Requires `GRPC_URL` and `GRPC_XTOKEN` env vars.

#### perp markets

Discover all markets on-chain.

```bash
outsmart perp markets
outsmart perp markets --network mainnet
```

---

### Utilities

#### info

Fetch token market data from DexScreener.

```bash
outsmart info --token <MINT>
```

#### list-dex

List all registered DEX adapters and their capabilities.

```bash
outsmart list-dex
outsmart list-dex --cap canSell
```

#### config

View or generate configuration.

```bash
outsmart config show        # Show current env config (sensitive values masked)
outsmart config env         # Print a .env template
```

#### init

Interactive setup — prompts for wallet key and RPC endpoint.

```bash
outsmart init
```

---

## Stablecoin Auto-Swap

Some pools use stablecoins (USDC, USDT, USD1) as the quote token instead of SOL. The CLI handles this automatically — no extra steps needed.

**On buy:** detects the stablecoin quote from the pool, swaps SOL → stablecoin, then buys the token.

**On sell:** sells the token for stablecoin, then swaps the proceeds back to SOL.

```bash
# LaunchLab pool quoted in USD1 — just specify SOL amount as usual
outsmart buy --dex raydium-launchlab --pool <POOL> --amount 0.1
# → auto-swaps 0.1 SOL → USD1 → buys token

outsmart sell --dex raydium-launchlab --pool <POOL> --pct 100
# → sells token → USD1 → auto-swaps USD1 → SOL
```

Uses Jupiter Ultra if `JUPITER_API_KEY` is set, otherwise falls back to on-chain DEX pools. Get a free key at [portal.jup.ag](https://portal.jup.ag) (optional).

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
| `--quote <mint>` | Quote token mint | WSOL |

---

## DEX Adapters

18 adapters covering every major Solana DEX protocol:

| Adapter | Protocol | Buy | Sell | Price | LP | Extra | Tested |
|---------|----------|:---:|:----:|:-----:|:--:|-------|:------:|
| raydium-amm-v4 | AMM v4 | ✅ | ✅ | ✅ | | findpool | ✅ |
| raydium-cpmm | CPMM | ✅ | ✅ | ✅ | | findpool | ✅ |
| raydium-clmm | CLMM | ✅ | ✅ | ✅ | | findpool | ✅ |
| raydium-launchlab | Launchlab | ✅ | ✅ | ✅ | | findpool, auto-swap | ✅ |
| meteora-damm-v1 | Dynamic AMM | ✅ | ✅ | ✅ | | findpool | — |
| meteora-damm-v2 | CpAmm | ✅ | ✅ | ✅ | full | findpool, create pool | ✅ |
| meteora-dlmm | DLMM | ✅ | ✅ | ✅ | full | | ✅ |
| meteora-dbc | DBC | ✅ | ✅ | ✅ | | | ✅ |
| pumpfun | Bonding Curve | ✅ | ✅ | ✅ | | create coin | ✅ |
| pumpfun-amm | PumpSwap AMM | ✅ | ✅ | ✅ | | create pool | ✅ |
| orca | Whirlpool | ✅ | ✅ | ✅ | | | ✅ |
| byreal-clmm | CLMM | ✅ | ✅ | ✅ | | auto-swap | ✅ |
| pancakeswap-clmm | CLMM | ✅ | ✅ | ✅ | | | ✅ |
| fusion-amm | Fusion | ✅ | ✅ | ✅ | | | ✅ |
| futarchy-amm | Futarchy | ✅ | ✅ | ✅ | | auto-swap | ✅ |
| futarchy-launchpad | Launchpad | | | | | fund/claim | — |
| jupiter-ultra | Ultra API | ✅ | ✅ | | | aggregator | ✅ |
| dflow | Intent API | ✅ | ✅ | | | aggregator | ✅ |

All ✅ adapters confirmed on Solana mainnet with real transactions.

## Percolator — Permissionless Perpetual Futures

Create and operate your own on-chain perpetual futures exchange on Solana. The `PercolatorAdapter` is a standalone class (not `IDexAdapter` — perps are fundamentally different from spot).

### Why This Matters

First mover creates the perp market for a trending token and captures ALL leveraged volume fees. Nobody else has done AI-operated perp exchanges yet. This is the Percolator alpha.

### Quick Start (Programmatic API)

```typescript
import { PercolatorAdapter } from "outsmart";

const percolator = new PercolatorAdapter();

// 1. Create a perp market (devnet, BONK collateral, $1 initial price)
const market = await percolator.createMarket({
  collateralMint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  initialPriceE6: 1_000_000n, // $1.00
  tier: "small",
  network: "devnet",
  lpCollateral: 1_000_000_000n, // 1B BONK for LP
});
console.log("Market:", market.slabAddress);

// 2. Register a trader
const { userIdx } = await percolator.initUser(market.slabAddress, "devnet");

// 3. Deposit collateral
await percolator.deposit(market.slabAddress, userIdx, 500_000_000n, "devnet");

// 4. Open a long position (positive size = long, negative = short)
await percolator.trade({
  slabAddress: market.slabAddress,
  userIdx,
  lpIdx: market.lpIndex,
  size: 100_000_000n, // long 100M units
  network: "devnet",
});

// 5. Push oracle price (admin-oracle mode)
await percolator.pushOraclePrice(market.slabAddress, 1_100_000n, "devnet"); // $1.10

// 6. Read market state
const state = await percolator.getMarketState(market.slabAddress, "devnet");
console.log("Open interest:", state.engine.openInterestLong);

// 7. Check your position
const pos = await percolator.getMyPosition(market.slabAddress, "devnet");
console.log("PnL:", pos?.account.unrealizedPnl);
```

### PercolatorAdapter Methods (20)

| Method | Description |
|--------|-------------|
| `createMarket(params)` | Full 10-step market creation (slab → init → oracle → crank → vAMM → LP) |
| `initUser(slab, network?, tier?)` | Register a trader account, returns assigned index |
| `deposit(slab, idx, amount, network?, tier?)` | Deposit collateral |
| `withdraw(slab, idx, amount, network?, tier?)` | Withdraw collateral |
| `trade(params)` | Open/close/modify positions via TradeCpi |
| `closeAccount(slab, idx, network?, tier?)` | Close account and recover rent |
| `crank(slab, network?, tier?)` | Permissionless keeper crank |
| `pushOraclePrice(slab, priceE6, network?, tier?)` | Update oracle price (admin only) |
| `liquidate(slab, targetIdx, network?, tier?)` | Permissionless liquidation |
| `createInsuranceMint(slab, network?, tier?)` | One-time insurance LP mint creation |
| `depositInsuranceLP(slab, amount, network?, tier?)` | Deposit into insurance fund |
| `withdrawInsuranceLP(slab, lpAmount, network?, tier?)` | Withdraw from insurance fund |
| `getMarketState(slab, network?)` | Read full slab state (header, config, engine, params, accounts) |
| `getMyPosition(slab, network?)` | Find user's account by owner pubkey |
| `discoverMarkets(network?)` | Find all markets across all program tiers |
| `adminForceClose(slab, targetIdx, network?, tier?)` | Admin force-close a position |
| `resolveMarket(slab, network?, tier?)` | Resolve/freeze market (admin only) |
| `withdrawInsurance(slab, network?, tier?)` | Withdraw insurance fund balance |
| `closeSlab(slab, network?, tier?)` | Close slab account and recover rent |
| `teardownMarket(slab, network?, tier?)` | Full teardown: resolve → force-close all → withdraw → close |

### Math Utilities

Exported for PnL calculation, risk analysis, and pre-trade simulation:

```typescript
import {
  computeMarkPnl,
  computeLiqPrice,
  computePreTradeLiqPrice,
  computeTradingFee,
  computePnlPercent,
  computeEstimatedEntryPrice,
  computeFundingRateAnnualized,
  computeRequiredMargin,
  computeMaxLeverage,
  computeVammQuote,
} from "outsmart";
```

### Deployed Programs

| Tier | Devnet | Mainnet |
|------|--------|---------|
| Small | `FxfD37s1AZTeWfFQps9Zpebi2dNQ9QSSDtfMKdbsfKrD` | `GM8zjJ8LTBMv9xEsverh6H6wLyevgMHEJXcEzyY3rY24` |
| Medium | `FwfBKZXbYr4vTK23bMFkbgKq3npJ3MSDxEaKmq9Aj4Qn` | — |
| Large | `g9msRSV3sJmmE3r5Twn9HuBsxzuuRGTjKCVTKudm9in` | — |
| Matcher | `4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy` | `DHP6DtwXP1yJsz8YzfoeigRFPB979gzmumkmCxDLSkUX` |

---

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

Set any provider's API key and it's automatically enabled. The orchestrator sends your transaction through all enabled providers simultaneously for the fastest possible landing.

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Base58-encoded wallet private key |
| `MAINNET_ENDPOINT` | Solana mainnet RPC endpoint |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `TX_LANDING_MODE` | `concurrent` \| `race` \| `random` \| `sequential` | `concurrent` |
| `DEFAULT_TIP_SOL` | MEV tip in SOL | `0.001` |
| `DEFAULT_SLIPPAGE_BPS` | Slippage in basis points | `300` |
| `DEFAULT_PRIORITY_FEE` | Priority fee in microLamports per CU | `4000` |
| `DEVNET_ENDPOINT` | Solana devnet RPC endpoint (for Percolator) | not set |
| `JUPITER_API_KEY` | Jupiter Ultra API key ([portal.jup.ag](https://portal.jup.ag)) | works without key |
| `DFLOW_API_KEY` | DFlow intent API key ([pond.dflow.net](https://pond.dflow.net/build/api-key)) | required for dflow |
| `GRPC_URL` | Yellowstone gRPC endpoint (for gRPC keeper) | not set |
| `GRPC_XTOKEN` | Yellowstone gRPC auth token | not set |

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
console.log("Received:", result.amountOut);

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
npm run test:unit        # 43 CI-safe unit tests (no RPC/SOL needed)
npm run test:registry    # Registry smoke test
npm run test:raydium     # Raydium adapters (mainnet)
npm run test:meteora     # Meteora adapters (mainnet)
npm run test:pumpfun     # PumpFun + PumpSwap (mainnet)
npm run test:orca        # Orca Whirlpool (mainnet)
npm run test:clmm        # Byreal + PancakeSwap CLMM (mainnet)
npm run test:fusion      # Fusion + Futarchy AMM (mainnet)
npm run test:api         # Jupiter Ultra + DFlow (mainnet)
npm run test:percolator  # Percolator perps (devnet)
```

Mainnet tests require `PRIVATE_KEY` and `MAINNET_ENDPOINT` env vars. Percolator tests require `DEVNET_ENDPOINT`. Tests use tiny amounts (0.002 SOL per buy). Run suites one at a time — tests share a wallet and cannot run in parallel.

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
│   ├── percolator/
│   │   ├── adapter.ts     # PercolatorAdapter (20 methods)
│   │   ├── ws-keeper.ts   # WebSocket oracle keeper (8 DEX types)
│   │   ├── grpc-keeper.ts # gRPC oracle keeper (Yellowstone/Geyser)
│   │   └── core/          # Vendored @percolator/core SDK
│   └── 18 adapter files
├── dexscreener/           # Market data (DexScreener API)
├── helpers/
│   ├── config.ts          # Wallet, connection, env loading
│   ├── wallets.ts         # Multi-wallet management
│   └── logger.ts          # Structured logger
└── transactions/
    ├── send-rpc.ts        # sendAndConfirmVtx (standard swaps)
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

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The authors take no responsibility for any financial loss. Users are responsible for ensuring compliance with applicable laws.

Never share your private keys. Wallet keys are stored in `~/.outsmart/` with owner-only permissions.

## License

ISC
