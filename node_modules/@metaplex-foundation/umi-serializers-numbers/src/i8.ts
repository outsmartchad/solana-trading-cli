import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { SingleByteNumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const i8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'i8',
    size: 1,
    range: [-Number('0x7f') - 1, Number('0x7f')],
    set: (view, value) => view.setInt8(0, Number(value)),
    get: (view) => view.getInt8(0),
    options,
  });
