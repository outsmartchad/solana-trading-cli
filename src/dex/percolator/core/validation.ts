/**
 * Vendored from @percolator/core — input validation.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import { PublicKey } from "@solana/web3.js";

const U16_MAX = 65535;
const U64_MAX = BigInt("18446744073709551615");
const U128_MAX = (1n << 128n) - 1n;
const I128_MIN = -(1n << 127n);
const I128_MAX = (1n << 127n) - 1n;

export class ValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`Invalid ${field}: ${message}`);
    this.name = "ValidationError";
  }
}

export function validatePublicKey(value: string, field: string): PublicKey {
  try { return new PublicKey(value); }
  catch { throw new ValidationError(field, `"${value}" is not a valid base58 public key.`); }
}

export function validateIndex(value: string, field: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new ValidationError(field, `"${value}" is not a valid number`);
  if (num < 0) throw new ValidationError(field, `must be non-negative, got ${num}`);
  if (num > U16_MAX) throw new ValidationError(field, `must be <= ${U16_MAX}, got ${num}`);
  return num;
}

export function validateAmount(value: string, field: string): bigint {
  let num: bigint;
  try { num = BigInt(value); }
  catch { throw new ValidationError(field, `"${value}" is not a valid number.`); }
  if (num < 0n) throw new ValidationError(field, `must be non-negative, got ${num}`);
  if (num > U64_MAX) throw new ValidationError(field, `must be <= ${U64_MAX}, got ${num}`);
  return num;
}

export function validateU128(value: string, field: string): bigint {
  let num: bigint;
  try { num = BigInt(value); }
  catch { throw new ValidationError(field, `"${value}" is not a valid number.`); }
  if (num < 0n) throw new ValidationError(field, `must be non-negative, got ${num}`);
  if (num > U128_MAX) throw new ValidationError(field, `must be <= ${U128_MAX}, got ${num}`);
  return num;
}

export function validateI128(value: string, field: string): bigint {
  let num: bigint;
  try { num = BigInt(value); }
  catch { throw new ValidationError(field, `"${value}" is not a valid number.`); }
  if (num < I128_MIN) throw new ValidationError(field, `must be >= ${I128_MIN}, got ${num}`);
  if (num > I128_MAX) throw new ValidationError(field, `must be <= ${I128_MAX}, got ${num}`);
  return num;
}

export function validateBps(value: string, field: string): number {
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new ValidationError(field, `"${value}" is not a valid number`);
  if (num < 0) throw new ValidationError(field, `must be non-negative, got ${num}`);
  if (num > 10000) throw new ValidationError(field, `must be <= 10000, got ${num}`);
  return num;
}
