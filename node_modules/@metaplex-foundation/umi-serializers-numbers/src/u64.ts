import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const u64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'u64',
    size: 8,
    range: [0, BigInt('0xffffffffffffffff')],
    set: (view, value, le) => view.setBigUint64(0, BigInt(value), le),
    get: (view, le) => view.getBigUint64(0, le),
    options,
  });
