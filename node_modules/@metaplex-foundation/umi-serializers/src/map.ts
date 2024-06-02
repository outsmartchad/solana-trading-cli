import {
  BaseSerializerOptions,
  ExpectedFixedSizeSerializerError,
  mergeBytes,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import { u32 } from '@metaplex-foundation/umi-serializers-numbers';
import { ArrayLikeSerializerSize } from './arrayLikeSerializerSize';
import {
  getResolvedSize,
  getSizeDescription,
  getSizeFromChildren,
  getSizePrefix,
} from './utils';
import { InvalidNumberOfItemsError } from './errors';

/**
 * Defines the options for `Map` serializers.
 * @category Serializers
 */
export type MapSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the map.
   * @defaultValue `u32()`
   */
  size?: ArrayLikeSerializerSize;
};

/**
 * Creates a serializer for a map.
 *
 * @param key - The serializer to use for the map's keys.
 * @param value - The serializer to use for the map's values.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function map<TK, TV, UK extends TK = TK, UV extends TV = TV>(
  key: Serializer<TK, UK>,
  value: Serializer<TV, UV>,
  options: MapSerializerOptions = {}
): Serializer<Map<TK, TV>, Map<UK, UV>> {
  const size = options.size ?? u32();
  if (
    size === 'remainder' &&
    (key.fixedSize === null || value.fixedSize === null)
  ) {
    throw new ExpectedFixedSizeSerializerError(
      'Serializers of "remainder" size must have fixed-size items.'
    );
  }
  return {
    description:
      options.description ??
      `map(${key.description}, ${value.description}; ${getSizeDescription(
        size
      )})`,
    fixedSize: getSizeFromChildren(size, [key.fixedSize, value.fixedSize]),
    maxSize: getSizeFromChildren(size, [key.maxSize, value.maxSize]),
    serialize: (map: Map<TK, TV>) => {
      if (typeof size === 'number' && map.size !== size) {
        throw new InvalidNumberOfItemsError('map', size, map.size);
      }
      const itemBytes = Array.from(map, ([k, v]) =>
        mergeBytes([key.serialize(k), value.serialize(v)])
      );
      return mergeBytes([getSizePrefix(size, map.size), ...itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const map: Map<UK, UV> = new Map();
      if (typeof size === 'object' && bytes.slice(offset).length === 0) {
        return [map, offset];
      }
      const [resolvedSize, newOffset] = getResolvedSize(
        size,
        [key.fixedSize, value.fixedSize],
        bytes,
        offset
      );
      offset = newOffset;
      for (let i = 0; i < resolvedSize; i += 1) {
        const [deserializedKey, kOffset] = key.deserialize(bytes, offset);
        offset = kOffset;
        const [deserializedValue, vOffset] = value.deserialize(bytes, offset);
        offset = vOffset;
        map.set(deserializedKey, deserializedValue);
      }
      return [map, offset];
    },
  };
}
