/* eslint-disable no-bitwise */
import {
  BaseSerializerOptions,
  NotEnoughBytesError,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';

/**
 * Defines the options for bitArray serializers.
 * @category Serializers
 */
export type BitArraySerializerOptions = BaseSerializerOptions & {
  /**
   * Whether to read the bits in reverse order.
   * @defaultValue `false`
   */
  backward?: boolean;
};

/**
 * An array of boolean serializer that
 * converts booleans to bits and vice versa.
 *
 * @param size - The amount of bytes to use for the bit array.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export const bitArray = (
  size: number,
  options: BitArraySerializerOptions | boolean = {}
): Serializer<boolean[]> => {
  const parsedOptions: BitArraySerializerOptions =
    typeof options === 'boolean' ? { backward: options } : options;
  const backward = parsedOptions.backward ?? false;
  const backwardSuffix = backward ? '; backward' : '';
  return {
    description:
      parsedOptions.description ?? `bitArray(${size}${backwardSuffix})`,
    fixedSize: size,
    maxSize: size,
    serialize(value: boolean[]) {
      const bytes: number[] = [];

      for (let i = 0; i < size; i += 1) {
        let byte = 0;
        for (let j = 0; j < 8; j += 1) {
          const feature = Number(value[i * 8 + j] ?? 0);
          byte |= feature << (backward ? j : 7 - j);
        }
        if (backward) {
          bytes.unshift(byte);
        } else {
          bytes.push(byte);
        }
      }

      return new Uint8Array(bytes);
    },
    deserialize(bytes, offset = 0) {
      const booleans: boolean[] = [];
      let slice = bytes.slice(offset, offset + size);
      slice = backward ? slice.reverse() : slice;
      if (slice.length !== size) {
        throw new NotEnoughBytesError('bitArray', size, slice.length);
      }

      slice.forEach((byte) => {
        for (let i = 0; i < 8; i += 1) {
          if (backward) {
            booleans.push(Boolean(byte & 1));
            byte >>= 1;
          } else {
            booleans.push(Boolean(byte & 0b1000_0000));
            byte <<= 1;
          }
        }
      });

      return [booleans, offset + size];
    },
  };
};
