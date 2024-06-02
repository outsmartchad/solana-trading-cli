import { Buffer } from 'buffer';

export type FeatureFlags = boolean[];

/**
 * Serializes an array of boolean into a Buffer. The `byteSize` parameter
 * can be used to create a fixed-size Buffer, otherwise the Buffer will
 * have the minimum amount of bytes required to store the boolean array.
 *
 * Returns a Buffer whose bits are ordered from left to right, unless
 * `backward` is set to true, in which case the bits are ordered from
 * right to left.
 */
export const serializeFeatureFlags = (
  features: FeatureFlags,
  byteSize?: number,
  backward = false
): Buffer => {
  byteSize = byteSize ?? Math.ceil(features.length / 8);
  const bytes: number[] = [];

  for (let i = 0; i < byteSize; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const feature = Number(features[i * 8 + j] ?? 0);
      byte |= feature << (backward ? j : 7 - j);
    }
    if (backward) {
      bytes.unshift(byte);
    } else {
      bytes.push(byte);
    }
  }

  return Buffer.from(bytes);
};

/**
 * Parses a Buffer into an array of booleans using the
 * bits of the buffer. The number of flags can be provided
 * to determine how many booleans to return.
 *
 * Expects the bits in the Buffer to be ordered from left to right,
 * unless `backward` is set to true, we expect the bits to be
 * ordered from right to left.
 */
export const deserializeFeatureFlags = (
  buffer: Buffer,
  numberOfFlags?: number,
  backward = false
): FeatureFlags => {
  const booleans: boolean[] = [];
  buffer = backward ? buffer.reverse() : buffer;

  for (let byte of buffer) {
    for (let i = 0; i < 8; i++) {
      if (backward) {
        booleans.push(Boolean(byte & 1));
        byte >>= 1;
      } else {
        booleans.push(Boolean(byte & 0b1000_0000));
        byte <<= 1;
      }
    }
  }

  return booleans.slice(0, numberOfFlags);
};
