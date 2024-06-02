/**
 * Defines all the types that can be used to create
 * a BigInt via the <code>{@link createBigInt}</code> function.
 * @category Utils — Amounts
 */
export type BigIntInput = number | string | boolean | bigint | Uint8Array;

/**
 * Creates a BigInt from a number, string, boolean, or Uint8Array.
 * @category Utils — Amounts
 */
export const createBigInt = (input: BigIntInput): bigint => {
  input = typeof input === 'object' ? input.toString() : input;
  return BigInt(input);
};
