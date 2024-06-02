import {
  BaseSerializerOptions,
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
  Serializer,
  fixSerializer,
  mergeBytes,
} from '@metaplex-foundation/umi-serializers-core';
import { NumberSerializer } from '@metaplex-foundation/umi-serializers-numbers';
import { getSizeDescription } from './utils';

/**
 * Defines the options for bytes serializers.
 * @category Serializers
 */
export type BytesSerializerOptions = BaseSerializerOptions & {
  /**
   * The size of the buffer. It can be one of the following:
   * - a {@link NumberSerializer} that prefixes the buffer with its size.
   * - a fixed number of bytes.
   * - or `'variable'` to use the rest of the buffer.
   * @defaultValue `'variable'`
   */
  size?: NumberSerializer | number | 'variable';
};

/**
 * Creates a serializer that passes the buffer as-is.
 *
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function bytes(
  options: BytesSerializerOptions = {}
): Serializer<Uint8Array> {
  const size = options.size ?? 'variable';
  const description =
    options.description ?? `bytes(${getSizeDescription(size)})`;

  const byteSerializer: Serializer<Uint8Array> = {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: Uint8Array) => new Uint8Array(value),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const slice = bytes.slice(offset);
      return [slice, offset + slice.length];
    },
  };

  if (size === 'variable') {
    return byteSerializer;
  }

  if (typeof size === 'number') {
    return fixSerializer(byteSerializer, size, description);
  }

  return {
    description,
    fixedSize: null,
    maxSize: null,
    serialize: (value: Uint8Array) => {
      const contentBytes = byteSerializer.serialize(value);
      const lengthBytes = size.serialize(contentBytes.length);
      return mergeBytes([lengthBytes, contentBytes]);
    },
    deserialize: (buffer: Uint8Array, offset = 0) => {
      if (buffer.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('bytes');
      }
      const [lengthBigInt, lengthOffset] = size.deserialize(buffer, offset);
      const length = Number(lengthBigInt);
      offset = lengthOffset;
      const contentBuffer = buffer.slice(offset, offset + length);
      if (contentBuffer.length < length) {
        throw new NotEnoughBytesError('bytes', length, contentBuffer.length);
      }
      const [value, contentOffset] = byteSerializer.deserialize(contentBuffer);
      offset += contentOffset;
      return [value, offset];
    },
  };
}
