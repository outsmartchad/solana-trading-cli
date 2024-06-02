"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.U64_IGNORE_RANGE = exports.TICK_SPACINGS = exports.Fee = exports.FEE_RATE_DENOMINATOR = exports.LOG_B_P_ERR_MARGIN_UPPER_X64 = exports.LOG_B_P_ERR_MARGIN_LOWER_X64 = exports.LOG_B_2_X32 = exports.BIT_PRECISION = exports.MAX_SQRT_PRICE_X64 = exports.MIN_SQRT_PRICE_X64 = exports.MAX_TICK = exports.MIN_TICK = exports.MaxUint128 = exports.U64Resolution = exports.MaxU64 = exports.Q128 = exports.Q64 = exports.NEGATIVE_ONE = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const entity_1 = require("../../entity");
exports.NEGATIVE_ONE = new bn_js_1.default(-1);
exports.Q64 = new bn_js_1.default(1).shln(64);
exports.Q128 = new bn_js_1.default(1).shln(128);
exports.MaxU64 = exports.Q64.sub(entity_1.ONE);
exports.U64Resolution = 64;
exports.MaxUint128 = exports.Q128.subn(1);
exports.MIN_TICK = -443636;
exports.MAX_TICK = -exports.MIN_TICK;
exports.MIN_SQRT_PRICE_X64 = new bn_js_1.default('4295048016');
exports.MAX_SQRT_PRICE_X64 = new bn_js_1.default('79226673521066979257578248091');
// export const MIN_TICK_ARRAY_START_INDEX = -307200;
// export const MAX_TICK_ARRAY_START_INDEX = 306600;
exports.BIT_PRECISION = 16;
exports.LOG_B_2_X32 = '59543866431248';
exports.LOG_B_P_ERR_MARGIN_LOWER_X64 = '184467440737095516';
exports.LOG_B_P_ERR_MARGIN_UPPER_X64 = '15793534762490258745';
exports.FEE_RATE_DENOMINATOR = new bn_js_1.default(10).pow(new bn_js_1.default(6));
var Fee;
(function (Fee) {
    Fee[Fee["rate_500"] = 500] = "rate_500";
    Fee[Fee["rate_3000"] = 3000] = "rate_3000";
    Fee[Fee["rate_10000"] = 10000] = "rate_10000";
})(Fee || (exports.Fee = Fee = {}));
exports.TICK_SPACINGS = {
    [Fee.rate_500]: 10,
    [Fee.rate_3000]: 60,
    [Fee.rate_10000]: 200,
};
exports.U64_IGNORE_RANGE = new bn_js_1.default('18446744073700000000');
//# sourceMappingURL=constants.js.map