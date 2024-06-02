import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const u32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u32',
    size: 4,
    range: [0, Number('0xffffffff')],
    set: (view, value, le) => view.setUint32(0, Number(value), le),
    get: (view, le) => view.getUint32(0, le),
    options,
  });
