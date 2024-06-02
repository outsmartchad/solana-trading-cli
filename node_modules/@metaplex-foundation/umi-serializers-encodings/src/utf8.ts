import type { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { removeNullCharacters } from './nullCharacters';

/**
 * A string serializer that uses UTF-8 encoding
 * using the native `TextEncoder` API.
 * @category Serializers
 */
export const utf8: Serializer<string> = {
  description: 'utf8',
  fixedSize: null,
  maxSize: null,
  serialize(value: string) {
    return new TextEncoder().encode(value);
  },
  deserialize(buffer, offset = 0) {
    const value = new TextDecoder().decode(buffer.slice(offset));
    return [removeNullCharacters(value), buffer.length];
  },
};
