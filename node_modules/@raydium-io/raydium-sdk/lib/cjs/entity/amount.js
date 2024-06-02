"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAmount = exports.CurrencyAmount = exports.splitNumber = void 0;
const big_js_1 = __importDefault(require("big.js"));
const bn_js_1 = __importDefault(require("bn.js"));
const common_1 = require("../common");
const bignumber_1 = require("./bignumber");
const constant_1 = require("./constant");
const currency_1 = require("./currency");
const fraction_1 = require("./fraction");
const to_format_1 = __importDefault(require("./to-format"));
const logger = common_1.Logger.from('entity/amount');
const Big = (0, to_format_1.default)(big_js_1.default);
function splitNumber(num, decimals) {
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
exports.splitNumber = splitNumber;
class CurrencyAmount extends fraction_1.Fraction {
    constructor(currency, amount, isRaw = true) {
        let parsedAmount = new bn_js_1.default(0);
        const multiplier = constant_1.TEN.pow(new bn_js_1.default(currency.decimals));
        if (isRaw) {
            parsedAmount = (0, bignumber_1.parseBigNumberish)(amount);
        }
        else {
            let integralAmount = new bn_js_1.default(0);
            let fractionalAmount = new bn_js_1.default(0);
            // parse fractional string
            if (typeof amount === 'string' || typeof amount === 'number' || typeof amount === 'bigint') {
                const [integral, fractional] = splitNumber(amount.toString(), currency.decimals);
                integralAmount = (0, bignumber_1.parseBigNumberish)(integral);
                fractionalAmount = (0, bignumber_1.parseBigNumberish)(fractional);
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
        logger.assert((0, currency_1.currencyEquals)(this.currency, other.currency), 'gt currency not equals');
        return this.raw.gt(other.raw);
    }
    /**
     * a less than b
     */
    lt(other) {
        logger.assert((0, currency_1.currencyEquals)(this.currency, other.currency), 'lt currency not equals');
        return this.raw.lt(other.raw);
    }
    add(other) {
        logger.assert((0, currency_1.currencyEquals)(this.currency, other.currency), 'add currency not equals');
        return new CurrencyAmount(this.currency, this.raw.add(other.raw));
    }
    sub(other) {
        logger.assert((0, currency_1.currencyEquals)(this.currency, other.currency), 'sub currency not equals');
        return new CurrencyAmount(this.currency, this.raw.sub(other.raw));
    }
    toSignificant(significantDigits = this.currency.decimals, format, rounding = constant_1.Rounding.ROUND_DOWN) {
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
    toFixed(decimalPlaces = this.currency.decimals, format, rounding = constant_1.Rounding.ROUND_DOWN) {
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
exports.CurrencyAmount = CurrencyAmount;
class TokenAmount extends CurrencyAmount {
    constructor(token, amount, isRaw = true) {
        super(token, amount, isRaw);
        this.token = token;
    }
    add(other) {
        logger.assert((0, currency_1.currencyEquals)(this.token, other.token), 'add token not equals');
        return new TokenAmount(this.token, this.raw.add(other.raw));
    }
    subtract(other) {
        logger.assert((0, currency_1.currencyEquals)(this.token, other.token), 'sub token not equals');
        return new TokenAmount(this.token, this.raw.sub(other.raw));
    }
}
exports.TokenAmount = TokenAmount;
//# sourceMappingURL=amount.js.map