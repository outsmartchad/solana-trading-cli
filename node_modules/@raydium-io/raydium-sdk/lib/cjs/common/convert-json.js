"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolKeys2JsonInfo = exports.jsonInfo2PoolKeys = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = require("bn.js");
const entity_1 = require("../entity");
const pubkey_1 = require("./pubkey");
function notInnerObject(v) {
    return (typeof v === 'object' &&
        v !== null &&
        ![entity_1.TokenAmount, web3_js_1.PublicKey, entity_1.Fraction, bn_js_1.BN, entity_1.Currency, entity_1.CurrencyAmount, entity_1.Price, entity_1.Percent].some((o) => typeof o === 'object' && v instanceof o));
}
function jsonInfo2PoolKeys(jsonInfo) {
    // @ts-expect-error no need type for inner code
    return typeof jsonInfo === 'string'
        ? (0, pubkey_1.validateAndParsePublicKey)(jsonInfo)
        : Array.isArray(jsonInfo)
            ? jsonInfo.map((k) => jsonInfo2PoolKeys(k))
            : notInnerObject(jsonInfo)
                ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, jsonInfo2PoolKeys(v)]))
                : jsonInfo;
}
exports.jsonInfo2PoolKeys = jsonInfo2PoolKeys;
function poolKeys2JsonInfo(jsonInfo) {
    // @ts-expect-error no need type for inner code
    return jsonInfo instanceof web3_js_1.PublicKey
        ? jsonInfo.toBase58()
        : Array.isArray(jsonInfo)
            ? jsonInfo.map((k) => poolKeys2JsonInfo(k))
            : notInnerObject(jsonInfo)
                ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, poolKeys2JsonInfo(v)]))
                : jsonInfo;
}
exports.poolKeys2JsonInfo = poolKeys2JsonInfo;
//# sourceMappingURL=convert-json.js.map