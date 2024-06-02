"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fraction = void 0;
const big_js_1 = __importDefault(require("big.js"));
const decimal_js_light_1 = __importDefault(require("decimal.js-light"));
const common_1 = require("../common");
const bignumber_1 = require("./bignumber");
const constant_1 = require("./constant");
const to_format_1 = __importDefault(require("./to-format"));
const logger = common_1.Logger.from('entity/fraction');
const Big = (0, to_format_1.default)(big_js_1.default);
const Decimal = (0, to_format_1.default)(decimal_js_light_1.default);
const toSignificantRounding = {
    [constant_1.Rounding.ROUND_DOWN]: Decimal.ROUND_DOWN,
    [constant_1.Rounding.ROUND_HALF_UP]: Decimal.ROUND_HALF_UP,
    [constant_1.Rounding.ROUND_UP]: Decimal.ROUND_UP,
};
const toFixedRounding = {
    [constant_1.Rounding.ROUND_DOWN]: Big.roundDown,
    [constant_1.Rounding.ROUND_HALF_UP]: Big.roundHalfUp,
    [constant_1.Rounding.ROUND_UP]: Big.roundUp,
};
class Fraction {
    constructor(numerator, denominator = constant_1.ONE) {
        this.numerator = (0, bignumber_1.parseBigNumberish)(numerator);
        this.denominator = (0, bignumber_1.parseBigNumberish)(denominator);
    }
    // performs floor division
    get quotient() {
        return this.numerator.div(this.denominator);
    }
    invert() {
        return new Fraction(this.denominator, this.numerator);
    }
    // +
    add(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction((0, bignumber_1.parseBigNumberish)(other));
        if (this.denominator.eq(otherParsed.denominator)) {
            return new Fraction(this.numerator.add(otherParsed.numerator), this.denominator);
        }
        return new Fraction(this.numerator.mul(otherParsed.denominator).add(otherParsed.numerator.mul(this.denominator)), this.denominator.mul(otherParsed.denominator));
    }
    // -
    sub(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction((0, bignumber_1.parseBigNumberish)(other));
        if (this.denominator.eq(otherParsed.denominator)) {
            return new Fraction(this.numerator.sub(otherParsed.numerator), this.denominator);
        }
        return new Fraction(this.numerator.mul(otherParsed.denominator).sub(otherParsed.numerator.mul(this.denominator)), this.denominator.mul(otherParsed.denominator));
    }
    // ×
    mul(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction((0, bignumber_1.parseBigNumberish)(other));
        return new Fraction(this.numerator.mul(otherParsed.numerator), this.denominator.mul(otherParsed.denominator));
    }
    // ÷
    div(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction((0, bignumber_1.parseBigNumberish)(other));
        return new Fraction(this.numerator.mul(otherParsed.denominator), this.denominator.mul(otherParsed.numerator));
    }
    toSignificant(significantDigits, format = { groupSeparator: '' }, rounding = constant_1.Rounding.ROUND_HALF_UP) {
        logger.assert(Number.isInteger(significantDigits), `${significantDigits} is not an integer.`);
        logger.assert(significantDigits > 0, `${significantDigits} is not positive.`);
        Decimal.set({ precision: significantDigits + 1, rounding: toSignificantRounding[rounding] });
        const quotient = new Decimal(this.numerator.toString())
            .div(this.denominator.toString())
            .toSignificantDigits(significantDigits);
        return quotient.toFormat(quotient.decimalPlaces(), format);
    }
    toFixed(decimalPlaces, format = { groupSeparator: '' }, rounding = constant_1.Rounding.ROUND_HALF_UP) {
        logger.assert(Number.isInteger(decimalPlaces), `${decimalPlaces} is not an integer.`);
        logger.assert(decimalPlaces >= 0, `${decimalPlaces} is negative.`);
        Big.DP = decimalPlaces;
        Big.RM = toFixedRounding[rounding];
        return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(decimalPlaces, format);
    }
}
exports.Fraction = Fraction;
//# sourceMappingURL=fraction.js.map