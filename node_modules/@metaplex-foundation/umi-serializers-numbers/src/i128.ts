/* eslint-disable no-bitwise */
import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const i128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'i128',
    size: 16,
    range: [
      -BigInt('0x7fffffffffffffffffffffffffffffff') - 1n,
      BigInt('0x7fffffffffffffffffffffffffffffff'),
    ],
    set: (view, value, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigInt64(leftOffset, BigInt(value) >> 64n, le);
      view.setBigUint64(rightOffset, BigInt(value) & rightMask, le);
    },
    get: (view, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const left = view.getBigInt64(leftOffset, le);
      const right = view.getBigUint64(rightOffset, le);
      return (left << 64n) + right;
    },
    options,
  });
