import {
  WrapInSerializer,
  Serializer,
  mergeBytes,
  BaseSerializerOptions,
} from '@metaplex-foundation/umi-serializers-core';
import { sumSerializerSizes } from './sumSerializerSizes';
import { InvalidNumberOfItemsError } from './errors';

/**
 * Defines the options for tuple serializers.
 * @category Serializers
 */
export type TupleSerializerOptions = BaseSerializerOptions;

/**
 * Creates a serializer for a tuple-like array.
 *
 * @param items - The serializers to use for each item in the tuple.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function tuple<T extends any[], U extends T = T>(
  items: WrapInSerializer<[...T], [...U]>,
  options: TupleSerializerOptions = {}
): Serializer<T, U> {
  const itemDescriptions = items.map((item) => item.description).join(', ');
  return {
    description: options.description ?? `tuple(${itemDescriptions})`,
    fixedSize: sumSerializerSizes(items.map((item) => item.fixedSize)),
    maxSize: sumSerializerSizes(items.map((item) => item.maxSize)),
    serialize: (value: T) => {
      if (value.length !== items.length) {
        throw new InvalidNumberOfItemsError(
          'tuple',
          items.length,
          value.length
        );
      }
      return mergeBytes(
        items.map((item, index) => item.serialize(value[index]))
      );
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const values = [] as any as U;
      items.forEach((serializer) => {
        const [newValue, newOffset] = serializer.deserialize(bytes, offset);
        values.push(newValue);
        offset = newOffset;
      });
      return [values, offset];
    },
  };
}
