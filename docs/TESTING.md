# Testing Guide

How to run mainnet integration tests for outsmart-cli.

---

## Prerequisites

### 1. Create `.env`

```bash
cd outsmart-cli
cp .env.example .env
```

Edit `.env` with your values:

```bash
PRIVATE_KEY=your_base58_private_key_here
MAINNET_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
```

Or use the interactive setup:

```bash
node dist/cli.js init
```

### 2. Fund the test wallet

The test wallet needs at least **0.01 SOL** (recommend **0.05 SOL**).

Tests use small amounts:
- Buy: 0.02 SOL per trade (`BUY_AMOUNT_SOL` in `tests/helpers.ts`)
- Sell: 100% of what was just bought (gets the SOL back minus fees)
- TX fees: ~0.000005 SOL each
- Total across all suites: **~0.05-0.10 SOL** if everything passes

### 3. Build

```bash
npm run build
```

---

## Test Suites

Run them **one at a time** in this order. Fix issues before moving to the next.

### 1. Registry (no RPC, no SOL needed)

```bash
npm run test:registry
```

**What it tests:**
- All 17 adapters are registered in the DexRegistry
- Each adapter is accessible via `getDexAdapter(name)`
- Capability flags match expected values (canBuy, canSell, etc.)
- `buy()` and `sell()` methods exist on all adapters

**Expected:** 4/4 pass, ~2 seconds. Already passing.

---

### 2. Raydium (mainnet, costs ~0.01 SOL)

```bash
npm run test:raydium
```

**What it tests:**

| Adapter | Tests | Pool |
|---------|-------|------|
| raydium-amm-v4 | findPool, getPrice, buy | `58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2` (SOL/USDC) |
| raydium-cpmm | findPool, getPrice, buy, sell | `7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny` (SOL/USDC) |
| raydium-clmm | findPool, getPrice, buy, sell | `2QdhepnKRTLjjSqPL1PtKNwqrUkoLee2B1d3S4TNagMs` (SOL/USDC) |
| raydium-launchlab | capabilities check only | (skipped — needs active bonding curve) |

**Flow per adapter:**
1. `findPool` — queries Raydium API for SOL/USDC pool
2. `getPrice` — reads on-chain pool state, returns price
3. `buy` — buys 0.001 SOL worth of USDC
4. `sell` — sells 100% of the USDC just bought (5s delay for confirmation)

**Expected:** ~10 tests, 2-3 minutes (includes delays + TX confirmation)

---

### 3. Meteora (mainnet, costs ~0.04 SOL)

```bash
npm run test:meteora
```

**What it tests:**

| Adapter | Tests | Pool |
|---------|-------|------|
| meteora-damm-v2 | capabilities, getPrice, buy, sell | `9x7WTWq66KbMC1w7AUX72khNg31nQmWRE4N4cDvJY7JT` (MET/SOL) |
| meteora-dlmm | getPrice, buy, sell | `AsSyvUnbfaZJPRrNh3kUuvZTeHKoMVWEoHz86f4Q5D9x` (MET/SOL) |
| meteora-dbc | capabilities, getPrice, buy, sell | `DgxYpXJB2adQ9wFdyoCdnh5fNGfcLxXZsdkdqoyZZmwX` (GRACE/SOL) |
| meteora-dlmm (LP) | capabilities, addLiquidity, listPositions, claimFees, removeLiquidity | `AsSyvUnbfaZJPRrNh3kUuvZTeHKoMVWEoHz86f4Q5D9x` (MET/SOL) |

**Notes:**
- DAMM v1 is excluded — legacy AMM program.
- All swap adapters use hardcoded pool addresses (no `findPool` in tests).
- All swap adapters use `sendAndConfirmVtx` for TX submission (standard RPC, not landing orchestrator).
- DLMM LP tests run a full lifecycle: add → list → claim fees → remove 100%.
- DLMM LP addLiquidity may fail with blockhash expiry if SDK calls are slow (WIP fix).
- Buy amount: 0.02 SOL per trade.

**Expected:** ~16 tests, 2-3 minutes for swaps + ~60s for LP

---

### 4. Orca (mainnet, costs ~0.005 SOL)

```bash
npm run test:orca
```

**What it tests:**

| Adapter | Tests | Pool |
|---------|-------|------|
| orca | capabilities, getPrice, buy, sell | `Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE` (SOL/USDC Whirlpool) |

**Expected:** 4 tests, ~1 minute

---

### 5. CLMM forks (capabilities only, no SOL needed)

