import { Logger } from '../common'

import { BigNumberish, tenExponentiate } from './bignumber'
import { Rounding } from './constant'
import { Currency, currencyEquals } from './currency'
import { Fraction } from './fraction'

const logger = Logger.from('entity/price')

export class Price extends Fraction {
  public readonly baseCurrency: Currency // input i.e. denominator
  public readonly quoteCurrency: Currency // output i.e. numerator
  // used to adjust the raw fraction w/r/t the decimals of the {base,quote}Token
  public readonly scalar: Fraction

  // denominator and numerator _must_ be raw, i.e. in the native representation
  public constructor(
    baseCurrency: Currency,
    denominator: BigNumberish,
    quoteCurrency: Currency,
    numerator: BigNumberish,
  ) {
    super(numerator, denominator)

    this.baseCurrency = baseCurrency
    this.quoteCurrency = quoteCurrency
    this.scalar = new Fraction(tenExponentiate(baseCurrency.decimals), tenExponentiate(quoteCurrency.decimals))
  }

  public get raw(): Fraction {
    return new Fraction(this.numerator, this.denominator)
  }

  public get adjusted(): Fraction {
    return super.mul(this.scalar)
  }

  public invert(): Price {
    return new Price(this.quoteCurrency, this.numerator, this.baseCurrency, this.denominator)
  }

  public mul(other: Price): Price {
    logger.assert(currencyEquals(this.quoteCurrency, other.baseCurrency), 'mul currency not equals')

    const fraction = super.mul(other)
    return new Price(this.baseCurrency, fraction.denominator, other.quoteCurrency, fraction.numerator)
  }

  public toSignificant(significantDigits = this.quoteCurrency.decimals, format?: object, rounding?: Rounding): string {
    return this.adjusted.toSignificant(significantDigits, format, rounding)
  }

  public toFixed(decimalPlaces = this.quoteCurrency.decimals, format?: object, rounding?: Rounding): string {
    return this.adjusted.toFixed(decimalPlaces, format, rounding)
  }
}
