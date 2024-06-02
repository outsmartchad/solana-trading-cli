import { mergeBytes } from './bytes';
import { Serializer } from './common';
import { ExpectedFixedSizeSerializerError } from './errors';

/**
 * Reverses the bytes of a fixed-size serializer.
 * @category Serializers
 */
export function reverseSerializer<T, U extends T = T>(
  serializer: Serializer<T, U>
): Serializer<T, U> {
  if (serializer.fixedSize === null) {
    throw new ExpectedFixedSizeSerializerError(
      'Cannot reverse a serializer of variable size.'
    );
  }
  return {
    ...serializer,
    serialize: (value: T) => serializer.serialize(value).reverse(),
    deserialize: (bytes: Uint8Array, offset = 0) => {
      const fixedSize = serializer.fixedSize as number;
      const newBytes = mergeBytes([
        bytes.slice(0, offset),
        bytes.slice(offset, offset + fixedSize).reverse(),
        bytes.slice(offset + fixedSize),
      ]);
      return serializer.deserialize(newBytes, offset);
    },
  };
}
