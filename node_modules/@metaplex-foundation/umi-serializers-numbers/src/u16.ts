import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const u16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u16',
    size: 2,
    range: [0, Number('0xffff')],
    set: (view, value, le) => view.setUint16(0, Number(value), le),
    get: (view, le) => view.getUint16(0, le),
    options,
  });
