"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIQUIDITY_VERSION_TO_SERUM_VERSION = exports.STABLE_PROGRAMID_TO_VERSION = exports.STABLE_PROGRAM_ID_V1 = exports._STABLE_PROGRAM_ID_V1 = void 0;
const web3_js_1 = require("@solana/web3.js");
/* ================= program public keys ================= */
exports._STABLE_PROGRAM_ID_V1 = '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h';
exports.STABLE_PROGRAM_ID_V1 = new web3_js_1.PublicKey(exports._STABLE_PROGRAM_ID_V1);
// stable program id string => stable version
exports.STABLE_PROGRAMID_TO_VERSION = {
    [exports._STABLE_PROGRAM_ID_V1]: 1,
};
// stable version => serum version
exports.LIQUIDITY_VERSION_TO_SERUM_VERSION = {
    1: 3,
};
//# sourceMappingURL=id.js.map