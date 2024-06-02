import { Logger } from '../common';
import { tenExponentiate } from './bignumber';
import { currencyEquals } from './currency';
import { Fraction } from './fraction';
const logger = Logger.from('entity/price');
export class Price extends Fraction {
    // denominator and numerator _must_ be raw, i.e. in the native representation
    constructor(baseCurrency, denominator, quoteCurrency, numerator) {
        super(numerator, denominator);
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
        this.scalar = new Fraction(tenExponentiate(baseCurrency.decimals), tenExponentiate(quoteCurrency.decimals));
    }
    get raw() {
        return new Fraction(this.numerator, this.denominator);
    }
    get adjusted() {
        return super.mul(this.scalar);
    }
    invert() {
        return new Price(this.quoteCurrency, this.numerator, this.baseCurrency, this.denominator);
    }
    mul(other) {
        logger.assert(currencyEquals(this.quoteCurrency, other.baseCurrency), 'mul currency not equals');
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
//# sourceMappingURL=price.js.map