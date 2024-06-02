import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { SingleByteNumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const u8 = (
  options: SingleByteNumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'u8',
    size: 1,
    range: [0, Number('0xff')],
    set: (view, value) => view.setUint8(0, Number(value)),
    get: (view) => view.getUint8(0),
    options,
  });
