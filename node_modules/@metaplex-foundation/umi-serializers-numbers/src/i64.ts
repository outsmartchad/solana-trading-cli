import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const i64 = (
  options: NumberSerializerOptions = {}
): Serializer<number | bigint, bigint> =>
  numberFactory({
    name: 'i64',
    size: 8,
    range: [-BigInt('0x7fffffffffffffff') - 1n, BigInt('0x7fffffffffffffff')],
    set: (view, value, le) => view.setBigInt64(0, BigInt(value), le),
    get: (view, le) => view.getBigInt64(0, le),
    options,
  });
