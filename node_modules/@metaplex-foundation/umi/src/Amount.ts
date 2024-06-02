import {
  NumberSerializer,
  Serializer,
  mapSerializer,
} from '@metaplex-foundation/umi-serializers';
import { BigIntInput, createBigInt } from './BigInt';
import { AmountMismatchError, UnexpectedAmountError } from './errors';

/**
 * The identifier of an amount.
 * @category Utils — Amounts
 */
export type AmountIdentifier = 'SOL' | 'USD' | '%' | 'splToken' | string;

/**
 * The number of decimals in an amount represented using the lowest possible unit.
 * @category Utils — Amounts
 */
export type AmountDecimals = number;

/**
 * Describes an amount of any type or currency using the lowest possible unit.
 * It uses a BigInt to represent the basis points of the amount, a decimal number
 * to know how to interpret the basis points, and an identifier to know what
 * type of amount we are dealing with.
 *
 * Custom type parameters can be used to represent specific types of amounts.
 * For example:
 * - Amount<'SOL', 9> represents an amount of SOL in lamports.
 * - Amount<'USD', 2> represents an amount of USD in cents.
 * - Amount<'%', 2> represents a percentage with 2 decimals.
 *
 * @category Utils — Amounts
 */
export type Amount<
  I extends AmountIdentifier = AmountIdentifier,
  D extends AmountDecimals = AmountDecimals
> = {
  /** The amount in its lower possible unit such that it does not contain decimals. */
  basisPoints: bigint;
  /** The identifier of the amount. */
  identifier: I;
  /** The number of decimals in the amount. */
  decimals: D;
};

/**
 * An amount of SOL represented using the lowest possible unit — i.e. lamports.
 * @category Utils — Amounts
 */
export type SolAmount = Amount<'SOL', 9>;

/**
 * An amount of US dollars represented using the lowest possible unit — i.e. cents.
 * @category Utils — Amounts
 */
export type UsdAmount = Amount<'USD', 2>;

/**
 * An percentage represented in basis points using a given number of decimals.
 * @category Utils — Amounts
 */
export type PercentAmount<D extends AmountDecimals> = Amount<'%', D>;

/**
 * Creates an amount from the provided basis points, identifier, and decimals.
 * @category Utils — Amounts
 */
export const createAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  basisPoints: BigIntInput,
  identifier: I,
  decimals: D
): Amount<I, D> => ({
  basisPoints: createBigInt(basisPoints),
  identifier,
  decimals,
});

/**
 * Creates an amount from a decimal value which will be converted to the lowest
 * possible unit using the provided decimals.
 * @category Utils — Amounts
 */
export const createAmountFromDecimals = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  decimalAmount: number,
  identifier: I,
  decimals: D
): Amount<I, D> => {
  const exponentAmount = createAmount(
    BigInt(10) ** BigInt(decimals ?? 0),
    identifier,
    decimals
  );

  return multiplyAmount(exponentAmount, decimalAmount);
};

/**
 * Creates a percentage amount from the provided decimal value.
 * @category Utils — Amounts
 */
export const percentAmount = <D extends AmountDecimals>(
  percent: number,
  decimals: D = 2 as D
): Amount<'%', D> => createAmountFromDecimals(percent, '%', decimals);

/**
 * Creates an amount of SPL tokens from the provided decimal value.
 * @category Utils — Amounts
 */
export const tokenAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  tokens: number,
  identifier?: I,
  decimals?: D
): Amount<I, D> =>
  createAmountFromDecimals(
    tokens,
    (identifier ?? 'splToken') as I,
    (decimals ?? 0) as D
  );

/**
 * Creates a {@link SolAmount} from the provided lamports.
 * @category Utils — Amounts
 */
export const lamports = (lamports: BigIntInput): SolAmount =>
  createAmount(lamports, 'SOL', 9);

/**
 * Creates a {@link SolAmount} from the provided decimal value in SOL.
 * @category Utils — Amounts
 */
export const sol = (sol: number): SolAmount =>
  createAmountFromDecimals(sol, 'SOL', 9);

/**
 * Creates a {@link UsdAmount} from the provided decimal value in USD.
 * @category Utils — Amounts
 */
export const usd = (usd: number): UsdAmount =>
  createAmountFromDecimals(usd, 'USD', 2);

/**
 * Determines whether a given amount has the provided identifier and decimals.
 * @category Utils — Amounts
 */
