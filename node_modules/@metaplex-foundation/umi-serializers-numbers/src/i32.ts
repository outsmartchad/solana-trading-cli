import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const i32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i32',
    size: 4,
    range: [-Number('0x7fffffff') - 1, Number('0x7fffffff')],
    set: (view, value, le) => view.setInt32(0, Number(value), le),
    get: (view, le) => view.getInt32(0, le),
    options,
  });
