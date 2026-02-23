/**
 * Event Streaming Engine — Subscription request builders.
 *
 * Each builder creates a Yellowstone gRPC SubscribeRequest for a specific
 * set of programs. These mirror the ~45 builders in 100x-algo-bots but
 * are clean and self-contained.
 *
 * All subscriptions use PROCESSED commitment for fastest updates
 * and include blocksMeta for slot→timestamp mapping.
 */

import {
  PUMP_SWAP_PROGRAM_ID,
  PUMP_SWAP_GLOBAL_FEE,
  PUMP_FUN_PROGRAM_ID,
  PUMPFUN_MIGRATION,
  RAYDIUM_PROGRAM_IDS,
  METEORA_PROGRAM_IDS,
  OTHER_DEX_PROGRAM_IDS,
  ALL_DEX_PROGRAM_IDS,
  NEW_POOL_PROGRAM_IDS,
  RAYDIUM_AMM_V4_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  JUP_SWAP_PROGRAM_ID,
} from "./programs";
import type { SubscriptionPreset } from "./types";

// Commitment level constants (from @triton-one/yellowstone-grpc)
const COMMITMENT_PROCESSED = 1;

// ---------------------------------------------------------------------------
// Base request template
// ---------------------------------------------------------------------------

function baseRequest(
  label: string,
  accountInclude: string[],
  accountExclude: string[] = [],
  accountRequired: string[] = [],
  includeBlockMeta = true,
): any {
  return {
    accounts: {},
    slots: {},
    transactions: {
      [label]: {
        vote: false,
        failed: false,
        signature: undefined,
        accountInclude,
        accountExclude,
        accountRequired,
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: includeBlockMeta ? { blockmetadata: {} } : {},
    accountsDataSlice: [],
    ping: undefined,
    commitment: COMMITMENT_PROCESSED,
  };
}

// ---------------------------------------------------------------------------
// Preset subscription builders
// ---------------------------------------------------------------------------

/** Subscribe to ALL DEX swaps across all 18 supported programs */
export function subscribeAllDexSwaps(): any {
  return baseRequest("all_dex_swaps", ALL_DEX_PROGRAM_IDS);
}

/** Subscribe to new pool creation events */
export function subscribeNewPools(): any {
  return baseRequest("new_pools", NEW_POOL_PROGRAM_IDS);
}

/** Subscribe to PumpFun bonding curve transactions */
export function subscribePumpFunBonding(): any {
  return baseRequest("pumpfun_bonding", [PUMP_FUN_PROGRAM_ID]);
}

/** Subscribe to PumpSwap AMM transactions */
export function subscribePumpSwap(): any {
  return baseRequest(
    "pumpswap",
    [PUMP_SWAP_PROGRAM_ID, PUMP_SWAP_GLOBAL_FEE],
    [],
    [PUMP_SWAP_PROGRAM_ID, PUMP_SWAP_GLOBAL_FEE],
  );
}

/** Subscribe to all Raydium protocol transactions */
export function subscribeRaydium(): any {
  return baseRequest("raydium", RAYDIUM_PROGRAM_IDS);
}

/** Subscribe to all Meteora protocol transactions */
export function subscribeMeteora(): any {
  return baseRequest("meteora", METEORA_PROGRAM_IDS);
}

/** Subscribe to other DEX transactions (Orca, Pancakeswap, Byreal, Fusion, Futarchy) */
export function subscribeOtherDexes(): any {
  return baseRequest("other_dexes", OTHER_DEX_PROGRAM_IDS);
}

/** Subscribe to PumpFun migration events (bonding curve → AMM pool) */
export function subscribePumpFunMigration(): any {
  return baseRequest(
    "pumpfun_migration",
    [PUMPFUN_MIGRATION, RAYDIUM_AMM_V4_PROGRAM_ID],
    [],
    [PUMPFUN_MIGRATION, RAYDIUM_AMM_V4_PROGRAM_ID],
  );
}

/** Subscribe to transactions involving specific wallet addresses */
export function subscribeWalletTrades(wallets: string[], dexPrograms?: string[]): any {
  const programs = dexPrograms ?? ALL_DEX_PROGRAM_IDS;
  return baseRequest(
    "wallet_trades",
    [...wallets, ...programs],
    [],
    wallets, // all wallets must be involved
  );
}

/** Subscribe to transactions involving specific pool addresses */
export function subscribePoolActivity(pools: string[], dexProgram?: string): any {
  const accountRequired = dexProgram ? [dexProgram] : [];
  return baseRequest(
    "pool_activity",
    pools,
    [],
    accountRequired,
  );
}

/** Subscribe to Raydium CPMM new pool creation specifically */
export function subscribeRaydiumCpmmNewPools(): any {
  return baseRequest(
    "raydium_cpmm_new",
    [RAYDIUM_CPMM_PROGRAM_ID],
    [],
    [RAYDIUM_CPMM_PROGRAM_ID],
  );
}

// ---------------------------------------------------------------------------
// Preset resolver
// ---------------------------------------------------------------------------

export function getPresetSubscription(preset: SubscriptionPreset, opts?: { wallets?: string[] }): any {
  switch (preset) {
    case "all-dex-swaps":
      return subscribeAllDexSwaps();
    case "new-pools":
      return subscribeNewPools();
    case "pumpfun-bonding":
      return subscribePumpFunBonding();
    case "pumpswap":
      return subscribePumpSwap();
    case "raydium":
      return subscribeRaydium();
    case "meteora":
      return subscribeMeteora();
    case "other-dexes":
      return subscribeOtherDexes();
    case "wallet-trades":
      if (!opts?.wallets?.length) throw new Error("wallet-trades preset requires wallets");
      return subscribeWalletTrades(opts.wallets);
    default:
      throw new Error(`Unknown subscription preset: ${preset}`);
  }
}

// ---------------------------------------------------------------------------
// Ping request (for keepalive)
// ---------------------------------------------------------------------------

export function createPingRequest(): any {
  return {
    ping: { id: 1 },
    accounts: {},
    accountsDataSlice: [],
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    entry: {},
    slots: {},
  };
}

// ---------------------------------------------------------------------------
// Clear all subscriptions (for dynamic re-subscribe)
// ---------------------------------------------------------------------------

export function createClearSubscriptionsRequest(): any {
  return {
    slots: {},
    accounts: {},
    transactions: {},
    transactionsStatus: {},
    blocks: {},
    blocksMeta: {},
    accountsDataSlice: [],
    entry: {},
  };
}
