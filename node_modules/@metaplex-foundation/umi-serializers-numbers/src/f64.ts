import { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializerOptions } from './common';
import { numberFactory } from './utils';

export const f64 = (
  options: NumberSerializerOptions = {}
): Serializer<number> =>
  numberFactory({
    name: 'f64',
    size: 8,
    set: (view, value, le) => view.setFloat64(0, Number(value), le),
    get: (view, le) => view.getFloat64(0, le),
    options,
  });
