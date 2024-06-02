import _Big from 'big.js'
import BN from 'bn.js'

import { Logger } from '../common'

import { BigNumberish, parseBigNumberish } from './bignumber'
import { Rounding, TEN } from './constant'
import { Currency, Token, currencyEquals } from './currency'
import { Fraction } from './fraction'
import toFormat, { WrappedBig } from './to-format'

const logger = Logger.from('entity/amount')

const Big = toFormat(_Big)
type Big = WrappedBig

export function splitNumber(num: string, decimals: number) {
  let integral = '0'
  let fractional = '0'

  if (num.includes('.')) {
    const splited = num.split('.')
    if (splited.length === 2) {
      ;[integral, fractional] = splited
      fractional = fractional.padEnd(decimals, '0')
    } else {
      return logger.throwArgumentError('invalid number string', 'num', num)
    }
  } else {
    integral = num
  }

  // fix decimals is 0
  return [integral, fractional.slice(0, decimals) || fractional]
}

export class CurrencyAmount extends Fraction {
  public readonly currency: Currency

  public constructor(currency: Currency, amount: BigNumberish, isRaw = true) {
    let parsedAmount = new BN(0)
    const multiplier = TEN.pow(new BN(currency.decimals))

    if (isRaw) {
      parsedAmount = parseBigNumberish(amount)
    } else {
      let integralAmount = new BN(0)
      let fractionalAmount = new BN(0)

      // parse fractional string
      if (typeof amount === 'string' || typeof amount === 'number' || typeof amount === 'bigint') {
        const [integral, fractional] = splitNumber(amount.toString(), currency.decimals)

        integralAmount = parseBigNumberish(integral)
        fractionalAmount = parseBigNumberish(fractional)
      }
      // else {
      //   integralAmount = parseBigNumberish(amount);
      // }

      integralAmount = integralAmount.mul(multiplier)
      parsedAmount = integralAmount.add(fractionalAmount)
    }

    super(parsedAmount, multiplier)
    this.currency = currency
  }

  public get raw() {
    return this.numerator
  }

  public isZero() {
    return this.raw.isZero()
  }

  /**
   * a greater than b
   */
  public gt(other: CurrencyAmount) {
    logger.assert(currencyEquals(this.currency, other.currency), 'gt currency not equals')

    return this.raw.gt(other.raw)
  }

  /**
   * a less than b
   */
  public lt(other: CurrencyAmount) {
    logger.assert(currencyEquals(this.currency, other.currency), 'lt currency not equals')

    return this.raw.lt(other.raw)
  }

  public add(other: CurrencyAmount): CurrencyAmount {
    logger.assert(currencyEquals(this.currency, other.currency), 'add currency not equals')

    return new CurrencyAmount(this.currency, this.raw.add(other.raw))
  }

  public sub(other: CurrencyAmount): CurrencyAmount {
    logger.assert(currencyEquals(this.currency, other.currency), 'sub currency not equals')

    return new CurrencyAmount(this.currency, this.raw.sub(other.raw))
  }

  public toSignificant(
    significantDigits = this.currency.decimals,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN,
  ): string {
    return super.toSignificant(significantDigits, format, rounding)
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
  public toFixed(
    decimalPlaces = this.currency.decimals,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN,
  ): string {
    logger.assert(decimalPlaces <= this.currency.decimals, 'decimals overflow')

    return super.toFixed(decimalPlaces, format, rounding)
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
  public toExact(format: object = { groupSeparator: '' }): string {
    Big.DP = this.currency.decimals
    return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(format)
  }
}

export class TokenAmount extends CurrencyAmount {
  public readonly token: Token

  public constructor(token: Token, amount: BigNumberish, isRaw = true) {
    super(token, amount, isRaw)
    this.token = token
  }

  public add(other: TokenAmount): TokenAmount {
    logger.assert(currencyEquals(this.token, other.token), 'add token not equals')

    return new TokenAmount(this.token, this.raw.add(other.raw))
  }

  public subtract(other: TokenAmount): TokenAmount {
    logger.assert(currencyEquals(this.token, other.token), 'sub token not equals')

    return new TokenAmount(this.token, this.raw.sub(other.raw))
  }
}

export type TokenAmountType = CurrencyAmount | TokenAmount
