import _Big from 'big.js';
import BN from 'bn.js';
import { Logger } from '../common';
import { parseBigNumberish } from './bignumber';
import { Rounding, TEN } from './constant';
import { currencyEquals } from './currency';
import { Fraction } from './fraction';
import toFormat from './to-format';
const logger = Logger.from('entity/amount');
const Big = toFormat(_Big);
export function splitNumber(num, decimals) {
    let integral = '0';
    let fractional = '0';
    if (num.includes('.')) {
        const splited = num.split('.');
        if (splited.length === 2) {
            ;
            [integral, fractional] = splited;
            fractional = fractional.padEnd(decimals, '0');
        }
        else {
            return logger.throwArgumentError('invalid number string', 'num', num);
        }
    }
    else {
        integral = num;
    }
    // fix decimals is 0
    return [integral, fractional.slice(0, decimals) || fractional];
}
export class CurrencyAmount extends Fraction {
    constructor(currency, amount, isRaw = true) {
        let parsedAmount = new BN(0);
        const multiplier = TEN.pow(new BN(currency.decimals));
        if (isRaw) {
            parsedAmount = parseBigNumberish(amount);
        }
        else {
            let integralAmount = new BN(0);
            let fractionalAmount = new BN(0);
            // parse fractional string
            if (typeof amount === 'string' || typeof amount === 'number' || typeof amount === 'bigint') {
                const [integral, fractional] = splitNumber(amount.toString(), currency.decimals);
                integralAmount = parseBigNumberish(integral);
                fractionalAmount = parseBigNumberish(fractional);
            }
            // else {
            //   integralAmount = parseBigNumberish(amount);
            // }
            integralAmount = integralAmount.mul(multiplier);
            parsedAmount = integralAmount.add(fractionalAmount);
        }
        super(parsedAmount, multiplier);
        this.currency = currency;
    }
    get raw() {
        return this.numerator;
    }
    isZero() {
        return this.raw.isZero();
    }
    /**
     * a greater than b
     */
    gt(other) {
        logger.assert(currencyEquals(this.currency, other.currency), 'gt currency not equals');
        return this.raw.gt(other.raw);
    }
    /**
     * a less than b
     */
    lt(other) {
        logger.assert(currencyEquals(this.currency, other.currency), 'lt currency not equals');
        return this.raw.lt(other.raw);
    }
    add(other) {
        logger.assert(currencyEquals(this.currency, other.currency), 'add currency not equals');
        return new CurrencyAmount(this.currency, this.raw.add(other.raw));
    }
    sub(other) {
        logger.assert(currencyEquals(this.currency, other.currency), 'sub currency not equals');
        return new CurrencyAmount(this.currency, this.raw.sub(other.raw));
    }
    toSignificant(significantDigits = this.currency.decimals, format, rounding = Rounding.ROUND_DOWN) {
        return super.toSignificant(significantDigits, format, rounding);
    }
    /**
     * To fixed
     *
     * @example
     * ```
     * 1 -> 1.000000000
     * 1.234 -> 1.234000000
     * 1.123456789876543 -> 1.123456789
     * ```
     */
    toFixed(decimalPlaces = this.currency.decimals, format, rounding = Rounding.ROUND_DOWN) {
        logger.assert(decimalPlaces <= this.currency.decimals, 'decimals overflow');
        return super.toFixed(decimalPlaces, format, rounding);
    }
    /**
     * To exact
     *
     * @example
     * ```
     * 1 -> 1
     * 1.234 -> 1.234
     * 1.123456789876543 -> 1.123456789
     * ```
     */
    toExact(format = { groupSeparator: '' }) {
        Big.DP = this.currency.decimals;
        return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(format);
    }
}
export class TokenAmount extends CurrencyAmount {
    constructor(token, amount, isRaw = true) {
        super(token, amount, isRaw);
        this.token = token;
    }
    add(other) {
        logger.assert(currencyEquals(this.token, other.token), 'add token not equals');
        return new TokenAmount(this.token, this.raw.add(other.raw));
    }
    subtract(other) {
        logger.assert(currencyEquals(this.token, other.token), 'sub token not equals');
        return new TokenAmount(this.token, this.raw.sub(other.raw));
    }
}
//# sourceMappingURL=amount.js.map