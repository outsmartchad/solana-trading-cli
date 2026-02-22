# CLAUDE.md — outsmart-cli

Project rules for Claude Code sessions working on this repo.

## Repository

- **Repo:** `outsmartchad/outsmart-cli`
- **Branch:** `agent-trading-infra` (default branch on GitHub)
- **Package name:** `outsmart`
- **Purpose:** CLI + library for Solana trading — 18 DEX adapters, 12 TX landing providers

## Git Identity

Every commit must use:
```
Author: vincent so <88470511+outsmartchad@users.noreply.github.com>
```
With trailer:
```
Co-authored-by: Claude Code <noreply@anthropic.com>
```

Only `outsmartchad` account is active on `gh`. Run `gh auth setup-git` if needed.

## Critical Rules

- **ALL API keys from env vars** — NEVER hardcode secrets
- **The ALT address contains user's wallet addresses** — do NOT reveal the ALT address or wallet addresses in code
- **Tip accounts are public** — OK to include directly in source
- **`minimumAmountOut` must be 0** — no slippage protection in swap params (user explicitly requested this)
- **Trade management (SL/TP/trailing stop) is excluded** from scope
- **gRPC hardening is DEFERRED** — user will provide instructions later from `100x-algo-bots` repo
- **Snipe command was REMOVED from CLI** — real sniping needs gRPC background listener. Users use `outsmart buy --pool <POOL> --tip <SOL>` for competitive buys
- **Agent/MCP/OpenClaw belongs in `outsmart-agent` repo** — keep this repo CLI-focused

## Config Resolution

`config.ts` loads BOTH `~/.outsmart/config.env` AND `cwd/.env` (layered, highest priority first via dotenv's default no-overwrite behavior). User ran `outsmart init` which wrote real keys to `~/.outsmart/config.env`.

## TX Sending Architecture

- **Normal swaps (buy/sell/LP)** use `sendAndConfirmVtx()` from `src/transactions/send-rpc.ts` — standard RPC send + confirm
- **Competitive submissions (future sniping)** use `landTransaction()` orchestrator with 12 providers — fire-and-forget, no on-chain confirmation
- Only helius-sender provider is currently enabled

## CLI UX Design

**On-chain DEX adapters** require `--pool`. `--token` is **auto-detected** from pool state:
```
outsmart buy  --dex meteora-dlmm --pool <POOL> --amount 0.1
outsmart sell --dex meteora-dlmm --pool <POOL> --pct 100
```

For non-SOL quote pools (e.g. USDC/TOKEN), specify `--token` explicitly:
```
outsmart buy --dex meteora-dlmm --pool <POOL> --token <MINT> --amount 0.1
```

**Swap aggregators** (jupiter-ultra, dflow) require `--token` only:
```
outsmart buy --dex jupiter-ultra --token <MINT> --amount 0.1
```

Token auto-detection works by calling `getPrice(pool)` which decodes the pool account and returns both mints. The CLI picks the non-WSOL side.

## Adapter Patterns

When writing or modifying a DEX adapter:
1. Implement `IDexAdapter` from `src/dex/types.ts`
2. Register via `registerAdapter()` from `src/dex/index.ts`
3. Use `getWallet()` / `getConnection()` from `src/helpers/config.ts` — NOT module-scope globals
4. Use `sendAndConfirmVtx()` for TX submission (not `landTransaction` for normal ops)
5. Handle SPL vs Token-2022 internally
6. Use string mint addresses in public API — convert to PublicKey internally
7. Set `DexCapabilities` flags honestly — only claim what's implemented

## Known SDK Gotchas

- **DLMM SDK** includes its own ComputeBudget instructions — do NOT prepend additional ones or you get "duplicate instruction" rejection
- **DAMM v2 SDK** does NOT create output token ATA — add `createAssociatedTokenAccountIdempotentInstruction` before swap
- **DLMM SDK stderr noise** — `getEstimatedComputeUnitUsageWithBuffer` simulation may fail with `ExceededAmountSlippageTolerance` (error 6003). This is cosmetic — the swap TX still lands.

## Test Design

- Tests use **hardcoded pool addresses** from `tests/helpers.ts` — NOT auto-discovery
- Buy amount: `BUY_AMOUNT_SOL = 0.002` in `tests/helpers.ts`
- `meteora-damm-v1` is excluded from tests (legacy AMM program)
- Test wallet: `tstXr3NbiMd6FFZF2qbPzxJqxCGXuSjpZVvdjeXiPv1`
- Run suites one at a time: `npm run test:registry` -> `test:meteora` -> `test:raydium` -> etc.
- `maxWorkers: 1` — tests share a wallet, can't run in parallel

## Key Files

- `OUTSMART_BUILD_PLAN.md` — full build plan with session progress log
- `docs/TESTING.md` — test guide with pool addresses and cost estimates
- `src/dex/types.ts` — IDexAdapter interface, all shared types
- `src/dex/index.ts` — DexRegistry
- `src/transactions/send-rpc.ts` — sendAndConfirmVtx helper
- `src/cli.ts` — CLI entry point
- `src/helpers/config.ts` — wallet/connection config

## Source Reference

`/Users/chiwangso/Desktop/projects/100x-algo-bots/trading-modules/` — original production code to port from (read-only reference).

## Related Repo

`/Users/chiwangso/Desktop/projects/outsmart-agent/` — AI agent SDK repo (separate codebase).
