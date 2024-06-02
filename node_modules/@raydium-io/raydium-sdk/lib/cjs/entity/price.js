"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Price = void 0;
const common_1 = require("../common");
const bignumber_1 = require("./bignumber");
const currency_1 = require("./currency");
const fraction_1 = require("./fraction");
const logger = common_1.Logger.from('entity/price');
class Price extends fraction_1.Fraction {
    // denominator and numerator _must_ be raw, i.e. in the native representation
    constructor(baseCurrency, denominator, quoteCurrency, numerator) {
        super(numerator, denominator);
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
        this.scalar = new fraction_1.Fraction((0, bignumber_1.tenExponentiate)(baseCurrency.decimals), (0, bignumber_1.tenExponentiate)(quoteCurrency.decimals));
    }
    get raw() {
        return new fraction_1.Fraction(this.numerator, this.denominator);
    }
    get adjusted() {
        return super.mul(this.scalar);
    }
    invert() {
        return new Price(this.quoteCurrency, this.numerator, this.baseCurrency, this.denominator);
    }
    mul(other) {
        logger.assert((0, currency_1.currencyEquals)(this.quoteCurrency, other.baseCurrency), 'mul currency not equals');
        const fraction = super.mul(other);
        return new Price(this.baseCurrency, fraction.denominator, other.quoteCurrency, fraction.numerator);
    }
    toSignificant(significantDigits = this.quoteCurrency.decimals, format, rounding) {
        return this.adjusted.toSignificant(significantDigits, format, rounding);
    }
    toFixed(decimalPlaces = this.quoteCurrency.decimals, format, rounding) {
        return this.adjusted.toFixed(decimalPlaces, format, rounding);
    }
}
exports.Price = Price;
//# sourceMappingURL=price.js.map