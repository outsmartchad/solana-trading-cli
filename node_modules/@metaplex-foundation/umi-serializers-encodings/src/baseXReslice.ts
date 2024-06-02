/* eslint-disable no-restricted-syntax */
/* eslint-disable no-bitwise */
import type { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { InvalidBaseStringError } from './errors';

/**
 * A string serializer that reslices bytes into custom chunks
 * of bits that are then mapped to a custom alphabet.
 *
 * This can be used to create serializers whose alphabet
 * is a power of 2 such as base16 or base64.
 *
 * @category Serializers
 */
export const baseXReslice = (
  alphabet: string,
  bits: number
): Serializer<string> => {
  const base = alphabet.length;
  const reslice = (
    input: number[],
    inputBits: number,
    outputBits: number,
    useRemainder: boolean
  ): number[] => {
    const output = [];
    let accumulator = 0;
    let bitsInAccumulator = 0;
    const mask = (1 << outputBits) - 1;
    for (const value of input) {
      accumulator = (accumulator << inputBits) | value;
      bitsInAccumulator += inputBits;
      while (bitsInAccumulator >= outputBits) {
        bitsInAccumulator -= outputBits;
        output.push((accumulator >> bitsInAccumulator) & mask);
      }
    }
    if (useRemainder && bitsInAccumulator > 0) {
      output.push((accumulator << (outputBits - bitsInAccumulator)) & mask);
    }
    return output;
  };

  return {
    description: `base${base}`,
    fixedSize: null,
    maxSize: null,
    serialize(value: string): Uint8Array {
      // Check if the value is valid.
      if (!value.match(new RegExp(`^[${alphabet}]*$`))) {
        throw new InvalidBaseStringError(value, base);
      }
      if (value === '') return new Uint8Array();
      const charIndices = [...value].map((c) => alphabet.indexOf(c));
      const bytes = reslice(charIndices, bits, 8, false);
      return Uint8Array.from(bytes);
    },
    deserialize(buffer, offset = 0): [string, number] {
      if (buffer.length === 0) return ['', 0];
      const bytes = [...buffer.slice(offset)];
      const charIndices = reslice(bytes, 8, bits, true);
      return [charIndices.map((i) => alphabet[i]).join(''), buffer.length];
    },
  };
};
