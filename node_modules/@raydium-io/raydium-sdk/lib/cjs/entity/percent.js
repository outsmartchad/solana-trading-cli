"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Percent = exports._100_PERCENT = void 0;
const constant_1 = require("./constant");
const fraction_1 = require("./fraction");
exports._100_PERCENT = new fraction_1.Fraction(constant_1._100);
class Percent extends fraction_1.Fraction {
    toSignificant(significantDigits = 5, format, rounding) {
        return this.mul(exports._100_PERCENT).toSignificant(significantDigits, format, rounding);
    }
    toFixed(decimalPlaces = 2, format, rounding) {
        return this.mul(exports._100_PERCENT).toFixed(decimalPlaces, format, rounding);
    }
}
exports.Percent = Percent;
//# sourceMappingURL=percent.js.map