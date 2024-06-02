"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPL_ACCOUNT_LAYOUT = exports.SPL_MINT_LAYOUT = void 0;
const marshmallow_1 = require("../marshmallow");
exports.SPL_MINT_LAYOUT = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u32)('mintAuthorityOption'),
    (0, marshmallow_1.publicKey)('mintAuthority'),
    (0, marshmallow_1.u64)('supply'),
    (0, marshmallow_1.u8)('decimals'),
    (0, marshmallow_1.u8)('isInitialized'),
    (0, marshmallow_1.u32)('freezeAuthorityOption'),
    (0, marshmallow_1.publicKey)('freezeAuthority'),
]);
// 165 bytes
exports.SPL_ACCOUNT_LAYOUT = (0, marshmallow_1.struct)([
    (0, marshmallow_1.publicKey)('mint'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('amount'),
    (0, marshmallow_1.u32)('delegateOption'),
    (0, marshmallow_1.publicKey)('delegate'),
    (0, marshmallow_1.u8)('state'),
    (0, marshmallow_1.u32)('isNativeOption'),
    (0, marshmallow_1.u64)('isNative'),
    (0, marshmallow_1.u64)('delegatedAmount'),
    (0, marshmallow_1.u32)('closeAuthorityOption'),
    (0, marshmallow_1.publicKey)('closeAuthority'),
]);
//# sourceMappingURL=layout.js.map