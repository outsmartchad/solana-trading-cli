"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STABLE_VERSION_TO_STATE_LAYOUT = exports.STABLE_STATE_LAYOUT_V1 = void 0;
const marshmallow_1 = require("../marshmallow");
/* ================= state layouts ================= */
exports.STABLE_STATE_LAYOUT_V1 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('accountType'),
    (0, marshmallow_1.u64)('status'),
    (0, marshmallow_1.u64)('nonce'),
    (0, marshmallow_1.u64)('maxOrder'),
    (0, marshmallow_1.u64)('depth'),
    (0, marshmallow_1.u64)('baseDecimal'),
    (0, marshmallow_1.u64)('quoteDecimal'),
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.u64)('resetFlag'),
    (0, marshmallow_1.u64)('minSize'),
    (0, marshmallow_1.u64)('volMaxCutRatio'),
    (0, marshmallow_1.u64)('amountWaveRatio'),
    (0, marshmallow_1.u64)('baseLotSize'),
    (0, marshmallow_1.u64)('quoteLotSize'),
    (0, marshmallow_1.u64)('minPriceMultiplier'),
    (0, marshmallow_1.u64)('maxPriceMultiplier'),
    (0, marshmallow_1.u64)('systemDecimalsValue'),
    (0, marshmallow_1.u64)('abortTradeFactor'),
    (0, marshmallow_1.u64)('priceTickMultiplier'),
    (0, marshmallow_1.u64)('priceTick'),
    // Fees
    (0, marshmallow_1.u64)('minSeparateNumerator'),
    (0, marshmallow_1.u64)('minSeparateDenominator'),
    (0, marshmallow_1.u64)('tradeFeeNumerator'),
    (0, marshmallow_1.u64)('tradeFeeDenominator'),
    (0, marshmallow_1.u64)('pnlNumerator'),
    (0, marshmallow_1.u64)('pnlDenominator'),
    (0, marshmallow_1.u64)('swapFeeNumerator'),
    (0, marshmallow_1.u64)('swapFeeDenominator'),
    // OutPutData
    (0, marshmallow_1.u64)('baseNeedTakePnl'),
    (0, marshmallow_1.u64)('quoteNeedTakePnl'),
    (0, marshmallow_1.u64)('quoteTotalPnl'),
    (0, marshmallow_1.u64)('baseTotalPnl'),
    (0, marshmallow_1.u64)('poolOpenTime'),
    (0, marshmallow_1.u64)('punishPcAmount'),
    (0, marshmallow_1.u64)('punishCoinAmount'),
    (0, marshmallow_1.u64)('orderbookToInitTime'),
    (0, marshmallow_1.u128)('swapBaseInAmount'),
    (0, marshmallow_1.u128)('swapQuoteOutAmount'),
    (0, marshmallow_1.u128)('swapQuoteInAmount'),
    (0, marshmallow_1.u128)('swapBaseOutAmount'),
    (0, marshmallow_1.u64)('swapQuote2BaseFee'),
    (0, marshmallow_1.u64)('swapBase2QuoteFee'),
    (0, marshmallow_1.publicKey)('baseVault'),
    (0, marshmallow_1.publicKey)('quoteVault'),
    (0, marshmallow_1.publicKey)('baseMint'),
    (0, marshmallow_1.publicKey)('quoteMint'),
    (0, marshmallow_1.publicKey)('lpMint'),
    (0, marshmallow_1.publicKey)('modelDataAccount'),
    (0, marshmallow_1.publicKey)('openOrders'),
    (0, marshmallow_1.publicKey)('marketId'),
    (0, marshmallow_1.publicKey)('marketProgramId'),
    (0, marshmallow_1.publicKey)('targetOrders'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)('padding'), 64, 'padding'),
]);
/* ================= index ================= */
// version => stable state layout
exports.STABLE_VERSION_TO_STATE_LAYOUT = {
    1: exports.STABLE_STATE_LAYOUT_V1,
};
//# sourceMappingURL=layout.js.map