import {
  BaseSerializerOptions,
  ExpectedFixedSizeSerializerError,
  Serializer,
  mergeBytes,
} from '@metaplex-foundation/umi-serializers-core';
import { u32 } from '@metaplex-foundation/umi-serializers-numbers';
import { ArrayLikeSerializerSize } from './arrayLikeSerializerSize';
import { InvalidNumberOfItemsError } from './errors';
import {
  getResolvedSize,
  getSizeDescription,
  getSizeFromChildren,
  getSizePrefix,
} from './utils';

/**
 * Defines the options for array serializers.
 * @category Serializers
 */
export type ArraySerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the array.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Creates a serializer for an array of items.
 *
 * @param item - The serializer to use for the array's items.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function array<T, U extends T = T>(
  item: Serializer<T, U>,
  options: ArraySerializerOptions = {}
): Serializer<T[], U[]> {
  const size = options.size ?? u32();
  if (size === 'remainder' && item.fixedSize === null) {
    throw new ExpectedFixedSizeSerializerError(
      'Serializers of "remainder" size must have fixed-size items.'
    );
  }
  return {
    description:
      options.description ??
      `array(${item.description}; ${getSizeDescription(size)})`,
    fixedSize: getSizeFromChildren(size, [item.fixedSize]),
    maxSize: getSizeFromChildren(size, [item.maxSize]),
    serialize: (value: T[]) => {
      if (typeof size === 'number' && value.length !== size) {
        throw new InvalidNumberOfItemsError('array', size, value.length);
      }
      return mergeBytes([
        getSizePrefix(size, value.length),
        ...value.map((v) => item.serialize(v)),
      ]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (typeof size === 'object' && bytes.slice(offset).length === 0) {
        return [[], offset];
      }
      const [resolvedSize, newOffset] = getResolvedSize(
        size,
        [item.fixedSize],
        bytes,
        offset
      );
      offset = newOffset;
      const values: U[] = [];
      for (let i = 0; i < resolvedSize; i += 1) {
        const [value, newOffset] = item.deserialize(bytes, offset);
        values.push(value);
        offset = newOffset;
      }
      return [values, offset];
    },
  };
}
