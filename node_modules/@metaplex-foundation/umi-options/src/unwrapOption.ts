import { Nullable, Option, isSome, none, some } from './common';

/**
 * Unwraps the value of an {@link Option} of type `T`
 * or returns a fallback value that defaults to `null`.
 *
 * @category Utils — Options
 */
export function unwrapOption<T>(option: Option<T>): Nullable<T>;
export function unwrapOption<T, U>(option: Option<T>, fallback: () => U): T | U;
export function unwrapOption<T, U = null>(
  option: Option<T>,
  fallback?: () => U
): T | U {
  if (isSome(option)) return option.value;
  return fallback ? fallback() : (null as U);
}

/**
 * Wraps a nullable value into an {@link Option}.
 *
 * @category Utils — Options
 */
export const wrapNullable = <T>(nullable: Nullable<T>): Option<T> =>
  nullable !== null ? some(nullable) : none<T>();

/**
 * Unwraps the value of an {@link Option} of type `T`.
 * If the option is a {@link Some}, it returns its value,
 * Otherwise, it returns `null`.
 *
 * @category Utils — Options
 * @deprecated Use {@link unwrapOption} instead.
 */
export const unwrapSome = <T>(option: Option<T>): Nullable<T> =>
  isSome(option) ? option.value : null;

/**
 * Unwraps the value of an {@link Option} of type `T`
 * or returns a custom fallback value.
 * If the option is a {@link Some}, it returns its value,
 * Otherwise, it returns the return value of the provided fallback callback.
 *
 * @category Utils — Options
 * @deprecated Use {@link unwrapOption} instead.
 */
export const unwrapSomeOrElse = <T, U>(
  option: Option<T>,
  fallback: () => U
): T | U => (isSome(option) ? option.value : fallback());
