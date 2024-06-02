import { GetStructureSchema, publicKey, seq, struct, u128, u64 } from '../marshmallow'

/* ================= state layouts ================= */
export const STABLE_STATE_LAYOUT_V1 = struct([
  u64('accountType'),
  u64('status'),
  u64('nonce'),
  u64('maxOrder'),
  u64('depth'),
  u64('baseDecimal'),
  u64('quoteDecimal'),
  u64('state'),
  u64('resetFlag'),
  u64('minSize'),
  u64('volMaxCutRatio'),
  u64('amountWaveRatio'),
  u64('baseLotSize'),
  u64('quoteLotSize'),
  u64('minPriceMultiplier'),
  u64('maxPriceMultiplier'),
  u64('systemDecimalsValue'),
  u64('abortTradeFactor'),
  u64('priceTickMultiplier'),
  u64('priceTick'),
  // Fees
  u64('minSeparateNumerator'),
  u64('minSeparateDenominator'),
  u64('tradeFeeNumerator'),
  u64('tradeFeeDenominator'),
  u64('pnlNumerator'),
  u64('pnlDenominator'),
  u64('swapFeeNumerator'),
  u64('swapFeeDenominator'),
  // OutPutData
  u64('baseNeedTakePnl'),
  u64('quoteNeedTakePnl'),
  u64('quoteTotalPnl'),
  u64('baseTotalPnl'),
  u64('poolOpenTime'),
  u64('punishPcAmount'),
  u64('punishCoinAmount'),
  u64('orderbookToInitTime'),
  u128('swapBaseInAmount'),
  u128('swapQuoteOutAmount'),
  u128('swapQuoteInAmount'),
  u128('swapBaseOutAmount'),
  u64('swapQuote2BaseFee'),
  u64('swapBase2QuoteFee'),

  publicKey('baseVault'),
  publicKey('quoteVault'),
  publicKey('baseMint'),
  publicKey('quoteMint'),
  publicKey('lpMint'),

  publicKey('modelDataAccount'),
  publicKey('openOrders'),
  publicKey('marketId'),
  publicKey('marketProgramId'),
  publicKey('targetOrders'),
  publicKey('owner'),
  seq(u64('padding'), 64, 'padding'),
])

export type StableStateLayoutV1 = typeof STABLE_STATE_LAYOUT_V1
export type StableStateLayout = StableStateLayoutV1

export type StableStateV1 = GetStructureSchema<StableStateLayoutV1>
export type StableState = StableStateV1

/* ================= index ================= */
// version => stable state layout
export const STABLE_VERSION_TO_STATE_LAYOUT: {
  [version: number]: StableStateLayout
} = {
  1: STABLE_STATE_LAYOUT_V1,
}
