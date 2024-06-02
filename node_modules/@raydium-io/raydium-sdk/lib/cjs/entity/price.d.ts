import { BigNumberish } from './bignumber';
import { Rounding } from './constant';
import { Currency } from './currency';
import { Fraction } from './fraction';
export declare class Price extends Fraction {
    readonly baseCurrency: Currency;
    readonly quoteCurrency: Currency;
    readonly scalar: Fraction;
    constructor(baseCurrency: Currency, denominator: BigNumberish, quoteCurrency: Currency, numerator: BigNumberish);
    get raw(): Fraction;
    get adjusted(): Fraction;
    invert(): Price;
    mul(other: Price): Price;
    toSignificant(significantDigits?: number, format?: object, rounding?: Rounding): string;
    toFixed(decimalPlaces?: number, format?: object, rounding?: Rounding): string;
}
