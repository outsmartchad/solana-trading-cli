import { blob, GetStructureSchema, publicKey, struct, u64 } from '../marshmallow'

/* ================= state layouts ================= */
export const MARKET_STATE_LAYOUT_V3 = struct([
  blob(5),

  blob(8), // accountFlagsLayout('accountFlags'),

  publicKey('ownAddress'),

  u64('vaultSignerNonce'),

  publicKey('baseMint'),
  publicKey('quoteMint'),

  publicKey('baseVault'),
  u64('baseDepositsTotal'),
  u64('baseFeesAccrued'),

  publicKey('quoteVault'),
  u64('quoteDepositsTotal'),
  u64('quoteFeesAccrued'),

  u64('quoteDustThreshold'),

  publicKey('requestQueue'),
  publicKey('eventQueue'),

  publicKey('bids'),
  publicKey('asks'),

  u64('baseLotSize'),
  u64('quoteLotSize'),

  u64('feeRateBps'),

  u64('referrerRebatesAccrued'),

  blob(7),
])

export type MarketStateLayoutV3 = typeof MARKET_STATE_LAYOUT_V3
export type MarketStateLayout = MarketStateLayoutV3

export type MarketStateV3 = GetStructureSchema<MarketStateLayoutV3>
export type MarketState = MarketStateV3

/* ================= index ================= */
// version => market state layout
export const MARKET_VERSION_TO_STATE_LAYOUT: {
  [version: number]: MarketStateLayout
} = {
  3: MARKET_STATE_LAYOUT_V3,
}
