import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { BigNumber, BigNumberValues, toBigNumber } from './BigNumber';
import { CurrencyMismatchError, UnexpectedCurrencyError } from '@/errors';

export type Amount<T extends Currency = Currency> = {
  basisPoints: BigNumber;
  currency: T;
};

export type Currency = {
  symbol: string;
  decimals: number;
  namespace?: 'spl-token';
};

export type SplTokenCurrency = {
  symbol: string;
  decimals: number;
  namespace: 'spl-token';
};
export type SplTokenAmount = Amount<SplTokenCurrency>;

/** @group Constants */
export const SOL = {
  symbol: 'SOL',
  decimals: 9,
} as const;
export type SolCurrency = typeof SOL;
export type SolAmount = Amount<SolCurrency>;

/** @group Constants */
export const USD = {
  symbol: 'USD',
  decimals: 2,
} as const;
export type UsdCurrency = typeof USD;
export type UsdAmount = Amount<UsdCurrency>;

export const amount = <T extends Currency = Currency>(
  basisPoints: BigNumberValues,
  currency: T
): Amount<T> => {
  return {
    basisPoints: toBigNumber(basisPoints),
    currency,
  };
};

export const lamports = (lamports: BigNumberValues): SolAmount => {
  return amount(lamports, SOL);
};

export const sol = (sol: number): SolAmount => {
  return lamports(sol * LAMPORTS_PER_SOL);
};

export const usd = (usd: number): UsdAmount => {
  return amount(usd * 100, USD);
};

export const token = (
  amount: BigNumberValues,
  decimals = 0,
  symbol = 'Token'
): SplTokenAmount => {
  if (typeof amount !== 'number') {
    amount = toBigNumber(amount).toNumber();
  }

  return {
    basisPoints: toBigNumber(amount * Math.pow(10, decimals)),
    currency: {
      symbol,
      decimals,
      namespace: 'spl-token',
    },
  };
};

export const isSol = (currencyOrAmount: Currency | Amount): boolean => {
  return sameCurrencies(currencyOrAmount, SOL);
};

export const sameAmounts = (left: Amount, right: Amount): boolean => {
  return sameCurrencies(left, right) && left.basisPoints.eq(right.basisPoints);
};

export const sameCurrencies = (
  left: Currency | Amount,
  right: Currency | Amount
): boolean => {
  if ('currency' in left) {
    left = left.currency;
  }

  if ('currency' in right) {
    right = right.currency;
  }

  return (
    left.symbol === right.symbol &&
    left.decimals === right.decimals &&
    left.namespace === right.namespace
  );
};

export function assertCurrency<T extends Currency>(
  actual: Currency,
  expected: T
): asserts actual is T;
export function assertCurrency<T extends Currency>(
  actual: Amount,
  expected: T
): asserts actual is Amount<T>;
export function assertCurrency<T extends Currency>(
  actual: Currency | Amount,
  expected: T
): asserts actual is T | Amount<T>;
export function assertCurrency<T extends Currency>(
  actual: Currency | Amount,
  expected: T
): asserts actual is T | Amount<T> {
  if ('currency' in actual) {
    actual = actual.currency;
  }

  if (!sameCurrencies(actual, expected)) {
    throw new UnexpectedCurrencyError(actual, expected);
  }
}
export function assertSol(actual: Amount): asserts actual is SolAmount;
export function assertSol(actual: Currency): asserts actual is SolCurrency;
export function assertSol(
  actual: Currency | Amount
): asserts actual is SolCurrency | SolAmount;
export function assertSol(
  actual: Currency | Amount
): asserts actual is SolCurrency | SolAmount {
  assertCurrency(actual, SOL);
}

export function assertSameCurrencies<L extends Currency, R extends Currency>(
  left: L | Amount<L>,
  right: R | Amount<R>,
  operation?: string
) {
  if ('currency' in left) {
    left = left.currency;
  }

  if ('currency' in right) {
    right = right.currency;
  }

  if (!sameCurrencies(left, right)) {
    throw new CurrencyMismatchError(left, right, operation);
  }
}

export const addAmounts = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): Amount<T> => {
  assertSameCurrencies(left, right, 'add');

  return amount(left.basisPoints.add(right.basisPoints), left.currency);
};

export const subtractAmounts = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): Amount<T> => {
  assertSameCurrencies(left, right, 'subtract');

  return amount(left.basisPoints.sub(right.basisPoints), left.currency);
};

export const multiplyAmount = <T extends Currency>(
  left: Amount<T>,
  multiplier: number
): Amount<T> => {
  return amount(left.basisPoints.muln(multiplier), left.currency);
};

export const divideAmount = <T extends Currency>(
  left: Amount<T>,
  divisor: number
): Amount<T> => {
  return amount(left.basisPoints.divn(divisor), left.currency);
};

export const absoluteAmount = <T extends Currency>(
  value: Amount<T>
): Amount<T> => {
  return amount(value.basisPoints.abs(), value.currency);
};

export const compareAmounts = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): -1 | 0 | 1 => {
  assertSameCurrencies(left, right, 'compare');

  return left.basisPoints.cmp(right.basisPoints);
};

export const isEqualToAmount = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>,
  tolerance?: Amount<T>
): boolean => {
  tolerance = tolerance ?? amount(0, left.currency);
  assertSameCurrencies(left, right, 'isEqualToAmount');
  assertSameCurrencies(left, tolerance, 'isEqualToAmount');

  const delta = absoluteAmount(subtractAmounts(left, right));

  return isLessThanOrEqualToAmount(delta, tolerance);
};

export const isLessThanAmount = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): boolean => compareAmounts(left, right) < 0;

export const isLessThanOrEqualToAmount = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): boolean => compareAmounts(left, right) <= 0;

export const isGreaterThanAmount = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): boolean => compareAmounts(left, right) > 0;

export const isGreaterThanOrEqualToAmount = <T extends Currency>(
  left: Amount<T>,
  right: Amount<T>
): boolean => compareAmounts(left, right) >= 0;

export const isZeroAmount = (value: Amount): boolean =>
  compareAmounts(value, amount(0, value.currency)) === 0;

export const isPositiveAmount = (value: Amount): boolean =>
  compareAmounts(value, amount(0, value.currency)) >= 0;

export const isNegativeAmount = (value: Amount): boolean =>
  compareAmounts(value, amount(0, value.currency)) < 0;

export const formatAmount = (value: Amount): string => {
  if (value.currency.decimals === 0) {
    return `${value.currency.symbol} ${value.basisPoints.toString()}`;
  }

  const power = new BN(10).pow(new BN(value.currency.decimals));
  const basisPoints = value.basisPoints as unknown as BN & {
    divmod: (other: BN) => { div: BN; mod: BN };
  };

  const { div, mod } = basisPoints.divmod(power);
  const units = `${div.toString()}.${mod
    .abs()
    .toString(10, value.currency.decimals)}`;

  return `${value.currency.symbol} ${units}`;
};
