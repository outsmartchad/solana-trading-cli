import type { Buffer } from 'buffer';
import BN from 'bn.js';
import { default as assert } from '@/utils/assert';
import type { Opaque, Option } from '@/utils';

export type BigNumber = Opaque<BN, 'BigNumber'>;
export type BigNumberValues =
  | number
  | string
  | number[]
  | Uint8Array
  | Buffer
  | BN;

export const toBigNumber = (
  value: BigNumberValues,
  endian?: BN.Endianness
): BigNumber => {
  return new BN(value, endian) as BigNumber;
};

export const toOptionBigNumber = (
  value: Option<BigNumberValues>
): Option<BigNumber> => {
  return value === null ? null : toBigNumber(value);
};

export const isBigNumber = (value: any): value is BigNumber => {
  return value?.__opaque__ === 'BigNumber';
};

export function assertBigNumber(value: any): asserts value is BigNumber {
  assert(isBigNumber(value), 'Expected BigNumber type');
}
