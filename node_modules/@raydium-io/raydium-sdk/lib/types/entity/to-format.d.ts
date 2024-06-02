import Big, { BigConstructor, BigSource, RoundingMode } from 'big.js';
import Decimal, { Config, Numeric } from 'decimal.js-light';
type TakeStatic<T> = {
    [P in keyof T]: T[P];
};
interface FormatOptions {
    decimalSeparator?: string;
    groupSeparator?: string;
    groupSize?: number;
    fractionGroupSeparator?: string;
    fractionGroupSize?: number;
}
interface WrappedBigConstructor extends TakeStatic<BigConstructor> {
    new (value: BigSource): WrappedBig;
    (value: BigSource): WrappedBig;
    (): WrappedBigConstructor;
    format: FormatOptions;
}
export interface WrappedBig extends Big {
    add(n: BigSource): WrappedBig;
    abs(): WrappedBig;
    div(n: BigSource): WrappedBig;
    minus(n: BigSource): WrappedBig;
    mod(n: BigSource): WrappedBig;
    mul(n: BigSource): WrappedBig;
    plus(n: BigSource): WrappedBig;
    pow(exp: number): WrappedBig;
    round(dp?: number, rm?: RoundingMode): WrappedBig;
    sqrt(): WrappedBig;
    sub(n: BigSource): WrappedBig;
    times(n: BigSource): WrappedBig;
    toFormat(): string;
    toFormat(options: FormatOptions): string;
    toFormat(fractionLength: number): string;
    toFormat(fractionLength: number, options: FormatOptions): string;
    toFormat(fractionLength: number, missionUnknown: number): string;
    toFormat(fractionLength: number, missionUnknown: number, options: FormatOptions): string;
}
type DecimalConstructor = typeof Decimal;
interface WrappedDecimalConstructor extends TakeStatic<DecimalConstructor> {
    new (value: Numeric): WrappedDecimal;
    clone(config?: Config): WrappedDecimalConstructor;
    config(config: Config): WrappedDecimal;
    set(config: Config): WrappedDecimal;
    format: FormatOptions;
}
export interface WrappedDecimal extends Decimal {
    absoluteValue(): WrappedDecimal;
    abs(): WrappedDecimal;
    dividedBy(y: Numeric): WrappedDecimal;
    div(y: Numeric): WrappedDecimal;
    dividedToIntegerBy(y: Numeric): WrappedDecimal;
    idiv(y: Numeric): WrappedDecimal;
    logarithm(base?: Numeric): WrappedDecimal;
    log(base?: Numeric): WrappedDecimal;
    minus(y: Numeric): WrappedDecimal;
    sub(y: Numeric): WrappedDecimal;
    modulo(y: Numeric): WrappedDecimal;
    mod(y: Numeric): WrappedDecimal;
    naturalExponetial(): WrappedDecimal;
    exp(): WrappedDecimal;
    naturalLogarithm(): WrappedDecimal;
    ln(): WrappedDecimal;
    negated(): WrappedDecimal;
    neg(): WrappedDecimal;
    plus(y: Numeric): WrappedDecimal;
    add(y: Numeric): WrappedDecimal;
    squareRoot(): WrappedDecimal;
    sqrt(): WrappedDecimal;
    times(y: Numeric): WrappedDecimal;
    mul(y: Numeric): WrappedDecimal;
    toWrappedDecimalPlaces(dp?: number, rm?: number): WrappedDecimal;
    todp(dp?: number, rm?: number): WrappedDecimal;
    toInteger(): WrappedDecimal;
    toint(): WrappedDecimal;
    toPower(y: Numeric): WrappedDecimal;
    pow(y: Numeric): WrappedDecimal;
    toSignificantDigits(sd?: number, rm?: number): WrappedDecimal;
    tosd(sd?: number, rm?: number): WrappedDecimal;
    toFormat(options: FormatOptions): string;
    toFormat(fractionLength: number): string;
    toFormat(fractionLength: number, options: FormatOptions): string;
    toFormat(fractionLength: number, missionUnknown: number): string;
    toFormat(fractionLength: number, missionUnknown: number, options: FormatOptions): string;
}
declare const toFormat: {
    (fn: BigConstructor): WrappedBigConstructor;
    (fn: DecimalConstructor): WrappedDecimalConstructor;
};
export default toFormat;
//# sourceMappingURL=to-format.d.ts.map