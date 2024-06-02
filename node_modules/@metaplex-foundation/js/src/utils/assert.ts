import { MetaplexError } from '../errors';

/**
 * Error indicating that an assertion failed.
 * @group Errors
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Assserts that the provided condition is true.
 * @internal
 */
export default function assert(
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new AssertionError(message ?? 'Assertion failed');
  }
}

/**
 * Asserts that both values are strictly equal.
 * @internal
 */
assert.equal = function assertEqual<T>(
  actual: unknown,
  expected: T,
  message?: string
): asserts actual is T {
  if (actual !== expected) {
    throw new AssertionError((message ?? '') + ` ${actual} !== ${expected}`);
  }
};

/**
 * Asserts that a given object contains the specified
 * keys such that their values are defined.
 */
export function assertObjectHasDefinedKeys<
  T extends object,
  K extends keyof T = keyof T
>(
  input: T,
  keys: K[],
  onError: (missingKeys: K[]) => MetaplexError
): asserts input is { [key in keyof T]: T[key] } & { [key in K]-?: T[key] } {
  const missingKeys = keys.filter(
    (property) => input?.[property] === undefined
  );

  if (missingKeys.length > 0) {
    throw onError(missingKeys);
  }
}
