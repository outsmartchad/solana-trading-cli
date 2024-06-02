"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._10000 = exports._1000 = exports._100 = exports.TEN = exports.FIVE = exports.THREE = exports.TWO = exports.ONE = exports.ZERO = exports.Rounding = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
var Rounding;
(function (Rounding) {
    Rounding[Rounding["ROUND_DOWN"] = 0] = "ROUND_DOWN";
    Rounding[Rounding["ROUND_HALF_UP"] = 1] = "ROUND_HALF_UP";
    Rounding[Rounding["ROUND_UP"] = 2] = "ROUND_UP";
})(Rounding || (exports.Rounding = Rounding = {}));
exports.ZERO = new bn_js_1.default(0);
exports.ONE = new bn_js_1.default(1);
exports.TWO = new bn_js_1.default(2);
exports.THREE = new bn_js_1.default(3);
exports.FIVE = new bn_js_1.default(5);
exports.TEN = new bn_js_1.default(10);
exports._100 = new bn_js_1.default(100);
exports._1000 = new bn_js_1.default(1000);
exports._10000 = new bn_js_1.default(10000);
//# sourceMappingURL=constant.js.map