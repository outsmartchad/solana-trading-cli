import {
  BaseSerializerOptions,
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
  Serializer,
  fixSerializer,
  mergeBytes,
} from '@metaplex-foundation/umi-serializers-core';
import { utf8 } from '@metaplex-foundation/umi-serializers-encodings';
import {
  NumberSerializer,
  u32,
} from '@metaplex-foundation/umi-serializers-numbers';
import { getSizeDescription } from './utils';

/**
 * Defines the options for string serializers.
 * @category Serializers
 */
export type StringSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the string. It can be one of the following:
   * - a {@link NumberSerializer} that prefixes the string with its size.
   * - a fixed number of bytes.
   * - or `'variable'` to use the rest of the buffer.
   * @defaultValue `u32()`
   */
  size?: NumberSerializer | number | 'variable';
  /**
   * The string serializer to use for encoding and decoding the content.
   * @defaultValue `utf8`
   */
  encoding?: Serializer<string>;
};

/**
 * Creates a string serializer.
 *
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function string(
  options: StringSerializerOptions = {}
): Serializer<string> {
  const size = options.size ?? u32();
  const encoding = options.encoding ?? utf8;
  const description =
    options.description ??
    `string(${encoding.description}; ${getSizeDescription(size)})`;

  if (size === 'variable') {
    return { ...encoding, description };
  }

  if (typeof size === 'number') {
    return fixSerializer(encoding, size, description);
  }

  return {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: string) => {
      const contentBytes = encoding.serialize(value);
      const lengthBytes = size.serialize(contentBytes.length);
      return mergeBytes([lengthBytes, contentBytes]);
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      if (buffer.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('string');
      }
      const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
      const length = Number(lengthBigInt);
      offset = lengthOffset;
      const contentBuffer = buffer.slice(offset, offset + length);
      if (contentBuffer.length < length) {
        throw new NotEnoughBytesError('string', length, contentBuffer.length);
      }
      const [value, contentOffset] = encoding.deserialize(contentBuffer);
      offset += contentOffset;
      return [value, offset];
    },
  };
}
