import BN from 'bn.js';
import { BigNumberish } from './bignumber';
import { Rounding } from './constant';
export declare class Fraction {
    readonly numerator: BN;
    readonly denominator: BN;
    constructor(numerator: BigNumberish, denominator?: BigNumberish);
    get quotient(): BN;
    invert(): Fraction;
    add(other: Fraction | BigNumberish): Fraction;
    sub(other: Fraction | BigNumberish): Fraction;
    mul(other: Fraction | BigNumberish): Fraction;
    div(other: Fraction | BigNumberish): Fraction;
    toSignificant(significantDigits: number, format?: object, rounding?: Rounding): string;
    toFixed(decimalPlaces: number, format?: object, rounding?: Rounding): string;
}
