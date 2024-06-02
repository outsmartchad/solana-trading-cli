/* eslint-disable no-bitwise */
import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const u128 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'u128',
    size: 16,
    range: [0, BigInt('0xffffffffffffffffffffffffffffffff')],
    set: (view, value, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const rightMask = 0xffffffffffffffffn;
      view.setBigUint64(leftOffset, BigInt(value) >> 64n, le);
      view.setBigUint64(rightOffset, BigInt(value) & rightMask, le);
    },
    get: (view, le) => {
      const leftOffset = le ? 8 : 0;
      const rightOffset = le ? 0 : 8;
      const left = view.getBigUint64(leftOffset, le);
      const right = view.getBigUint64(rightOffset, le);
      return (left << 64n) + right;
    },
    options,
  });
