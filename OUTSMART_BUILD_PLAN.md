# OUTSMART Build Plan — Full Work Distribution

## Overview

**Goal:** Transform `solana-trading-cli` (566-star legacy prototype) into `outsmart-cli` — a production-grade, distributable CLI package with 17 DEX integrations, 12 TX landing providers, and a unified command interface.

> Agent/MCP/OpenClaw integration lives in the separate [`outsmart-agent`](https://github.com/outsmartchad/outsmart-agent) repo.

**Source modules:** `100x-algo-bots/trading-modules/*` (battle-tested production code)
**Target repo:** `solana-trading-cli` (package renamed to `outsmart`)
**Branch:** `agent-trading-infra`

---

## Architecture Decisions

### 1. Class-Based IDexAdapter (not loose handler functions)

Every DEX module implements the `IDexAdapter` interface (defined in `src/dex/types.ts`). The CLI and library consumers access adapters via `getDexAdapter("raydium-amm-v4")` from the `DexRegistry` — no direct imports of DEX internals.

```typescript
interface IDexAdapter {
  readonly name: string;        // "raydium-amm-v4", "meteora-dlmm", etc.
  readonly protocol: string;    // "amm-v4", "cpmm", "clmm", "dlmm", etc.
  readonly capabilities: DexCapabilities;

  buy(params: BuyParams): Promise<SwapResult>;
  sell(params: SellParams): Promise<SwapResult>;
  snipe?(params: SnipeParams): Promise<SwapResult>;
  buildSwapIxs?(params: BuyParams | SellParams): Promise<BuildSwapIxsResult>;
  findPool?(baseMint: string, quoteMint?: string): Promise<PoolInfo | null>;
  getPrice?(poolAddress: string): Promise<PriceInfo>;
  addLiquidity?(params: AddLiquidityParams): Promise<TxResult>;
  removeLiquidity?(params: RemoveLiquidityParams): Promise<TxResult>;
}
```

### 2. Durable Nonce for Concurrent TX Landing

The `concurrent` strategy fires the same transaction to 9+ providers. Without a durable nonce, duplicate buys are possible. `NonceManager` (`src/transactions/landing/nonce-manager.ts`) creates/manages a nonce account on-chain (~0.0015 SOL). The orchestrator auto-prepends `nonceAdvance` as the first instruction and uses the nonce value as blockhash. Without nonce configured, concurrent falls back to `race` strategy with a warning.

### 3. Zero Hardcoded Secrets

ALL API keys, private keys, and RPC endpoints come from environment variables. Tip accounts (public on-chain addresses) are OK to include directly. The ALT address and wallet addresses must NOT appear in source code.

### 4. New Adapter Files Alongside Legacy Code

DEX adapters go in `src/dex/` alongside legacy code. Legacy `src/raydium/`, `src/meteora/`, `src/orca/`, `src/jupiter/` are NOT rewritten in-place — new class-based adapters sit next to them and wrap/replace the functionality.

### 5. Standalone CLI + Library Export

`outsmart-cli` is an independent npm package with its own CLI. It also exports `IDexAdapter`/`DexRegistry` as a library for programmatic use (`import { getDexAdapter } from 'outsmart'`). Agent/MCP integration is handled in the separate `outsmart-agent` repo.

---

## SDK Dependency Clusters

Understanding which modules share SDKs informs agent groupings:

| Cluster | Shared SDK | Modules |
|---------|-----------|---------|
| **Raydium** | `@raydium-io/raydium-sdk-v2` or raw IX building | raydium-amm-v4, raydium-cpmm, raydium-clmm, raydium-launchlab, raydium (tx-parser) |
| **Meteora** | `@meteora-ag/*` SDKs (each different) | meteora-damm-v1, meteora-damm-v2, meteora-dlmm, meteora-dbc, meteora-lp/dlmm |
| **CLMM forks** | ~90% identical code (different program IDs) | raydium-clmm, byreal-clmm, pancakeswap-clmm |
| **Orca** | `@orca-so/whirlpools` v5 + `@solana/kit` | orca |
| **Anchor-based** | `@coral-xyz/anchor` | futarchy-amm, futarchy-launchpad |
| **API-driven** | REST APIs (no on-chain IX building) | jupiter-ultra, DFlow |
| **Cross-cutting** | `@raydium-io/raydium-sdk-v2` MathUtil | meteora-damm-v2, meteora-dlmm, byreal-clmm, pancakeswap-clmm |

**CLMM fork optimization:** raydium-clmm, byreal-clmm, and pancakeswap-clmm are ~90% identical code with different program IDs. A generic CLMM adapter parameterized by program ID can cover all 3.

---

## Complexity Tiers

| Tier | LOC Range | Modules |
|------|----------|---------|
| **XL (10k+)** | 10k-25k | meteora-lp/dlmm (25.4k), futarchy-launchpad (13.9k), futarchy-amm (11.9k) |
| **L (3k-10k)** | 3k-10k | meteora-damm-v2 (7.9k), raydium-clmm (4.6k), byreal-clmm (3.2k), pancakeswap-clmm (3.2k) |
| **M (1k-3k)** | 1k-3k | raydium/ (2.8k), orca (2.1k), raydium-amm-v4 (1.7k), raydium-cpmm (1.3k), raydium-launchlab (1.3k), meteora-dbc (1.1k), fusion-amm (1.0k) |
| **S (<1k)** | <1k | DFlow (771), jupiter-ultra (701), meteora-dlmm (452), meteora-damm-v1 (443) |

---

## Phase Summary

### [x] Phase 0 — Foundation Rewrite (DONE)

**Commits:** `c21638f`, `faa5ec6`

- [x] Kill module-scope side effects (10 files: buy.ts, sell.ts, wrap_sol.ts, unwrap_sol.ts)
- [x] Fix config.ts — lazy wallet/connection, removed exported private key, typed fees
- [x] Fix 9 infinite loops with bounded retry + exponential backoff
- [x] Fix critical swap bugs (raydium missing await, meteora direction + slippage)
- [x] Fix 6 gRPC bugs (mutex, tip race, attempt counter, minAmountOut, priority fee, leaked secrets)
- [x] Fix all critical `any` types in money paths
- [x] Remove hardcoded API keys, filesystem paths, console-logged secrets
- [x] Updated package.json (renamed to `outsmart`, added bin/files/main/types/build scripts)
- [x] Created tsconfig.build.json

### [x] Phase 1 — TX Landing Layer (DONE)

**Commits:** `294097f`, `3d16649`

- [x] Created `ILandingProvider` interface with uniform `submit()` method
- [x] Implemented 12 provider modules (zero-slot, nozomi, helius-sender, blockrazor, node1, bloxroute, astralane, stellium, flashblock, jito, nextblock, soyas)
- [x] Built `LandingOrchestrator` with 4 strategies (concurrent, race, random, sequential)
- [x] Created tip account registry (100+ accounts, O(1) lookup)
- [x] Created barrel exports and convenience functions

### [x] Phase 1.5 — IDexAdapter Types + DexRegistry + NonceManager (DONE)

**Commits:** `b1b854c`, `4156c9c`

- [x] Created `IDexAdapter` interface with full type system (src/dex/types.ts)
  - BuyParams, SellParams, SnipeParams, SwapResult, PoolInfo, PriceInfo
  - DexCapabilities feature flags
  - BuildSwapIxsResult for nonce/snipe integration
  - UnsupportedOperationError, PoolNotFoundError
  - Common constants (WSOL_MINT, USDC_MINT, default slippage/fees)
- [x] Created `DexRegistry` class (src/dex/index.ts)
  - registerAdapter(), getDexAdapter(), listDexAdapters()
  - getAdaptersByProtocol(), getAdaptersWithCapability()
  - Global singleton with convenience functions
- [x] Created `NonceManager` class (src/transactions/landing/nonce-manager.ts)
  - create() — creates nonce account on-chain (~0.0015 SOL)
  - load() / get() — fetches fresh nonce from chain
  - buildAdvanceIx() — returns nonceAdvance instruction
  - ensureExists() — auto-create with user confirmation prompt
  - close() — reclaim rent
  - Config stored at ~/.outsmart/nonce.json
- [x] Wired nonce into orchestrator's submitConcurrent()
  - Prepends nonceAdvance as first instruction
  - Uses nonce value as blockhash
  - Falls back to race strategy if no nonce configured
  - Added skipNonce option to SubmitOptions

### [ ] Phase 2 — Raydium Adapters (Agent 2, 7 modules)

**Modules:** raydium-amm-v4, raydium-cpmm, raydium-clmm, raydium-launchlab, raydium (tx-parser), raydium (legacy buy/sell wrapping)

Each module becomes a class implementing `IDexAdapter`:
- `src/dex/raydium-amm-v4.ts` — implements buy, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/raydium-cpmm.ts` — implements buy, sell, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/raydium-clmm.ts` — implements buy, sell, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/raydium-launchlab.ts` — implements buy only (buy-only until pool migration)
- Port tx-parser utilities to `src/raydium/utils/`

### [ ] Phase 3 — Meteora Adapters (Agent 3, 5 modules)

**Modules:** meteora-damm-v1, meteora-damm-v2, meteora-dlmm, meteora-dbc, meteora-lp/dlmm

- `src/dex/meteora-damm-v1.ts` — buy, findPool, getPrice
- `src/dex/meteora-damm-v2.ts` — buy, sell, snipe, findPool, getPrice, addLiquidity
- `src/dex/meteora-dlmm.ts` — buy, snipe, findPool, getPrice
- `src/dex/meteora-dbc.ts` — buy, sell, snipe, findPool, getPrice
- `src/dex/meteora-lp-dlmm.ts` — addLiquidity, removeLiquidity (LP management, 25k LOC)

### [ ] Phase 4 — CLMMs + Orca + Fusion (Agent 4, 4 modules)

**Modules:** byreal-clmm, pancakeswap-clmm, orca, fusion-amm

CLMM fork optimization: Generic CLMM adapter parameterized by program ID covers byreal-clmm and pancakeswap-clmm (they share ~90% code with raydium-clmm).

- `src/dex/byreal-clmm.ts` — buy, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/pancakeswap-clmm.ts` — buy, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/orca.ts` — buy, snipe, findPool, getPrice, buildSwapIxs
- `src/dex/fusion-amm.ts` — buy, snipe, findPool, getPrice, buildSwapIxs

### [ ] Phase 5 — Futarchy + API Adapters + Shared Infra (Agent 5, 4 modules)

**Modules:** futarchy-amm, futarchy-launchpad, jupiter-ultra, DFlow

- `src/dex/futarchy-amm.ts` — buy, snipe, findPool, getPrice (Anchor-based)
- `src/dex/futarchy-launchpad.ts` — fund, claim (not standard buy/sell — custom methods)
- `src/dex/jupiter-ultra.ts` — buy, sell (REST API, no pool concept)
- `src/dex/dflow.ts` — buy, sell (intent-based API)

Shared infra:
- Token-2022 support utilities
- Shared buffer-layout consolidation
- Shared token-filters

### [ ] Phase 6 — CLI + Packaging (Agent 6)

- CLI entry point with `outsmart` command
- Subcommands: buy, sell, quote, find-pool, add-liq, remove-liq, claim-fees, positions, list-dex, config, init, info
- Wire all DEX adapters via DexRegistry
- Output formatting, --json, --verbose, --dry-run flags
- npm publish, Homebrew formula, standalone binaries, shell completion

### [ ] Snipe Command — gRPC Pool Creation Listener

**Status:** Not yet implemented. Requires user's own Geyser gRPC key.

The `outsmart snipe` command is a **background process** that listens for new liquidity pool creation on selected DEXes and instantly buys when a target token appears.

**How it works:**

1. User runs:
   ```bash
   outsmart snipe --dex raydium-cpmm,meteora-damm-v2 --token <MINT> --amount 0.5 --tip 0.01
   ```

2. The command spawns a **background listener** (cronjob/tmux process) that:
   - Connects to a **Geyser gRPC stream** (Yellowstone) using the user's own gRPC key (`GRPC_URL` + `GRPC_XTOKEN` env vars)
   - Subscribes to **program account updates** for the selected DEX program IDs
   - Filters for **pool creation events** — new accounts matching the pool layout for each DEX

3. When a new pool is created:
   - Checks if the **base or quote token** matches the target `--token` mint address
   - If match found, **instantly fires a buy transaction** through concurrent multi-provider TX landing (all 12 providers)
   - Uses durable nonce for exactly-once execution safety
   - Applies the user's `--tip` and `--amount` settings

4. After successful snipe (or user cancellation), the listener shuts down cleanly

**Requirements:**
- User's own Geyser gRPC key (from Helius, Triton, Shyft, or another provider)
- `GRPC_URL` and `GRPC_XTOKEN` environment variables set
- Funded wallet with enough SOL for the snipe + fees + tip

**Implementation plan:**
- Port gRPC streaming code from `100x-algo-bots/trading-modules/` 
- Add reconnection logic, heartbeat, clean shutdown hardening
- Wire pool creation detection to the existing `snipe()` adapter methods (already implemented in all adapters)
- Wire to `LandingOrchestrator.submitConcurrent()` with nonce for dedup safety
- Background process management (spawn/monitor/kill)
- This completes the **Listen** layer of the three-layer architecture
- Timing: after user provides specific instructions for `100x-algo-bots` gRPC integration

---

## Agent Assignments (6 Agents)

| Agent | Responsibility | Modules | Status |
|-------|---------------|---------|--------|
| **Agent 1** (Foundation) | Phase 0, Phase 1, Phase 1.5 (types/registry/nonce) | Shared infrastructure | **DONE** |
| **Agent 2** (Raydium) | Phase 2 — all Raydium programs | raydium-amm-v4, raydium-cpmm, raydium-clmm, raydium-launchlab, raydium (tx-parser), legacy raydium wrapper | Unblocked |
| **Agent 3** (Meteora) | Phase 3 — all Meteora programs | meteora-damm-v1, meteora-damm-v2, meteora-dlmm, meteora-dbc, meteora-lp/dlmm | Unblocked |
| **Agent 4** (CLMMs+Orca) | Phase 4 — CLMM forks + Orca + Fusion | byreal-clmm, pancakeswap-clmm, orca, fusion-amm | Unblocked |
| **Agent 5** (Anchor+API) | Phase 5 — Futarchy + API adapters + shared infra | futarchy-amm, futarchy-launchpad, jupiter-ultra, DFlow + shared utils | Unblocked |
| **Agent 6** (CLI+Packaging) | Phase 6 — CLI, packaging, distribution | CLI entry point, npm/Homebrew/binary distribution | Unblocked |

---

## Branch & Commit History

**Branch:** `agent-trading-infra`

| # | Hash | Message | Phase |
|---|------|---------|-------|
| 1 | `c21638f` | fix: Phase 0 foundation — rewrite config, helpers, and tx executors | Phase 0 |
| 2 | `faa5ec6` | fix: Phase 0 bug fixes — infinite loops, swap bugs, gRPC issues, side-effect guards | Phase 0 |
| 3 | `294097f` | feat: Phase 1 — TX landing layer with 12 providers and shared types | Phase 1 |
| 4 | `3d16649` | feat: Phase 1 — orchestrator, tip registry, and barrel exports | Phase 1 |
| 5 | `b1b854c` | feat: add IDexAdapter interface and DexRegistry (src/dex/) | Phase 1.5 |
| 6 | `4156c9c` | feat: add NonceManager for durable nonce accounts and wire into concurrent landing | Phase 1.5 |

---

## Key File Locations

### Foundation (Phase 0)
- `src/helpers/config.ts` — Lazy wallet/connection, env-based config
- `src/helpers/utils.ts` — Shared utilities, bounded retries
- `tsconfig.build.json` — Build configuration
- `package.json` — Package renamed to `outsmart`

### TX Landing Layer (Phase 1)
- `src/transactions/landing/types.ts` — ILandingProvider, LandingResult, SubmitOptions
- `src/transactions/landing/orchestrator.ts` — LandingOrchestrator (4 strategies + nonce)
- `src/transactions/landing/tip-accounts.ts` — 100+ tip accounts registry
- `src/transactions/landing/nonce-manager.ts` — NonceManager for concurrent safety
- `src/transactions/landing/providers/*.ts` — 12 provider implementations

### DEX Adapter Layer (Phase 1.5)
- `src/dex/types.ts` — IDexAdapter interface, all shared types
- `src/dex/index.ts` — DexRegistry class, getDexAdapter(), listDexAdapters()

### DEX Adapters (Phases 2-5, for Agents 2-5 to create)
- `src/dex/raydium-amm-v4.ts` — Agent 2
- `src/dex/raydium-cpmm.ts` — Agent 2
- `src/dex/raydium-clmm.ts` — Agent 2
- `src/dex/raydium-launchlab.ts` — Agent 2
- `src/dex/meteora-damm-v1.ts` — Agent 3
- `src/dex/meteora-damm-v2.ts` — Agent 3
- `src/dex/meteora-dlmm.ts` — Agent 3
- `src/dex/meteora-dbc.ts` — Agent 3
- `src/dex/meteora-lp-dlmm.ts` — Agent 3
- `src/dex/byreal-clmm.ts` — Agent 4
- `src/dex/pancakeswap-clmm.ts` — Agent 4
- `src/dex/orca.ts` — Agent 4

- `src/dex/fusion-amm.ts` — Agent 4
- `src/dex/futarchy-amm.ts` — Agent 5
- `src/dex/futarchy-launchpad.ts` — Agent 5
- `src/dex/jupiter-ultra.ts` — Agent 5
- `src/dex/dflow.ts` — Agent 5

### Source Modules (reference for Agents 2-5)
- `100x-algo-bots/trading-modules/` — all 19 DEX modules + 12 TX landing providers

---

## Instructions for Agents 2-5

Each adapter must:

1. **Implement `IDexAdapter`** from `src/dex/types.ts`
2. **Register with `DexRegistry`** via `registerAdapter()` from `src/dex/index.ts`
3. **Use `getWallet()` / `getConnection()`** from `src/helpers/config.ts` (NOT module-scope globals)
4. **Use `landTransaction()`** from `src/transactions/landing/` for TX submission
5. **Handle token program detection internally** (SPL vs Token-2022) — don't leak to callers
6. **Use string mint addresses** in the public API (not PublicKey) — convert internally
7. **Set appropriate `DexCapabilities`** flags — only claim what's implemented
8. **Implement `buildSwapIxs()`** if `canSnipe` is true — the orchestrator needs raw IXs for nonce prepending
9. **Commit each adapter separately** for easier GitHub review
10. **Do NOT modify legacy code in `src/raydium/`, `src/meteora/`, etc.** — new adapters sit alongside

---

## Final Deliverable Checklist

- [ ] `outsmart` published to npm
- [ ] All 17 DEXes wired as IDexAdapter implementations
- [ ] 12 TX landing providers via LandingOrchestrator
- [ ] Durable nonce for concurrent landing safety
- [ ] CLI with buy/sell/quote/find-pool/add-liq/remove-liq/claim-fees/positions/list-dex/config/init/info commands
- [ ] Snipe command with gRPC pool creation listener (requires user's Geyser gRPC key)
- [ ] --json, --verbose, --dry-run flags
- [ ] Library mode: `import { getDexAdapter } from 'outsmart'`
- [ ] Standalone binaries + Homebrew formula
- [ ] Zero hardcoded API keys
- [ ] Zero infinite loops
- [ ] No `any` types in money paths

---

## Session Progress Log

### Session 1 — Foundation + All 17 Adapters + CLI (Phases 0-6)

All phases 0-6 completed. 17 DEX adapters registered, CLI entry point working, legacy cleanup done.

### Session 2 — Snipe Removal, CLI Redesign, Mainnet Testing, DLMM LP

#### Completed

1. **Test cleanup — snipe removal** (`794c52c`)
   - Removed all `adapter.snipe()` test cases from orca, raydium, meteora, clmm, fusion-futarchy
   - Updated `canSell` expectations to `true` for 5 adapters
   - Removed `SNIPE_TIP_SOL` from helpers
   - Cleaned snipe references from `docs/TESTING.md`

2. **CLI redesign + isAggregator capability** (`f27ebe9`)
   - Added `isAggregator` boolean to `DexCapabilities` interface
   - Set `isAggregator: true` on jupiter-ultra and dflow
   - CLI buy/sell validates: on-chain needs `--pool` + `--token`, aggregators need `--token` only

3. **Config fix** — loads both `~/.outsmart/config.env` and `cwd/.env` layered

4. **Removed meteora-damm-v1 from tests** — legacy AMM program

5. **Suppressed bigint-buffer warning** in Jest setup (`tests/setup.ts`)

6. **Git identity fix** — configured git to use `outsmartchad`

7. **Buy amount increased to 0.02 SOL** (`429cfe1`)

8. **RPC send+confirm for swaps, fix DLMM duplicate compute budget** (`dc0ab3a`)
   - Created `src/transactions/send-rpc.ts` with `sendAndConfirmVtx()` helper
   - Refactored DAMM v2 and DLMM buy/sell to use `sendAndConfirmVtx` instead of landing orchestrator
   - Fixed DLMM duplicate ComputeBudget instruction bug
   - Added ATA creation in DAMM v2 buy
   - Set `minimumAmountOut=0` for both adapters
   - Bumped priority fee to 100k microlamports, compute limit to 400k CU

9. **DBC adapter refactor + GRACE/SOL tests** (`993f9a1`)
   - Refactored meteora-dbc buy/sell to use `sendAndConfirmVtx`
   - Set `minimumAmountOut=0` for both buy and sell
   - All 4 DBC tests pass: capabilities, getPrice, buy (confirmed), sell (confirmed)

10. **DLMM LP adapter rewrite** (WIP — not yet committed)
    - Extended `types.ts` with LP-specific types:
      - `LpStrategy` type (`"spot" | "curve" | "bid-ask"`)
      - `LpPositionInfo` interface (position details, bin range, amounts, fees, in-range status)
      - `AddLiquidityParams` — new fields: `amountSol`, `amountToken`, `tokenMint`, `strategy`, `bins` (legacy `amountA`/`amountB` kept for backward compat)
      - `RemoveLiquidityParams` — new field: `positionAddress`
      - `TxResult` — new fields: `positionAddress`, `poolAddress`, `dex`
      - `DexCapabilities` — new flags: `canClaimFees`, `canListPositions`
      - `IDexAdapter` — new optional methods: `claimFees()`, `listPositions()`
    - Rewrote `meteora-lp-dlmm.ts`:
      - Uses `sendAndConfirmVtx` instead of raw `sendAndConfirmTransaction`
      - Supports strategy selection (spot/curve/bid-ask) via SDK `StrategyType` enum
      - Supports bin count customization (1-70, default 50)
      - Three modes: one-sided SOL, one-sided token, balanced
      - Correctly maps SOL/token amounts based on pool's tokenX/tokenY ordering
      - Returns `positionAddress` from addLiquidity
      - `removeLiquidity` supports targeting a specific position via `positionAddress`
      - New `claimFees()` — claims swap fees from a position (uses `dlmmPool.claimSwapFee`)
      - New `listPositions()` — returns all user positions with bin ranges, amounts, fees, in-range status
    - Updated CLI (`cli.ts`):
      - `add-liq` redesigned: `--amount-sol`, `--amount-token`, `--strategy`, `--bins`, `--token` flags
      - `remove-liq` updated: `--position` flag for targeting specific positions
      - New `claim-fees` command: `outsmart claim-fees --dex meteora-lp-dlmm --pool <POOL>`
      - New `positions` command: `outsmart positions --dex meteora-lp-dlmm --pool <POOL>` (with `--json`)
    - Updated `meteora-damm-v2.ts`:
      - `claimFees` signature aligned to interface `(poolAddress, positionAddress?)`
      - Added `canClaimFees: true` capability
      - `addLiquidity` handles optional `amountA` (falls back to `amountSol`)
    - Updated tests:
      - `registry.test.ts` — added `canClaimFees`/`canListPositions` expectations
      - `meteora.test.ts` — DLMM LP tests rewritten: add → list → claim → remove flow
    - **Registry tests: 4/4 PASS**
    - **Meteora swap tests: 11/11 PASS** (DAMM v2, DLMM, DBC — all buy/sell confirmed on-chain)
    - **DLMM LP tests: 3/4 FAIL** — `addLiquidity` TX expired (block height exceeded)
      - The `initializePositionAndAddLiquidityByStrategy` SDK call takes too long (~60s) and the blockhash expires before `sendAndConfirmVtx` can submit
      - Root cause: the SDK builds a legacy `Transaction` with its own compute budget. We then extract `.instructions` and rebuild as V0 with `sendAndConfirmVtx`. The time between getting the blockhash and actually sending is too long because DLMM.create() + getActiveBin() + SDK call all happen before we fetch the blockhash.
      - **Fix needed:** Fetch blockhash AFTER building the SDK transaction (not inside `sendAndConfirmVtx`), or increase retries. Alternatively, use the legacy `sendAndConfirmTransaction` path that the SDK's Transaction was built for.

#### Mainnet TX Confirmations This Session

| Adapter | Operation | TX Signature | Status |
|---------|-----------|-------------|--------|
| meteora-damm-v2 | buy | `Nvc9Ec...` | Confirmed |
| meteora-damm-v2 | sell | `61xbQr...` | Confirmed |
| meteora-dlmm | buy | `4gECDE...` | Confirmed |
| meteora-dlmm | sell | `spy1Ap...` | Confirmed |
| meteora-dbc | buy | `61KpGL...` | Confirmed |
| meteora-dbc | sell | `ZQwHuw...` | Confirmed |
| meteora-lp-dlmm | addLiquidity | `5wheP...` | EXPIRED (block height exceeded) |

#### What's Next

1. **Fix DLMM LP addLiquidity blockhash expiry** — the SDK transaction build is too slow. Either:
   - Option A: Fetch a fresh blockhash right before sending (split `sendAndConfirmVtx` into build + send steps)
   - Option B: Fall back to legacy `sendAndConfirmTransaction` for LP operations where the SDK returns a complete `Transaction` object
   - Option C: Send the SDK's own Transaction directly (it already has instructions, just needs signing)
2. **Re-run DLMM LP tests** after fixing the blockhash issue
3. **Run remaining test suites**: `test:raydium` → `test:orca` → `test:clmm` → `test:fusion` → `test:api`
   - These adapters also need the `landTransaction` → `sendAndConfirmVtx` refactor
4. **gRPC snipe streaming** — deferred (user will provide instructions from `100x-algo-bots` repo)
5. **npm publish** — `outsmart` name available on npm