export const isAmount = <I extends AmountIdentifier, D extends AmountDecimals>(
  amount: Amount,
  identifier: I,
  decimals: D
): amount is Amount<I, D> =>
  amount.identifier === identifier && amount.decimals === decimals;

/**
 * Determines whether a given amount is a {@link SolAmount}.
 * @category Utils — Amounts
 */
export const isSolAmount = (amount: Amount): amount is SolAmount =>
  isAmount(amount, 'SOL', 9);

/**
 * Determines whether two amounts are of the same type.
 * @category Utils — Amounts
 */
export const sameAmounts = (left: Amount, right: Amount): boolean =>
  isAmount(left, right.identifier, right.decimals);

/**
 * Ensures that a given amount has the provided identifier and decimals.
 * @category Utils — Amounts
 */
export function assertAmount<
  I extends AmountIdentifier,
  D extends AmountDecimals
>(amount: Amount, identifier: I, decimals: D): asserts amount is Amount<I, D> {
  if (!isAmount(amount, identifier, decimals)) {
    throw new UnexpectedAmountError(amount, identifier, decimals);
  }
}

/**
 * Ensures that a given amount is a {@link SolAmount}.
 * @category Utils — Amounts
 */
export function assertSolAmount(actual: Amount): asserts actual is SolAmount {
  assertAmount(actual, 'SOL', 9);
}

/**
 * Ensures that two amounts are of the same type.
 * @category Utils — Amounts
 */
export function assertSameAmounts(
  left: Amount,
  right: Amount,
  operation?: string
) {
  if (!sameAmounts(left, right)) {
    throw new AmountMismatchError(left, right, operation);
  }
}

/**
 * Adds two amounts of the same type.
 * @category Utils — Amounts
 */
export const addAmounts = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): Amount<I, D> => {
  assertSameAmounts(left, right, 'add');

  return {
    ...left,
    basisPoints: left.basisPoints + right.basisPoints,
  };
};

/**
 * Subtracts two amounts of the same type.
 * @category Utils — Amounts
 */
export const subtractAmounts = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): Amount<I, D> => {
  assertSameAmounts(left, right, 'subtract');

  return {
    ...left,
    basisPoints: left.basisPoints - right.basisPoints,
  };
};

/**
 * Multiplies an amount by a given multiplier.
 * @category Utils — Amounts
 */
export const multiplyAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  multiplier: number | bigint
): Amount<I, D> => {
  if (typeof multiplier === 'bigint') {
    return { ...left, basisPoints: left.basisPoints * multiplier };
  }

  const [units, decimals] = multiplier.toString().split('.');
  const multiplierBasisPoints = BigInt(units + (decimals ?? ''));
  const multiplierExponents = BigInt(10) ** BigInt(decimals?.length ?? 0);

  return {
    ...left,
    basisPoints:
      (left.basisPoints * multiplierBasisPoints) / multiplierExponents,
  };
};

/**
 * Divides an amount by a given divisor.
 * @category Utils — Amounts
 */
export const divideAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  divisor: number | bigint
): Amount<I, D> => {
  if (typeof divisor === 'bigint') {
    return { ...left, basisPoints: left.basisPoints / divisor };
  }

  const [units, decimals] = divisor.toString().split('.');
  const divisorBasisPoints = BigInt(units + (decimals ?? ''));
  const divisorExponents = BigInt(10) ** BigInt(decimals?.length ?? 0);

  return {
    ...left,
    basisPoints: (left.basisPoints * divisorExponents) / divisorBasisPoints,
  };
};

/**
 * Returns the absolute value of an amount.
 * @category Utils — Amounts
 */
export const absoluteAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  value: Amount<I, D>
): Amount<I, D> => {
  const x = value.basisPoints;
  return { ...value, basisPoints: x < 0 ? -x : x };
};

/**
 * Compares two amounts of the same type.
 * @category Utils — Amounts
 */
export const compareAmounts = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): -1 | 0 | 1 => {
  assertSameAmounts(left, right, 'compare');
  if (left.basisPoints > right.basisPoints) return 1;
  if (left.basisPoints < right.basisPoints) return -1;
  return 0;
};

/**
 * Determines whether two amounts are equal.
 * An optional tolerance can be provided to allow for small differences.
 * When using {@link SolAmount}, this is usually due to transaction or small storage fees.
 * @category Utils — Amounts
 */
