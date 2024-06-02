import {
  Option,
  OptionOrNullable,
  isOption,
  isSome,
  none,
  some,
  wrapNullable,
} from '@metaplex-foundation/umi-options';
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
 * Defines the options for `Option` serializers.
 * @category Serializers
 */
export type OptionSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the boolean prefix.
   * @defaultValue `u8()`
   */
  prefix?: NumberSerializer;
  /**
   * Whether the item serializer should be of fixed size.
   *
   * When this is true, a `None` value will skip the bytes that would
   * have been used for the item. Note that this will only work if the
   * item serializer is of fixed size.
   * @defaultValue `false`
   */
  fixed?: boolean;
};

/**
 * Creates a serializer for an optional value using the {@link Option} type.
 *
 * @param item - The serializer to use for the value that may be present.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function option<T, U extends T = T>(
  item: Serializer<T, U>,
  options: OptionSerializerOptions = {}
): Serializer<OptionOrNullable<T>, Option<U>> {
  const prefix = options.prefix ?? u8();
  const fixed = options.fixed ?? false;
  let descriptionSuffix = `; ${getSizeDescription(prefix)}`;
  let fixedSize = item.fixedSize === 0 ? prefix.fixedSize : null;
  if (fixed) {
    if (item.fixedSize === null || prefix.fixedSize === null) {
      throw new ExpectedFixedSizeSerializerError(
        'Fixed options can only be used with fixed-size serializers'
      );
    }
    descriptionSuffix += '; fixed';
    fixedSize = prefix.fixedSize + item.fixedSize;
  }
  return {
    description:
      options.description ?? `option(${item.description + descriptionSuffix})`,
    fixedSize,
    maxSize: sumSerializerSizes([prefix.maxSize, item.maxSize]),
    serialize: (optionOrNullable: OptionOrNullable<T>) => {
      const option = isOption<T>(optionOrNullable)
        ? optionOrNullable
        : wrapNullable(optionOrNullable);

      const prefixByte = prefix.serialize(Number(isSome(option)));
      if (fixed) {
        const itemFixedSize = item.fixedSize as number;
        const itemBytes = isSome(option)
          ? item.serialize(option.value).slice(0, itemFixedSize)
          : new Uint8Array(itemFixedSize).fill(0);
        return mergeBytes([prefixByte, itemBytes]);
      }
      const itemBytes = isSome(option)
        ? item.serialize(option.value)
        : new Uint8Array();
      return mergeBytes([prefixByte, itemBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        return [none(), offset];
      }
      const fixedOffset =
        offset + (prefix.fixedSize ?? 0) + (item.fixedSize ?? 0);
      const [isSome, prefixOffset] = prefix.deserialize(bytes, offset);
      offset = prefixOffset;
      if (isSome === 0) {
        return [none(), fixed ? fixedOffset : offset];
      }
      const [value, newOffset] = item.deserialize(bytes, offset);
      offset = newOffset;
      return [some(value), fixed ? fixedOffset : offset];
    },
  };
}
