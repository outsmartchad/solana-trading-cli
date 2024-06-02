import {
  NumberSerializer,
  Serializer,
  mapSerializer,
} from '@metaplex-foundation/umi-serializers';
import { BigIntInput, createBigInt } from './BigInt';

/**
 * Defines a string that can be parsed into a Date object.
 * For instance, `"2020-01-01T00:00:00.000Z"`.
 * @category Utils — DateTime
 */
export type DateTimeString = string;

/**
 * Defines all the types that can be used to create a DateTime.
 * @category Utils — DateTime
 */
export type DateTimeInput = DateTimeString | BigIntInput | Date;

/**
 * Defines a point in time via a Unix timestamp represented as a BigInt.
 * @category Utils — DateTime
 */
export type DateTime = bigint;

/**
 * Creates a {@link DateTime} from a {@link DateTimeInput}.
 * @category Utils — DateTime
 */
export const dateTime = (value: DateTimeInput): DateTime => {
  if (typeof value === 'string' || isDateObject(value)) {
    const date = new Date(value);
    const timestamp = Math.floor(date.getTime() / 1000);
    return createBigInt(timestamp);
  }

  return createBigInt(value);
};

/**
 * Helper function to get the current time as a {@link DateTime}.
 * @category Utils — DateTime
 */
export const now = (): DateTime => dateTime(new Date(Date.now()));

/**
 * Whether the given value is a Date object.
 * @category Utils — DateTime
 */
const isDateObject = (value: any): value is Date =>
  Object.prototype.toString.call(value) === '[object Date]';

/**
 * Formats a {@link DateTime} as a string.
 * @category Utils — DateTime
 */
export const formatDateTime = (
  value: DateTime,
  locales: Intl.LocalesArgument = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }
): string => {
  const date = new Date(Number(value * 1000n));

  return date.toLocaleDateString(locales, options);
};

/**
 * Converts a number serializer into a DateTime serializer.
 * @category Utils — DateTime
 */
export const mapDateTimeSerializer = (
  serializer: NumberSerializer
): Serializer<DateTimeInput, DateTime> =>
  mapSerializer(
    serializer as Serializer<number | bigint>,
    (value: DateTimeInput): number | bigint => {
      const date = dateTime(value);
      return date > Number.MAX_SAFE_INTEGER ? date : Number(date);
    },
    (value: number | bigint): DateTime => dateTime(value)
  );