export const isEqualToAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>,
  tolerance?: Amount<I, D>
): boolean => {
  tolerance = tolerance ?? createAmount(0, left.identifier, left.decimals);
  assertSameAmounts(left, right, 'isEqualToAmount');
  assertSameAmounts(left, tolerance, 'isEqualToAmount');

  const delta = absoluteAmount(subtractAmounts(left, right));

  return isLessThanOrEqualToAmount(delta, tolerance);
};

/**
 * Whether the left amount is less than the right amount.
 * @category Utils — Amounts
 */
export const isLessThanAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): boolean => compareAmounts(left, right) < 0;

/**
 * Whether the left amount is less than or equal to the right amount.
 * @category Utils — Amounts
 */
export const isLessThanOrEqualToAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): boolean => compareAmounts(left, right) <= 0;

/**
 * Whether the left amount is greater than the right amount.
 * @category Utils — Amounts
 */
export const isGreaterThanAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): boolean => compareAmounts(left, right) > 0;

/**
 * Whether the left amount is greater than or equal to the right amount.
 * @category Utils — Amounts
 */
export const isGreaterThanOrEqualToAmount = <
  I extends AmountIdentifier,
  D extends AmountDecimals
>(
  left: Amount<I, D>,
  right: Amount<I, D>
): boolean => compareAmounts(left, right) >= 0;

/**
 * Whether the amount is zero.
 * @category Utils — Amounts
 */
export const isZeroAmount = (value: Amount): boolean =>
  value.basisPoints === BigInt(0);

/**
 * Whether the amount is positive.
 * @category Utils — Amounts
 */
export const isPositiveAmount = (value: Amount): boolean =>
  value.basisPoints >= BigInt(0);

/**
 * Whether the amount is negative.
 * @category Utils — Amounts
 */
export const isNegativeAmount = (value: Amount): boolean =>
  value.basisPoints < BigInt(0);

/**
 * Converts an amount to a string by using the amount's decimals.
 * @category Utils — Amounts
 */
export const amountToString = (value: Amount, maxDecimals?: number): string => {
  let text = value.basisPoints.toString();
  if (value.decimals === 0) {
    return text;
  }

  const sign = text.startsWith('-') ? '-' : '';
  text = text.replace('-', '');
  text = text.padStart(value.decimals + 1, '0');
  const units = text.slice(0, -value.decimals);
  let decimals = text.slice(-value.decimals);

  if (maxDecimals !== undefined) {
    decimals = decimals.slice(0, maxDecimals);
  }

  return `${sign + units}.${decimals}`;
};

/**
 * Converts an amount to a number by using the amount's decimals.
 * Note that this may throw an error if the amount is too large to fit in a JavaScript number.
 * @category Utils — Amounts
 */
export const amountToNumber = (value: Amount): number =>
  parseFloat(amountToString(value));

/**
 * Displays an amount as a string by using the amount's decimals and identifier.
 * @category Utils — Amounts
 */
export const displayAmount = (value: Amount, maxDecimals?: number): string => {
  const amountAsString = amountToString(value, maxDecimals);

  switch (value.identifier) {
    case '%':
      return `${amountAsString}%`;
    case 'splToken':
      return /^1(\.0+)?$/.test(amountAsString)
        ? `${amountAsString} Token`
        : `${amountAsString} Tokens`;
    default:
      if (value.identifier.startsWith('splToken.')) {
        const [, identifier] = value.identifier.split('.');
        return `${identifier} ${amountAsString}`;
      }
      return `${value.identifier} ${amountAsString}`;
  }
};

/**
 * Converts a number serializer into an amount serializer
 * by providing an amount identifier and decimals.
 * @category Utils — Amounts
 */
export const mapAmountSerializer = <
  I extends AmountIdentifier = AmountIdentifier,
  D extends AmountDecimals = AmountDecimals
>(
  serializer: NumberSerializer,
  identifier: I,
  decimals: D
): Serializer<Amount<I, D>> =>
  mapSerializer(
    serializer as Serializer<number | bigint>,
    (value: Amount<I, D>): number | bigint =>
      value.basisPoints > Number.MAX_SAFE_INTEGER
        ? value.basisPoints
        : Number(value.basisPoints),
    (value: number | bigint): Amount<I, D> =>
      createAmount(value, identifier, decimals)
  );