```bash
npm run test:clmm
```

**What it tests:**

| Adapter | Tests |
|---------|-------|
| byreal-clmm | capabilities check only |
| pancakeswap-clmm | capabilities check only |

Both have `test.skip` for actual buy tests — need known pool addresses on these niche DEXes.

**Expected:** 2 tests pass, 2 skipped

---

### 6. Fusion + Futarchy (capabilities only, no SOL needed)

```bash
npm run test:fusion
```

**What it tests:**

| Adapter | Tests |
|---------|-------|
| fusion-amm | capabilities check only |
| futarchy-amm | capabilities check only |
| futarchy-launchpad | capabilities check only |

All buy tests are `test.skip` — need known pool/DAO addresses on these niche DEXes.

**Expected:** 3 tests pass, 3 skipped

---

### 7. API adapters (mainnet, costs ~0.005 SOL)

```bash
npm run test:api
```

**What it tests:**

| Adapter | Tests | Needs |
|---------|-------|-------|
| jupiter-ultra | capabilities, buy, sell | (no API key needed for basic usage) |
| dflow | capabilities, buy, sell | `DFLOW_API_KEY` env var (skips if not set) |

**Expected:** 2-4 tests pass, 2 may skip (DFlow without API key)

---

### 8. All tests at once

Only run this after individual suites pass:

```bash
npm test
```

Runs all test files sequentially (`maxWorkers: 1` since tests share a wallet). Takes 10-15 minutes.

---

## Pool Addresses Used

All pools are high-liquidity mainnet pairs. Defined in `tests/helpers.ts`.

| Pool | Address | DEX |
|------|---------|-----|
| Raydium AMM v4 SOL/USDC | `58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2` | raydium-amm-v4 |
| Raydium CPMM SOL/USDC | `7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny` | raydium-cpmm |
| Raydium CLMM SOL/USDC | `2QdhepnKRTLjjSqPL1PtKNwqrUkoLee2B1d3S4TNagMs` | raydium-clmm |
| Meteora DAMM v2 MET/SOL | `9x7WTWq66KbMC1w7AUX72khNg31nQmWRE4N4cDvJY7JT` | meteora-damm-v2 |
| Meteora DLMM MET/SOL | `AsSyvUnbfaZJPRrNh3kUuvZTeHKoMVWEoHz86f4Q5D9x` | meteora-dlmm |
| Meteora DBC GRACE/SOL | `DgxYpXJB2adQ9wFdyoCdnh5fNGfcLxXZsdkdqoyZZmwX` | meteora-dbc |
| Orca Whirlpool SOL/USDC | `Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE` | orca |

---

## Troubleshooting

### `PRIVATE_KEY not set`
Create `.env` at the project root with your `PRIVATE_KEY` and `MAINNET_ENDPOINT`.

### `Wallet has only X SOL. Need at least 0.01 SOL`
Send more SOL to the test wallet. Check the wallet address in the test output.

### `sell` fails after `buy`
The buy TX may not have confirmed yet. The test has a 5-second delay, but slow RPC can cause this. Re-run the test.

### RPC rate limiting
Tests have 2-second delays between calls. If your RPC is rate-limiting, increase the delay in `tests/helpers.ts` (`delay()` default is 2000ms).

### `PoolNotFound`
The hardcoded pool address may have migrated. Check the pool on-chain (Solscan/Explorer). Update the address in `tests/helpers.ts`.

### Niche DEX tests skipped
byreal-clmm, pancakeswap-clmm, fusion-amm, futarchy-amm, meteora-dbc, raydium-launchlab tests are `test.skip` because they need specific pool addresses on niche DEXes. To test them manually, find an active pool and replace the placeholder address in the test file.

---

## Test Configuration

- **Jest config:** `jest.config.ts`
- **Timeout:** 120 seconds per test
- **Sequential:** `maxWorkers: 1` (tests share a wallet, can't run in parallel)
- **Setup:** `tests/setup.ts` imports all 17 adapters for registration
- **Helpers:** `tests/helpers.ts` — pool addresses, amounts, pre-flight checks

## Cost Estimate

| Suite | Approx Cost |
|-------|------------|
| registry | 0 SOL |
| raydium | ~0.01 SOL |
| meteora | ~0.01 SOL |
| orca | ~0.005 SOL |
| clmm | 0 SOL |
| fusion | 0 SOL |
| api | ~0.005 SOL |
| **Total** | **~0.03 SOL** |

Most of the SOL spent on buys comes back via sells. Net loss is mostly TX fees.
