import {
  BaseSerializerOptions,
  DeserializingEmptyBufferError,
  ExpectedFixedSizeSerializerError,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import {
  NumberSerializer,
  u8,
} from '@metaplex-foundation/umi-serializers-numbers';

/**
 * Defines the options for boolean serializers.
 * @category Serializers
 */
export type BoolSerializerOptions = BaseSerializerOptions & {
  /**
   * The number serializer to delegate to.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Creates a boolean serializer.
 *
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function bool(options: BoolSerializerOptions = {}): Serializer<boolean> {
  const size = options.size ?? u8();
  if (size.fixedSize === null) {
    throw new ExpectedFixedSizeSerializerError(
      'Serializer [bool] requires a fixed size.'
    );
  }
  return {
    description: options.description ?? `bool(${size.description})`,
    fixedSize: size.fixedSize,
    maxSize: size.fixedSize,
    serialize: (value: boolean) => size.serialize(value ? 1 : 0),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('bool');
      }
      const [value, vOffset] = size.deserialize(bytes, offset);
      return [value === 1, vOffset];
    },
  };
}
