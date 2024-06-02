import type { NumberSerializer } from '@metaplex-foundation/umi-serializers-numbers';
import { ArrayLikeSerializerSize } from './arrayLikeSerializerSize';
import { UnrecognizedArrayLikeSerializerSizeError } from './errors';
import { sumSerializerSizes } from './sumSerializerSizes';

export function getResolvedSize(
  size: number | NumberSerializer,
  bytes: Uint8Array,
  offset: number
): [number | bigint, number] {
  if (typeof size === 'number') {
    return [size, offset];
  }

  if (typeof size === 'object') {
    return size.deserialize(bytes, offset);
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
