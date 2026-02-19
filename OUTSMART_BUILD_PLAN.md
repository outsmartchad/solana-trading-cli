# OUTSMART Build Plan — Full Work Distribution

## Overview

**Goal:** Transform `solana-trading-cli` (566-star legacy prototype) into `outsmart` — a production-grade, distributable CLI package with 19 DEX integrations, 12 TX landing providers, and a unified command interface. Designed for both human CLI users and AI agent integration (OpenClaw, etc.).

**Source modules:** `100x-algo-bots/trading-modules/*` (battle-tested production code)
**Target repo:** `solana-trading-cli` (package renamed to `outsmart`)
**Branch:** `agent-trading-infra`

---

## Architecture Decisions

### 1. Class-Based IDexAdapter (not loose handler functions)

Every DEX module implements the `IDexAdapter` interface (defined in `src/dex/types.ts`). The CLI and external consumers (OpenClaw plugin, bots) access adapters via `getDexAdapter("raydium-amm-v4")` from the `DexRegistry` — no direct imports of DEX internals.

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

### 5. Standalone + OpenClaw Plugin (Option A)

`outsmart` is an independent npm package with its own CLI. A separate thin OpenClaw plugin wraps `IDexAdapter`/`DexRegistry` as OpenClaw tools. This keeps outsmart useful without OpenClaw and avoids coupling to OpenClaw's release cycle. OpenClaw integration is Phase 7 (after core is 100% functional).

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
- Subcommands: buy, sell, snipe, price, balance, wrap-sol, unwrap-sol, config, init, nonce
- Wire all DEX adapters via DexRegistry
- Output formatting, --json, --verbose, --dry-run flags
- npm publish, Homebrew formula, standalone binaries, shell completion

### [ ] Phase 7 — MCP Tool Server + OpenClaw Integration

outsmart becomes a tool server that any AI agent can call via MCP (Model Context Protocol).

**7a. MCP Tool Server (~200-300 lines)**
- Wrap every IDexAdapter method as an MCP tool
- Tools: buy, sell, snipe, add_liq, remove_liq, get_price, find_pool, list_dex, claim_fees
- Each tool takes JSON params, calls the adapter, returns JSON result
- Agent doesn't need to know Solana internals — just "buy 0.1 SOL of token X on raydium-cpmm"
- Compatible with any MCP client: OpenClaw, Claude, custom agents

**7b. OpenClaw Browser Intelligence**

OpenClaw provides the browser layer — navigating the same sites human trenchers use to gather intelligence that isn't available via RPC:

| Site | What the agent does there |
|------|--------------------------|
| [GMGN](https://gmgn.ai) | Smart money tracking, wallet profiling, insider activity detection. Check who's buying before outsmart executes. |
| [Axiom](https://axiom.trade) | Token sentiment, holder distribution, trade flow. For tokens that list on Axiom first, interact with the UI directly. |
| [LPAgent](https://app.lpagent.io/) | LP position analytics, fee APR comparison, pool selection. Feed data back so outsmart can rebalance/exit positions. |
| [DexScreener](https://dexscreener.com) | Price charts, liquidity depth, social links. outsmart queries the API directly; OpenClaw reads the linked project pages. |

The pattern: **outsmart reads the chain, OpenClaw reads the internet.** outsmart executes at the code level, OpenClaw gathers the intelligence that informs those executions.

**7c. Hybrid Agent Workflows**

Example: snipe-with-verification flow
1. outsmart (Listen): gRPC stream detects new pool creation on Raydium
2. outsmart (Read): Fetch pool state, token mint, initial liquidity
3. OpenClaw (Browse): Navigate to GMGN — check smart money wallets, insider flags
4. OpenClaw (Browse): Navigate to project website — verify team page, audit links
5. OpenClaw (Decide): "Looks legit, proceed" / "Red flags, skip"
6. outsmart (Write): Execute snipe with MEV tip through 12 providers
7. OpenClaw (Browse): Monitor token chart on Birdeye/DexScreener
8. outsmart (Write): Sell at target or stop-loss

Example: LP management flow
1. OpenClaw (Browse): Check LPAgent for best fee APR pools
2. outsmart (Write): Add liquidity on Meteora DAMM v2 via `add_liq`
3. OpenClaw (Browse): Monitor position performance on LPAgent dashboard
4. outsmart (Read): Check unclaimed fees via on-chain math
5. outsmart (Write): Claim fees via `claim_fees`
6. OpenClaw (Browse): Compare APR with competing pools on LPAgent
7. outsmart (Write): Rebalance — remove from underperforming pool, add to better one

**7d. Shared Wallet**
- outsmart holds the private key (env var) for direct RPC signing
- OpenClaw controls the same wallet via browser extension (Phantom/Backpack)
- Both can sign transactions; outsmart for speed (raw RPC), OpenClaw for UI-only protocols

### [ ] gRPC Bot Integration (deferred)

- gRPC snipers from `100x-algo-bots` will be integrated into CLI repo separately
- Reconnection, heartbeat, clean shutdown hardening
- Wire to new landing layer
- This completes the **Listen** layer of the three-layer architecture
- Timing: after user provides instructions for 100x-algo-bots integration

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
- [ ] All 19 DEXes wired as IDexAdapter implementations
- [ ] 12 TX landing providers via LandingOrchestrator
- [ ] Durable nonce for concurrent landing safety
- [ ] CLI with buy/sell/snipe/price/balance commands
- [ ] --json, --verbose, --dry-run flags
- [ ] Library mode: `import { getDexAdapter } from 'outsmart'`
- [ ] Standalone binaries + Homebrew formula
- [ ] Zero hardcoded API keys
- [ ] Zero infinite loops
- [ ] No `any` types in money paths
- [ ] OpenClaw plugin wrapper (Phase 7)
