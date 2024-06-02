import {
  BaseSerializerOptions,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';

/**
 * Defines a serializer for numbers and bigints.
 * @category Serializers
 */
export type NumberSerializer =
  | Serializer<number>
  | Serializer<number | bigint, bigint>;

/**
 * Defines the options for u8 and i8 serializers.
 * @category Serializers
 */
export type SingleByteNumberSerializerOptions = BaseSerializerOptions;

/**
 * Defines the options for number serializers that use more than one byte.
 * @category Serializers
 */
export type NumberSerializerOptions = BaseSerializerOptions & {
  /**
   * Whether the serializer should use little-endian or big-endian encoding.
   * @defaultValue `Endian.Little`
   */
  endian?: Endian;
};

/**
 * Defines the endianness of a number serializer.
 * @category Serializers
 */
export enum Endian {
  Little = 'le',
  Big = 'be',
}
