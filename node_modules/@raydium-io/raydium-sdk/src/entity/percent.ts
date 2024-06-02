import { _100, Rounding } from './constant'
import { Fraction } from './fraction'

export const _100_PERCENT = new Fraction(_100)

export class Percent extends Fraction {
  public toSignificant(significantDigits = 5, format?: object, rounding?: Rounding) {
    return this.mul(_100_PERCENT).toSignificant(significantDigits, format, rounding)
  }

  public toFixed(decimalPlaces = 2, format?: object, rounding?: Rounding) {
    return this.mul(_100_PERCENT).toFixed(decimalPlaces, format, rounding)
  }
}
