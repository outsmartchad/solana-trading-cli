import { Rounding } from './constant';
import { Fraction } from './fraction';
export declare const _100_PERCENT: Fraction;
export declare class Percent extends Fraction {
    toSignificant(significantDigits?: number, format?: object, rounding?: Rounding): string;
    toFixed(decimalPlaces?: number, format?: object, rounding?: Rounding): string;
}
