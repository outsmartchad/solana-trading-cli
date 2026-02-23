/**
 * Event Streaming Engine — Typed events and interfaces.
 *
 * All events emitted by the streaming engine are strongly typed.
 * Consumers subscribe to specific event types via EventEmitter.
 */

// ---------------------------------------------------------------------------
// Instruction types per protocol
// ---------------------------------------------------------------------------

export enum PumpSwapInstructionType {
  Buy = "buy",
  Sell = "sell",
  CreatePool = "createPool",
  Unknown = "unknown",
}

export enum PumpFunInstructionType {
  Buy = "buy",
  Sell = "sell",
  Create = "create",
  Unknown = "unknown",
}

export enum RaydiumInstructionType {
  LaunchLabBuy = "launchlab_buy",
  LaunchLabSell = "launchlab_sell",
  LaunchLabCreate = "launchlab_create",
  CPMMBuy = "cpmm_buy",
  CPMMSell = "cpmm_sell",
  CPMMCreate = "cpmm_create",
  CLMMBuy = "clmm_buy",
  CLMMSell = "clmm_sell",
  CLMMCreate = "clmm_create",
  AMMBuy = "amm_buy",
  AMMSell = "amm_sell",
  AMMCreate = "amm_create",
  Unknown = "unknown",
}

export enum MeteoraInstructionType {
  DLMMBuy = "dlmm_buy",
  DLMMSell = "dlmm_sell",
  DLMMCreate = "dlmm_create",
  DBCBuy = "dbc_buy",
  DBCSell = "dbc_sell",
  DBCCreate = "dbc_create",
  DBCMigration = "dbc_migration",
  DAMMV2Buy = "dammv2_buy",
  DAMMV2Sell = "dammv2_sell",
  DAMMV2Create = "dammv2_create",
  DAMMV1Buy = "dammv1_buy",
  DAMMV1Sell = "dammv1_sell",
  DAMMV1Create = "dammv1_create",
  Unknown = "unknown",
}

export enum OtherDexInstructionType {
  OrcaBuy = "orca_buy",
  OrcaSell = "orca_sell",
  OrcaCreate = "orca_create",
  PancakeswapBuy = "pancakeswap_buy",
  PancakeswapSell = "pancakeswap_sell",
  PancakeswapCreate = "pancakeswap_create",
  ByrealBuy = "byreal_buy",
  ByrealSell = "byreal_sell",
  ByrealCreate = "byreal_create",
  FusionBuy = "fusion_buy",
  FusionSell = "fusion_sell",
  FusionCreate = "fusion_create",
  FutarchyBuy = "futarchy_buy",
  FutarchySell = "futarchy_sell",
  FutarchyCreate = "futarchy_create",
  Unknown = "unknown",
}

// ---------------------------------------------------------------------------
// Stream events — what consumers subscribe to
// ---------------------------------------------------------------------------

/** A new pool was created on any supported DEX */
export interface NewPoolEvent {
  type: "NewPool";
  dex: string;
  pool: string;
  tokenA: string;
  tokenB: string;
  initialReserveA: number;
  initialReserveB: number;
  creator: string;
  signature: string;
  slot: number;
  timestamp: number;
}

/** A swap occurred on any supported DEX */
export interface SwapEvent {
  type: "Swap";
  dex: string;
  pool: string;
  trader: string;
  direction: "buy" | "sell";
  mint: string;
  amountIn: number;
  amountOut: number;
  /** Price after the swap (token per SOL or quote) */
  priceAfter: number;
  reserveBase: number;
  reserveQuote: number;
  signature: string;
  slot: number;
  timestamp: number;
  /** Whether the swap was routed via Jupiter or another aggregator */
  isAggregated: boolean;
}

/** A PumpFun bonding curve completed (token migrates to AMM) */
export interface BondingCompleteEvent {
  type: "BondingComplete";
  mint: string;
  bondingCurve: string;
  migrationPool: string;
  signature: string;
  slot: number;
  timestamp: number;
}

/** A large swap exceeding a configurable threshold */
export interface LargeSwapEvent {
  type: "LargeSwap";
  swap: SwapEvent;
  /** Estimated USD value of the swap */
  estimatedUsdValue: number;
}

/** Catch-all for raw parsed transactions that don't match specific event types */
export interface RawTransactionEvent {
  type: "RawTransaction";
  dex: string;
  instructionType: string;
  signature: string;
  slot: number;
  timestamp: number;
  accounts: string[];
  data: Buffer;
}

export type StreamEvent =
  | NewPoolEvent
  | SwapEvent
  | BondingCompleteEvent
  | LargeSwapEvent
  | RawTransactionEvent;

export type StreamEventType = StreamEvent["type"];

// ---------------------------------------------------------------------------
// Subscription & configuration types
// ---------------------------------------------------------------------------

export type SubscriptionPreset =
  | "all-dex-swaps"
  | "new-pools"
  | "pumpfun-bonding"
  | "pumpswap"
  | "raydium"
  | "meteora"
  | "other-dexes"
  | "wallet-trades";

export interface StreamConfig {
  /** gRPC URL — defaults to GRPC_URL env var */
  grpcUrl?: string;
  /** gRPC auth token — defaults to GRPC_XTOKEN env var */
  grpcXToken?: string;
  /** Max receive message size in bytes (default: 64MB) */
  maxReceiveMessageLength?: number;
  /** Ping interval in ms (default: 10_000) */
  pingIntervalMs?: number;
  /** Reconnect delay in ms (default: 5_000) */
  reconnectDelayMs?: number;
  /** Max reconnect delay for exponential backoff (default: 30_000) */
  maxReconnectDelayMs?: number;
  /** Large swap threshold in SOL (default: 10) */
  largeSwapThresholdSol?: number;
  /** Log level */
  logLevel?: "silent" | "info" | "debug";
}

// ---------------------------------------------------------------------------
// Internal types for the parser
// ---------------------------------------------------------------------------

export interface ParsedSwapData {
  dex: string;
  instructionType: string;
  pool: string;
  trader: string;
  mint: string;
  direction: "buy" | "sell";
  amountBase: number;
  amountQuote: number;
  reserveBaseAfter: number;
  reserveQuoteAfter: number;
  isAggregated: boolean;
  coinCreator?: string;
}

export interface ParsedNewPoolData {
  dex: string;
  pool: string;
  tokenA: string;
  tokenB: string;
  initialReserveA: number;
  initialReserveB: number;
  creator: string;
}
