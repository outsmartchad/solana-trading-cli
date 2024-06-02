import { ExpectedFixedSizeSerializerError } from '@metaplex-foundation/umi-serializers-core';
import { ArrayLikeSerializerSize } from './arrayLikeSerializerSize';
import {
  InvalidArrayLikeRemainderSizeError,
  UnrecognizedArrayLikeSerializerSizeError,
} from './errors';
import { sumSerializerSizes } from './sumSerializerSizes';

export function getResolvedSize(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[],
  bytes: Uint8Array,
  offset: number
): [number | bigint, number] {
  if (typeof size === 'number') {
    return [size, offset];
  }

  if (typeof size === 'object') {
    return size.deserialize(bytes, offset);
  }

  if (size === 'remainder') {
    const childrenSize = sumSerializerSizes(childrenSizes);
    if (childrenSize === null) {
      throw new ExpectedFixedSizeSerializerError(
        'Serializers of "remainder" size must have fixed-size items.'
      );
    }
    const remainder = bytes.slice(offset).length;
    if (remainder % childrenSize !== 0) {
      throw new InvalidArrayLikeRemainderSizeError(remainder, childrenSize);
    }
    return [remainder / childrenSize, offset];
  }

  throw new UnrecognizedArrayLikeSerializerSizeError(size);
}

export function getSizeDescription(
  size: ArrayLikeSerializerSize | string
): string {
  return typeof size === 'object' ? size.description : `${size}`;
}

export function getSizeFromChildren(
  size: ArrayLikeSerializerSize,
  childrenSizes: (number | null)[]
): number | null {
  if (typeof size !== 'number') return null;
  if (size === 0) return 0;
  const childrenSize = sumSerializerSizes(childrenSizes);
  return childrenSize === null ? null : childrenSize * size;
}

export function getSizePrefix(
  size: ArrayLikeSerializerSize,
  realSize: number
): Uint8Array {
  return typeof size === 'object' ? size.serialize(realSize) : new Uint8Array();
}
