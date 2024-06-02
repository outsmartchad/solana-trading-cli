"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_VERSION_TO_STATE_LAYOUT = exports.MARKET_STATE_LAYOUT_V3 = void 0;
const marshmallow_1 = require("../marshmallow");
/* ================= state layouts ================= */
exports.MARKET_STATE_LAYOUT_V3 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(5),
    (0, marshmallow_1.blob)(8), // accountFlagsLayout('accountFlags'),
    (0, marshmallow_1.publicKey)('ownAddress'),
    (0, marshmallow_1.u64)('vaultSignerNonce'),
    (0, marshmallow_1.publicKey)('baseMint'),
    (0, marshmallow_1.publicKey)('quoteMint'),
    (0, marshmallow_1.publicKey)('baseVault'),
    (0, marshmallow_1.u64)('baseDepositsTotal'),
    (0, marshmallow_1.u64)('baseFeesAccrued'),
    (0, marshmallow_1.publicKey)('quoteVault'),
    (0, marshmallow_1.u64)('quoteDepositsTotal'),
    (0, marshmallow_1.u64)('quoteFeesAccrued'),
    (0, marshmallow_1.u64)('quoteDustThreshold'),
    (0, marshmallow_1.publicKey)('requestQueue'),
    (0, marshmallow_1.publicKey)('eventQueue'),
    (0, marshmallow_1.publicKey)('bids'),
    (0, marshmallow_1.publicKey)('asks'),
    (0, marshmallow_1.u64)('baseLotSize'),
    (0, marshmallow_1.u64)('quoteLotSize'),
    (0, marshmallow_1.u64)('feeRateBps'),
    (0, marshmallow_1.u64)('referrerRebatesAccrued'),
    (0, marshmallow_1.blob)(7),
]);
/* ================= index ================= */
// version => market state layout
exports.MARKET_VERSION_TO_STATE_LAYOUT = {
    3: exports.MARKET_STATE_LAYOUT_V3,
};
//# sourceMappingURL=layout.js.map