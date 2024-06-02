"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.divCeil = exports.tenExponentiate = exports.parseBigNumberish = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const common_1 = require("../common");
const constant_1 = require("./constant");
const logger = common_1.Logger.from('entity/bignumber');
const MAX_SAFE = 0x1fffffffffffff;
function parseBigNumberish(value) {
    // BN
    if (value instanceof bn_js_1.default) {
        return value;
    }
    // string
    if (typeof value === 'string') {
        if (value.match(/^-?[0-9]+$/)) {
            return new bn_js_1.default(value);
        }
        return logger.throwArgumentError('invalid BigNumberish string', 'value', value);
    }
    // number
    if (typeof value === 'number') {
        if (value % 1) {
            return logger.throwArgumentError('BigNumberish number underflow', 'value', value);
        }
        if (value >= MAX_SAFE || value <= -MAX_SAFE) {
            return logger.throwArgumentError('BigNumberish number overflow', 'value', value);
        }
        return new bn_js_1.default(String(value));
    }
    // bigint
    if (typeof value === 'bigint') {
        return new bn_js_1.default(value.toString());
    }
    return logger.throwArgumentError('invalid BigNumberish value', 'value', value);
}
exports.parseBigNumberish = parseBigNumberish;
function tenExponentiate(shift) {
    return constant_1.TEN.pow(parseBigNumberish(shift));
}
exports.tenExponentiate = tenExponentiate;
// round up
function divCeil(a, b) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const dm = a.divmod(b);
    // Fast case - exact division
    if (dm.mod.isZero())
        return dm.div;
    // Round up
    return dm.div.isNeg() ? dm.div.isubn(1) : dm.div.iaddn(1);
}
exports.divCeil = divCeil;
//# sourceMappingURL=bignumber.js.map