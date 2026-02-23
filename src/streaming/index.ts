/**
 * Event Streaming Engine — Public API.
 *
 * Real-time Yellowstone gRPC event streaming for Solana DEX transactions.
 * Subscribes to on-chain transactions, parses them, and emits typed events.
 */

// Main classes
export { EventStream } from "./event-stream";
export { WsEventStream } from "./ws-event-stream";
export type { WsStreamConfig } from "./ws-event-stream";

// Types
export type {
  StreamConfig,
  StreamEvent,
  StreamEventType,
  SubscriptionPreset,
  NewPoolEvent,
  SwapEvent,
  BondingCompleteEvent,
  LargeSwapEvent,
  RawTransactionEvent,
  ParsedSwapData,
  ParsedNewPoolData,
} from "./types";

// Subscription builders (for custom subscriptions)
export {
  subscribeAllDexSwaps,
  subscribeNewPools,
  subscribePumpFunBonding,
  subscribePumpSwap,
  subscribeRaydium,
  subscribeMeteora,
  subscribeOtherDexes,
  subscribePumpFunMigration,
  subscribeWalletTrades,
  subscribePoolActivity,
  subscribeRaydiumCpmmNewPools,
  getPresetSubscription,
} from "./subscriptions";

// Program IDs
export {
  PROGRAM_TO_DEX,
  ALL_DEX_PROGRAM_IDS,
  PUMPSWAP_PROGRAM_IDS,
  RAYDIUM_PROGRAM_IDS,
  METEORA_PROGRAM_IDS,
  OTHER_DEX_PROGRAM_IDS,
  NEW_POOL_PROGRAM_IDS,
} from "./programs";

// Transaction formatter (for advanced use)
export { formatTransaction } from "./tx-formatter";
export type { FormattedTransaction, TokenBalance } from "./tx-formatter";

// Transaction parser (for advanced use)
export { parseTransaction } from "./tx-parser";
