/**
 * outsmart — Programmatic API
 *
 * This is the library entry point for consumers who `import { ... } from "outsmart"`.
 * Re-exports the DEX registry, types, and landing layer for programmatic use.
 *
 * For CLI usage, run `outsmart` directly (see src/cli.ts).
 */

// DEX adapter layer
export {
  DexRegistry,
  getRegistry,
  getDexAdapter,
  listDexAdapters,
  registerAdapter,
} from "./dex";

export type {
  IDexAdapter,
  DexAdapterInfo,
  DexCapabilities,
  BuyParams,
  SellParams,
  SnipeParams,
  SwapOpts,
  SwapResult,
  PoolInfo,
  PriceInfo,
  TxResult,
  BuildSwapIxsResult,
  AddLiquidityParams,
  RemoveLiquidityParams,
  SwapSide,
} from "./dex/types";

export {
  UnsupportedOperationError,
  PoolNotFoundError,
  defaultCapabilities,
  WSOL_MINT,
  USDC_MINT,
  USDT_MINT,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_PRIORITY_FEE_MICRO_LAMPORTS,
  DEFAULT_COMPUTE_UNIT_LIMIT,
} from "./dex/types";

// TX landing layer
export type {
  ILandingProvider,
  LandingResult,
  SubmitOptions,
  SubmissionStrategy,
  OrchestratorConfig,
  TipAccount,
} from "./transactions/landing/types";

// DexScreener utility
export { getInfoFromDexscreener } from "./dexscreener/info";
