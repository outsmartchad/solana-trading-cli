import {
  BaseSerializerOptions,
  DeserializingEmptyBufferError,
  Serializer,
  mergeBytes,
} from '@metaplex-foundation/umi-serializers-core';
import {
  NumberSerializer,
  u8,
} from '@metaplex-foundation/umi-serializers-numbers';
import {
  EnumDiscriminatorOutOfRangeError,
  InvalidDataEnumVariantError,
} from './errors';
import { maxSerializerSizes } from './maxSerializerSizes';
import { sumSerializerSizes } from './sumSerializerSizes';

/**
 * Defines a data enum using discriminated union types.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * ```
 *
 * @category Serializers
 */
export type DataEnum = { __kind: string };

/**
 * Extracts a variant from a data enum.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * type ClickEvent = GetDataEnumKind<WebPageEvent, 'click'>;
 * // -> { __kind: 'click', x: number, y: number }
 * ```
 *
 * @category Serializers
 */
export type GetDataEnumKind<
  T extends DataEnum,
  K extends T['__kind']
> = Extract<T, { __kind: K }>;

/**
 * Extracts a variant from a data enum without its discriminator.
 *
 * @example
 * ```ts
 * type WebPageEvent =
 *   | { __kind: 'pageview', url: string }
 *   | { __kind: 'click', x: number, y: number };
 * type ClickEvent = GetDataEnumKindContent<WebPageEvent, 'click'>;
 * // -> { x: number, y: number }
 * ```
 *
 * @category Serializers
 */
export type GetDataEnumKindContent<
  T extends DataEnum,
  K extends T['__kind']
> = Omit<Extract<T, { __kind: K }>, '__kind'>;

/**
 * Get the name and serializer of each variant in a data enum.
 * @category Serializers
 */
export type DataEnumToSerializerTuple<T extends DataEnum, U extends T> = Array<
  T extends any
    ? [
        T['__kind'],
        keyof Omit<T, '__kind'> extends never
          ? Serializer<Omit<T, '__kind'>, Omit<U, '__kind'>> | Serializer<void>
          : Serializer<Omit<T, '__kind'>, Omit<U, '__kind'>>
      ]
    : never
>;

/**
 * Defines the options for data enum serializers.
 * @category Serializers
 */
export type DataEnumSerializerOptions = BaseSerializerOptions & {
  /**
   * The serializer to use for the enum discriminator prefixing the variant.
   * @defaultValue `u8()`
   */
  size?: NumberSerializer;
};

/**
 * Creates a data enum serializer.
 *
 * @param variants - The variant serializers of the data enum.
 * @param options - A set of options for the serializer.
 * @category Serializers
 */
export function dataEnum<T extends DataEnum, U extends T = T>(
  variants: DataEnumToSerializerTuple<T, U>,
  options: DataEnumSerializerOptions = {}
): Serializer<T, U> {
  const prefix = options.size ?? u8();
  const fieldDescriptions = variants
    .map(
      ([name, serializer]) =>
        `${String(name)}${serializer ? `: ${serializer.description}` : ''}`
    )
    .join(', ');
  const allVariantHaveTheSameFixedSize = variants.every(
    (one, i, all) => one[1].fixedSize === all[0][1].fixedSize
  );
  const fixedVariantSize = allVariantHaveTheSameFixedSize
    ? variants[0][1].fixedSize
    : null;
  const maxVariantSize = maxSerializerSizes(
    variants.map(([, field]) => field.maxSize)
  );
  return {
    description:
      options.description ??
      `dataEnum(${fieldDescriptions}; ${prefix.description})`,
    fixedSize:
      variants.length === 0
        ? prefix.fixedSize
        : sumSerializerSizes([prefix.fixedSize, fixedVariantSize]),
    maxSize:
      variants.length === 0
        ? prefix.maxSize
        : sumSerializerSizes([prefix.maxSize, maxVariantSize]),
    serialize: (variant: T) => {
      const discriminator = variants.findIndex(
        ([key]) => variant.__kind === key
      );
      if (discriminator < 0) {
        throw new InvalidDataEnumVariantError(
          variant.__kind,
          variants.map(([key]) => key)
        );
      }
      const variantPrefix = prefix.serialize(discriminator);
      const variantSerializer = variants[discriminator][1];
      const variantBytes = variantSerializer.serialize(variant as any);
      return mergeBytes([variantPrefix, variantBytes]);
    },
    deserialize: (bytes: Uint8Array, offset = 0) => {
      if (bytes.slice(offset).length === 0) {
        throw new DeserializingEmptyBufferError('dataEnum');
      }
      const [discriminator, dOffset] = prefix.deserialize(bytes, offset);
      offset = dOffset;
      const variantField = variants[Number(discriminator)] ?? null;
      if (!variantField) {
        throw new EnumDiscriminatorOutOfRangeError(
          discriminator,
          0,
          variants.length - 1
        );
      }
      const [variant, vOffset] = variantField[1].deserialize(bytes, offset);
      offset = vOffset;
      return [{ __kind: variantField[0], ...(variant ?? {}) } as U, offset];
    },
  };
}
