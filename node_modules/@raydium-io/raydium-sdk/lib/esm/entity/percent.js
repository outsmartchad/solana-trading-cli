import { _100 } from './constant';
import { Fraction } from './fraction';
export const _100_PERCENT = new Fraction(_100);
export class Percent extends Fraction {
    toSignificant(significantDigits = 5, format, rounding) {
        return this.mul(_100_PERCENT).toSignificant(significantDigits, format, rounding);
    }
    toFixed(decimalPlaces = 2, format, rounding) {
        return this.mul(_100_PERCENT).toFixed(decimalPlaces, format, rounding);
    }
}
//# sourceMappingURL=percent.js.map