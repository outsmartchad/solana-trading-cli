import { GetStructureSchema, publicKey, seq, struct, u128, u64 } from '../marshmallow'

/* ================= state layouts ================= */
export const LIQUIDITY_STATE_LAYOUT_V4 = struct([
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
  u64('systemDecimalValue'),
  u64('minSeparateNumerator'),
  u64('minSeparateDenominator'),
  u64('tradeFeeNumerator'),
  u64('tradeFeeDenominator'),
  u64('pnlNumerator'),
  u64('pnlDenominator'),
  u64('swapFeeNumerator'),
  u64('swapFeeDenominator'),
  u64('baseNeedTakePnl'),
  u64('quoteNeedTakePnl'),
  u64('quoteTotalPnl'),
  u64('baseTotalPnl'),
  u64('poolOpenTime'),
  u64('punishPcAmount'),
  u64('punishCoinAmount'),
  u64('orderbookToInitTime'),
  // u128('poolTotalDepositPc'),
  // u128('poolTotalDepositCoin'),
  u128('swapBaseInAmount'),
  u128('swapQuoteOutAmount'),
  u64('swapBase2QuoteFee'),
  u128('swapQuoteInAmount'),
  u128('swapBaseOutAmount'),
  u64('swapQuote2BaseFee'),
  // amm vault
  publicKey('baseVault'),
  publicKey('quoteVault'),
  // mint
  publicKey('baseMint'),
  publicKey('quoteMint'),
  publicKey('lpMint'),
  // market
  publicKey('openOrders'),
  publicKey('marketId'),
  publicKey('marketProgramId'),
  publicKey('targetOrders'),
  publicKey('withdrawQueue'),
  publicKey('lpVault'),
  publicKey('owner'),
  // true circulating supply without lock up
  u64('lpReserve'),
  seq(u64(), 3, 'padding'),
])

export type LiquidityStateLayoutV4 = typeof LIQUIDITY_STATE_LAYOUT_V4
export type LiquidityStateV4 = GetStructureSchema<LiquidityStateLayoutV4>

export const LIQUIDITY_STATE_LAYOUT_V5 = struct([
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
  seq(u64(), 64, 'padding'),
])

export type LiquidityStateLayoutV5 = typeof LIQUIDITY_STATE_LAYOUT_V5
export type LiquidityStateV5 = GetStructureSchema<LiquidityStateLayoutV5>

export type LiquidityState = LiquidityStateV4 | LiquidityStateV5
export type LiquidityStateLayout = LiquidityStateLayoutV4 | LiquidityStateLayoutV5

/* ================= index ================= */
// version => liquidity state layout
export const LIQUIDITY_VERSION_TO_STATE_LAYOUT: {
  [version: number]: LiquidityStateLayout
} = {
  4: LIQUIDITY_STATE_LAYOUT_V4,
  5: LIQUIDITY_STATE_LAYOUT_V5,
}
