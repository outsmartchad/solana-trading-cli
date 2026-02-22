/**
 * Vendored from @percolator/core — encoding primitives for Percolator instructions.
 * Source: https://github.com/dcccrypto/percolator-launch
 * License: MIT
 */
import { PublicKey } from "@solana/web3.js";

export function encU8(val: number): Uint8Array {
  return new Uint8Array([val & 0xff]);
}

export function encU16(val: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, val, true);
  return buf;
}

export function encU32(val: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, val, true);
  return buf;
}

export function encU64(val: bigint | string): Uint8Array {
  const n = typeof val === "string" ? BigInt(val) : val;
  if (n < 0n) throw new Error("encU64: value must be non-negative");
  if (n > 0xffff_ffff_ffff_ffffn) throw new Error("encU64: value exceeds u64 max");
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, n, true);
  return buf;
}

export function encI64(val: bigint | string): Uint8Array {
  const n = typeof val === "string" ? BigInt(val) : val;
  const min = -(1n << 63n);
  const max = (1n << 63n) - 1n;
  if (n < min || n > max) throw new Error("encI64: value out of range");
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, n, true);
  return buf;
}

export function encU128(val: bigint | string): Uint8Array {
  const n = typeof val === "string" ? BigInt(val) : val;
  if (n < 0n) throw new Error("encU128: value must be non-negative");
  const max = (1n << 128n) - 1n;
  if (n > max) throw new Error("encU128: value exceeds u128 max");
  const buf = new Uint8Array(16);
  const view = new DataView(buf.buffer);
  const lo = n & 0xffff_ffff_ffff_ffffn;
  const hi = n >> 64n;
  view.setBigUint64(0, lo, true);
  view.setBigUint64(8, hi, true);
  return buf;
}

export function encI128(val: bigint | string): Uint8Array {
  const n = typeof val === "string" ? BigInt(val) : val;
  const min = -(1n << 127n);
  const max = (1n << 127n) - 1n;
  if (n < min || n > max) throw new Error("encI128: value out of range");
  let unsigned = n;
  if (n < 0n) {
    unsigned = (1n << 128n) + n;
  }
  const buf = new Uint8Array(16);
  const view = new DataView(buf.buffer);
  const lo = unsigned & 0xffff_ffff_ffff_ffffn;
  const hi = unsigned >> 64n;
  view.setBigUint64(0, lo, true);
  view.setBigUint64(8, hi, true);
  return buf;
}

export function encPubkey(val: PublicKey | string): Uint8Array {
  const pk = typeof val === "string" ? new PublicKey(val) : val;
  return pk.toBytes();
}

export function encBool(val: boolean): Uint8Array {
  return encU8(val ? 1 : 0);
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
