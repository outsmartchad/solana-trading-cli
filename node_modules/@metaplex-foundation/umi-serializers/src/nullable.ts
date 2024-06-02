import { Nullable } from '@metaplex-foundation/umi-options';
import {
  BaseSerializerOptions,
  ExpectedFixedSizeSerializerError,
  Serializer,
  mergeBytes,
} from '@metaplex-foundation/umi-serializers-core';
import {
  NumberSerializer,
  u8,
} from '@metaplex-foundation/umi-serializers-numbers';
import { sumSerializerSizes } from './sumSerializerSizes';
import { getSizeDescription } from './utils';

/**
 * Defines the options for `Nullable` serializers.
 * @category Serializers
 */
export type NullableSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the boolean prefix.
   * @defaultValue `u8()`
   */
  prefix?: NumberSerializer;
  /**
   * Whether the item serializer should be of fixed size.
   *
   * When this is true, a `null` value will skip the bytes that would
   * have been used for the item. Note that this will only work if the
   * item serializer is of fixed size.
   * @defaultValue `false`
   */
  fixed?: boolean;
};

/**
 * Creates a serializer for an optional value using `null` as the `None` value.
 *
 * @param item - The serializer to use for the value that may be present.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function nullable<T, U extends T = T>(
  item: Serializer<T, U>,
  options: NullableSerializerOptions = {}
): Serializer<Nullable<T>, Nullable<U>> {
  const prefix = options.prefix ?? u8();
  const fixed = options.fixed ?? false;
  let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
  let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
  if (fixed) {
    if (item.fixedSize === null || prefix.fixedSize === null) {
      throw new ExpectedFixedSizeSerializerError(
        'Fixed nullables can only be used with fixed-size serializers'
      );
    }
    descriptionSuffix += '; fixed';
    fixedSize = prefix.fixedSize + item.fixedSize;
  }
  return {
    description:
      options.description ??
      `nullable(${item.description + descriptionSuffix})`,
    fixedSize,
    maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
    serialize: (option: Nullable<T>) => {
      const prefixByte = prefix.serialize(Number(option !== null));
      if (fixed) {
        const itemFixedSize = item.fixedSize as number;
        const itemBytes =
          option !== null
            ? item.serialize(option).slice(0, itemFixedSize)
            : new Uint8Array(itemFixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      }
      const itemBytes =
        option !== null ? item.serialize(option) : new Uint8Array();
      return mergeBytes([prefixByte, itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        return [null, offset];
      }
      const fixedOffset =
        offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
      const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
      offset = prefixOffset;
      if (isSome === 0) {
        return [null, fixed ? fixedOffset : offset];
      }
      const [value, newOffset] = item.deserialize(bytes, offset);
      offset = newOffset;
      return [value, fixed ? fixedOffset : offset];
    },
  };
}
