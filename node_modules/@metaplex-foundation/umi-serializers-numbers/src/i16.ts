import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const i16 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i16',
    size: 2,
    range: [-Number('0x7fff') - 1, Number('0x7fff')],
    set: (view, value, le) => view.setInt16(0, Number(value), le),
    get: (view, le) => view.getInt16(0, le),
    options,
  });
