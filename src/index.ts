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
  CreateCustomPoolParams,
  CreateConfigPoolParams,
  PoolFeeConfig,
  SwapSide,
} from "./dex/types";

// Adapter classes — for consumers that need to cast (e.g. PumpFunAdapter.create())
export { PumpFunAdapter } from "./dex/pumpfun";

// Percolator perpetual futures adapter (standalone, not IDexAdapter)
export { PercolatorAdapter } from "./dex/percolator/adapter";
export type {
  CreateMarketParams,
  CreateMarketResult,
  MarketState,
  TradeParams,
  MarketRiskParams,
  VammParams,
  SlabHeader as PercolatorSlabHeader,
  MarketConfig as PercolatorMarketConfig,
  EngineState as PercolatorEngineState,
  RiskParams as PercolatorRiskParams,
  Account as PercolatorAccount,
  DiscoveredMarket as PercolatorDiscoveredMarket,
} from "./dex/percolator/adapter";
export {
  AccountKind as PercolatorAccountKind,
  SLAB_TIERS as PERCOLATOR_SLAB_TIERS,
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
  derivePythPushOraclePDA,
  PYTH_PUSH_ORACLE_PROGRAM_ID,
  parseFeedIdHex,
} from "./dex/percolator/adapter";

// Oracle keepers (WebSocket + gRPC)
export { WsKeeper, loadKeeperConfig } from "./dex/percolator/ws-keeper";
export { GrpcKeeper } from "./dex/percolator/grpc-keeper";
export type {
  DexType as KeeperDexType,
  KeeperPoolConfig,
  WsKeeperOptions,
} from "./dex/percolator/ws-keeper";
export type { GrpcKeeperOptions } from "./dex/percolator/grpc-keeper";

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

// Helpers — wallet, connection, balance
export {
  getWallet,
  getConnection,
  resetWalletCache,
} from "./helpers/config";

export {
  checkBalanceByAddress,
  getSPLTokenBalance,
} from "./helpers/check_balance";

// TX send helpers
export {
  sendAndConfirmVtx,
  sendAndConfirmLegacyTx,
  setDryRunMode,
  isDryRunMode,
} from "./transactions/send-rpc";
export type { SendRpcOptions, SendRpcResult, SendLegacyTxOptions } from "./transactions/send-rpc";

// DexScreener utility
export { getInfoFromDexscreener } from "./dexscreener/info";

// Event Streaming Engine
export { EventStream, WsEventStream } from "./streaming";
export type { WsStreamConfig } from "./streaming";
export type {
  StreamConfig,
  StreamEvent,
  StreamEventType,
  SubscriptionPreset,
  NewPoolEvent,
  SwapEvent,
  BondingCompleteEvent,
  LargeSwapEvent,
} from "./streaming";
export {
  subscribeAllDexSwaps,
  subscribeNewPools,
  subscribePumpSwap,
  subscribeRaydium,
  subscribeMeteora,
  subscribeWalletTrades,
  subscribePoolActivity,
  PROGRAM_TO_DEX,
  ALL_DEX_PROGRAM_IDS,
} from "./streaming";

// Autonomous LP Manager
export { LpManager } from "./lp-manager";
export type {
  LpManagerConfig,
  PositionState,
  LpManagerEvent,
  PoolScore,
} from "./lp-manager";
export { selectBestPool } from "./lp-manager";

// ---------------------------------------------------------------------------
// Adapter registration — side-effect imports that trigger self-registration
// ---------------------------------------------------------------------------

/**
 * Register all built-in DEX adapters with the global registry.
 *
 * Call this once before using getDexAdapter() or listDexAdapters().
 * Each adapter module self-registers via registerAdapter() at import time.
 *
 * This is separated from the top-level exports so that library consumers
 * can import types/helpers without triggering heavy SDK imports.
 */
export async function registerAllAdapters(): Promise<void> {
  await Promise.all([
    import("./dex/raydium-amm-v4"),
    import("./dex/raydium-cpmm"),
    import("./dex/raydium-clmm"),
    import("./dex/raydium-launchlab"),
    import("./dex/meteora-damm-v1"),
    import("./dex/meteora-damm-v2"),
    import("./dex/meteora-dlmm"),
    import("./dex/meteora-dbc"),
    import("./dex/orca"),
    import("./dex/byreal-clmm"),
    import("./dex/pancakeswap-clmm"),
    import("./dex/fusion-amm"),
    import("./dex/futarchy-amm"),
    import("./dex/futarchy-launchpad"),
    import("./dex/pumpfun"),
    import("./dex/pumpfun-amm"),
    import("./dex/jupiter-ultra"),
    import("./dex/dflow"),
  ]);
}
