import _Big from 'big.js';
import _Decimal from 'decimal.js-light';
import { Logger } from '../common';
import { parseBigNumberish } from './bignumber';
import { ONE, Rounding } from './constant';
import toFormat from './to-format';
const logger = Logger.from('entity/fraction');
const Big = toFormat(_Big);
const Decimal = toFormat(_Decimal);
const toSignificantRounding = {
    [Rounding.ROUND_DOWN]: Decimal.ROUND_DOWN,
    [Rounding.ROUND_HALF_UP]: Decimal.ROUND_HALF_UP,
    [Rounding.ROUND_UP]: Decimal.ROUND_UP,
};
const toFixedRounding = {
    [Rounding.ROUND_DOWN]: Big.roundDown,
    [Rounding.ROUND_HALF_UP]: Big.roundHalfUp,
    [Rounding.ROUND_UP]: Big.roundUp,
};
export class Fraction {
    constructor(numerator, denominator = ONE) {
        this.numerator = parseBigNumberish(numerator);
        this.denominator = parseBigNumberish(denominator);
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
        const otherParsed = other instanceof Fraction ? other : new Fraction(parseBigNumberish(other));
        if (this.denominator.eq(otherParsed.denominator)) {
            return new Fraction(this.numerator.add(otherParsed.numerator), this.denominator);
        }
        return new Fraction(this.numerator.mul(otherParsed.denominator).add(otherParsed.numerator.mul(this.denominator)), this.denominator.mul(otherParsed.denominator));
    }
    // -
    sub(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction(parseBigNumberish(other));
        if (this.denominator.eq(otherParsed.denominator)) {
            return new Fraction(this.numerator.sub(otherParsed.numerator), this.denominator);
        }
        return new Fraction(this.numerator.mul(otherParsed.denominator).sub(otherParsed.numerator.mul(this.denominator)), this.denominator.mul(otherParsed.denominator));
    }
    // ×
    mul(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction(parseBigNumberish(other));
        return new Fraction(this.numerator.mul(otherParsed.numerator), this.denominator.mul(otherParsed.denominator));
    }
    // ÷
    div(other) {
        const otherParsed = other instanceof Fraction ? other : new Fraction(parseBigNumberish(other));
        return new Fraction(this.numerator.mul(otherParsed.denominator), this.denominator.mul(otherParsed.numerator));
    }
    toSignificant(significantDigits, format = { groupSeparator: '' }, rounding = Rounding.ROUND_HALF_UP) {
        logger.assert(Number.isInteger(significantDigits), `${significantDigits} is not an integer.`);
        logger.assert(significantDigits > 0, `${significantDigits} is not positive.`);
        Decimal.set({ precision: significantDigits + 1, rounding: toSignificantRounding[rounding] });
        const quotient = new Decimal(this.numerator.toString())
            .div(this.denominator.toString())
            .toSignificantDigits(significantDigits);
        return quotient.toFormat(quotient.decimalPlaces(), format);
    }
    toFixed(decimalPlaces, format = { groupSeparator: '' }, rounding = Rounding.ROUND_HALF_UP) {
        logger.assert(Number.isInteger(decimalPlaces), `${decimalPlaces} is not an integer.`);
        logger.assert(decimalPlaces >= 0, `${decimalPlaces} is negative.`);
        Big.DP = decimalPlaces;
        Big.RM = toFixedRounding[rounding];
        return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(decimalPlaces, format);
    }
}
//# sourceMappingURL=fraction.js.map