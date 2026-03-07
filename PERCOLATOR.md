# Percolator — Permissionless Perpetual Futures

> ⚠️ **Work in progress.** The Percolator perps engine is not yet production-ready and currently runs on **Solana devnet** only. Mainnet support is planned. Use at your own risk.

Create and operate your own on-chain perpetual futures exchange on Solana. The `PercolatorAdapter` is a standalone class (not `IDexAdapter` — perps are fundamentally different from spot).

## Why This Matters

First mover creates the perp market for a trending token and captures ALL leveraged volume fees. Nobody else has done AI-operated perp exchanges yet. This is the Percolator alpha.

---

## CLI

All prices in USD, all amounts in SOL. Requires `DEVNET_ENDPOINT` env var.

### perp create-market

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

### perp long / short

Open a leveraged position.

```bash
outsmart perp long  -m <MARKET> -s 0.1
outsmart perp short -m <MARKET> -s 0.05
```

| Flag | Description |
|------|-------------|
| `-m, --market <address>` | Market (slab) address (required) |
| `-s, --size <sol>` | Position size in SOL (required) |

### perp close

Close your open position.

```bash
outsmart perp close -m <MARKET>
```

### perp status

View your position and market state.

```bash
outsmart perp status -m <MARKET>
```

### perp deposit / withdraw

Manage collateral in your trading account.

```bash
outsmart perp deposit  -m <MARKET> -a 1.0
outsmart perp withdraw -m <MARKET> -a 0.5
outsmart perp withdraw -m <MARKET> -a all
```

### perp init-user

Register a trading account on a market (required before first deposit/trade).

```bash
outsmart perp init-user -m <MARKET>
```

### perp set-price

Push a new oracle price (admin-oracle markets only).

```bash
outsmart perp set-price -m <MARKET> --price 155.50
```

### perp crank

Run the permissionless keeper crank (updates funding rates).

```bash
outsmart perp crank -m <MARKET>
```

### perp keeper

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

### perp grpc-keeper

Same as `perp keeper` but uses Yellowstone gRPC (Geyser) instead of WebSocket. More reliable for production — handles reconnects and works with dedicated gRPC endpoints.

```bash
outsmart perp grpc-keeper --pool <POOL> --market <MARKET> --dex pumpswap
```

Requires `GRPC_URL` and `GRPC_XTOKEN` env vars.

### perp markets

Discover all markets on-chain.

```bash
outsmart perp markets
outsmart perp markets --network mainnet
```

---

## Programmatic API

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

## PercolatorAdapter Methods (20)

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

## Math Utilities

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

## Deployed Programs

| Tier | Devnet | Mainnet |
|------|--------|---------|
| Small | `FxfD37s1AZTeWfFQps9Zpebi2dNQ9QSSDtfMKdbsfKrD` | `GM8zjJ8LTBMv9xEsverh6H6wLyevgMHEJXcEzyY3rY24` |
| Medium | `FwfBKZXbYr4vTK23bMFkbgKq3npJ3MSDxEaKmq9Aj4Qn` | — |
| Large | `g9msRSV3sJmmE3r5Twn9HuBsxzuuRGTjKCVTKudm9in` | — |
| Matcher | `4HcGCsyjAqnFua5ccuXyt8KRRQzKFbGTJkVChpS7Yfzy` | `DHP6DtwXP1yJsz8YzfoeigRFPB979gzmumkmCxDLSkUX` |

## Testing

```bash
npm run test:percolator  # Percolator perps (devnet — requires DEVNET_ENDPOINT)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DEVNET_ENDPOINT` | Solana devnet RPC endpoint (required for all perp commands) |
| `GRPC_URL` | Yellowstone gRPC endpoint (for `perp grpc-keeper`) |
| `GRPC_XTOKEN` | Yellowstone gRPC auth token |
