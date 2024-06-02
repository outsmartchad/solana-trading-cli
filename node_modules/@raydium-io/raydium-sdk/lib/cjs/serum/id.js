"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERUM_VERSION_TO_PROGRAMID = exports.SERUM_PROGRAMID_TO_VERSION = exports.SERUM_PROGRAM_ID_V3 = exports._SERUM_PROGRAM_ID_V3 = void 0;
const web3_js_1 = require("@solana/web3.js");
/* ================= program public keys ================= */
exports._SERUM_PROGRAM_ID_V3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
exports.SERUM_PROGRAM_ID_V3 = new web3_js_1.PublicKey(exports._SERUM_PROGRAM_ID_V3);
// serum program id string => serum version
exports.SERUM_PROGRAMID_TO_VERSION = {
    [exports._SERUM_PROGRAM_ID_V3]: 3,
};
// serum version => serum program id
exports.SERUM_VERSION_TO_PROGRAMID = {
    3: exports.SERUM_PROGRAM_ID_V3,
};
//# sourceMappingURL=id.js.map