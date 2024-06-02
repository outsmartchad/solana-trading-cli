/**
 * An object that can serialize and deserialize a value to and from a `Uint8Array`.
 * It supports serializing looser types than it deserializes for convenience.
 * For example, a `bigint` serializer will always deserialize to a `bigint`
 * but can be used to serialize a `number`.
 *
 * @typeParam From - The type of the value to serialize.
 * @typeParam To - The type of the deserialized value. Defaults to `From`.
 *
 * @category Serializers
 */
export type Serializer<From, To extends From = From> = {
  /** A description for the serializer. */
  description: string;
  /** The fixed size of the serialized value in bytes, or `null` if it is variable. */
  fixedSize: number | null;
  /** The maximum size a serialized value can be in bytes, or `null` if it is variable. */
  maxSize: number | null;
  /** The function that serializes a value into bytes. */
  serialize: (value: From) => Uint8Array;
  /**
   * The function that deserializes a value from bytes.
   * It returns the deserialized value and the number of bytes read.
   */
  deserialize: (buffer: Uint8Array, offset?: number) => [To, number];
};

/**
 * Defines common options for serializer factories.
 * @category Serializers
 */
export type BaseSerializerOptions = {
  /** A custom description for the serializer. */
  description?: string;
};

/**
 * Wraps all the attributes of an object in serializers.
 * @category Serializers
 */
export type WrapInSerializer<T, U extends T = T> = {
  [P in keyof T]: Serializer<T[P], U[P]>;
};
