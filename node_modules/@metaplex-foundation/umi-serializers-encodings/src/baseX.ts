import type { Serializer } from '@metaplex-foundation/umi-serializers-core';
import { InvalidBaseStringError } from './errors';

/**
 * A string serializer that requires a custom alphabet and uses
 * the length of that alphabet as the base. It then divides
 * the input by the base as many times as necessary to get
 * the output. It also supports leading zeroes by using the
 * first character of the alphabet as the zero character.
 *
 * This can be used to create serializers such as base10 or base58.
 *
 * @category Serializers
 */
export const baseX = (alphabet: string): Serializer<string> => {
  const base = alphabet.length;
  const baseBigInt = BigInt(base);
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

      // Handle leading zeroes.
      const chars = [...value];
      let trailIndex = chars.findIndex((c) => c !== alphabet[0]);
      trailIndex = trailIndex === -1 ? chars.length : trailIndex;
      const leadingZeroes = Array(trailIndex).fill(0);
      if (trailIndex === chars.length) return Uint8Array.from(leadingZeroes);

      // From baseX to base10.
      const tailChars = chars.slice(trailIndex);
      let base10Number = 0n;
      let baseXPower = 1n;
      for (let i = tailChars.length - 1; i >= 0; i -= 1) {
        base10Number += baseXPower * BigInt(alphabet.indexOf(tailChars[i]));
        baseXPower *= baseBigInt;
      }

      // From base10 to bytes.
      const tailBytes = [];
      while (base10Number > 0n) {
        tailBytes.unshift(Number(base10Number % 256n));
        base10Number /= 256n;
      }
      return Uint8Array.from(leadingZeroes.concat(tailBytes));
    },
    deserialize(buffer, offset = 0): [string, number] {
      if (buffer.length === 0) return ['', 0];

      // Handle leading zeroes.
      const bytes = buffer.slice(offset);
      let trailIndex = bytes.findIndex((n) => n !== 0);
      trailIndex = trailIndex === -1 ? bytes.length : trailIndex;
      const leadingZeroes = alphabet[0].repeat(trailIndex);
      if (trailIndex === bytes.length) return [leadingZeroes, buffer.length];

      // From bytes to base10.
      let base10Number = bytes
        .slice(trailIndex)
        .reduce((sum, byte) => sum * 256n + BigInt(byte), 0n);

      // From base10 to baseX.
      const tailChars = [];
      while (base10Number > 0n) {
        tailChars.unshift(alphabet[Number(base10Number % baseBigInt)]);
        base10Number /= baseBigInt;
      }

      return [leadingZeroes + tailChars.join(''), buffer.length];
    },
  };
};
