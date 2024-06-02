import {
  BaseSerializerOptions,
  DeserializingEmptyBufferError,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import {
  NumberSerializer,
  u8,
} from '@metaplex-foundation/umi-serializers-numbers';
import {
  EnumDiscriminatorOutOfRangeError,
  InvalidScalarEnumVariantError,
} from './errors';

/**
 * Defines a scalar enum as a type from its constructor.
 *
 * @example
 * ```ts
 * enum Direction { Left, Right };
 * type DirectionType = ScalarEnum<Direction>;
 * ```
 *
 * @category Serializers
 */
export type ScalarEnum<T> =
  | { [key: number | string]: string | number | T }
  | number
  | T;

/**
 * Defines the options for scalar enum serializers.
 * @category Serializers
 */
export type ScalarEnumSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the enum discriminator.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Creates a scalar enum serializer.
 *
 * @param constructor - The constructor of the scalar enum.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function scalarEnum<T>(
  constructor: ScalarEnum<T> & {},
  options: ScalarEnumSerializerOptions = {}
): Serializer<T> {
  const prefix = options.size ?? u8();
  const enumKeys = Object.keys(constructor);
  const enumValues = Object.values(constructor);
  const isNumericEnum = enumValues.some((v) => typeof v === 'number');
  const valueDescriptions = enumValues
    .filter((v) => typeof v === 'string')
    .join(', ');
  const minRange = 0;
  const maxRange = isNumericEnum
    ? enumValues.length / 2 - 1
    : enumValues.length - 1;
  const stringValues: string[] = isNumericEnum
    ? [...enumKeys]
    : [...new Set([...enumKeys, ...enumValues])];
  function assertValidVariant(variant: number | string): void {
    const isInvalidNumber =
      typeof variant === 'number' && (variant < minRange || variant > maxRange);
    const isInvalidString =
      typeof variant === 'string' && !stringValues.includes(variant);
    if (isInvalidNumber || isInvalidString) {
      throw new InvalidScalarEnumVariantError(
        variant,
        stringValues,
        minRange,
        maxRange
      );
    }
  }
  return {
    description:
      options.description ??
      `enum(${valueDescriptions}; ${prefix.description})`,
    fixedSize: prefix.fixedSize,
    maxSize: prefix.maxSize,
    serialize: (value: T) => {
      assertValidVariant(value as string | number);
      if (typeof value === 'number') return prefix.serialize(value);
      const valueIndex = enumValues.indexOf(value);
      if (valueIndex >= 0) return prefix.serialize(valueIndex);
      return prefix.serialize(enumKeys.indexOf(value as string));
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('enum');
      }
      const [value, newOffset] = prefix.deserialize(bytes, offset);
      const valueAsNumber = Number(value);
      offset = newOffset;
      if (valueAsNumber < minRange || valueAsNumber > maxRange) {
        throw new EnumDiscriminatorOutOfRangeError(
          valueAsNumber,
          minRange,
          maxRange
        );
      }
      return [
        (isNumericEnum ? valueAsNumber : enumValues[valueAsNumber]) as T,
        offset,
      ];
    },
  };
}
