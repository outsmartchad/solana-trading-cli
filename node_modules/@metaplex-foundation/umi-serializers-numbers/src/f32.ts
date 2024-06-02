import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const f32 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'f32',
    size: 4,
    set: (view, value, le) => view.setFloat32(0, Number(value), le),
    get: (view, le) => view.getFloat32(0, le),
    options,
  });
