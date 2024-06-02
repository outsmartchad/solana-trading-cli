import type { Nullable, Option } from '@metaplex-foundation/umi-options';
import type {
  PublicKey,
  PublicKeyInput,
} from '@metaplex-foundation/umi-public-keys';
import type {
  ArraySerializerOptions,
  BoolSerializerOptions,
  BytesSerializerOptions,
  DataEnumSerializerOptions,
  DataEnumToSerializerTuple,
  MapSerializerOptions,
  NullableSerializerOptions,
  NumberSerializerOptions,
  OptionSerializerOptions,
  PublicKeySerializerOptions,
  ScalarEnumSerializerOptions,
  Serializer,
  SetSerializerOptions,
  SingleByteNumberSerializerOptions,
  StringSerializerOptions,
  StructSerializerOptions,
  StructToSerializerTuple,
  TupleSerializerOptions,
  UnitSerializerOptions,
  WrapInSerializer,
} from '@metaplex-foundation/umi-serializers';
import { DataEnum, ScalarEnum } from './Enums';
import { InterfaceImplementationMissingError } from './errors';

/**
 * Defines the interface for a set of serializers
 * that can be used to serialize/deserialize any Serde types.
 *
 * @category Context and Interfaces
 * @deprecated This interface is deprecated.
 * You can now directly use `@metaplex-foundation/umi/serializers` instead.
 */
export interface SerializerInterface {
  /**
   * Creates a serializer for a tuple-like array.
   *
   * @param items - The serializers to use for each item in the tuple.
   * @param options - A set of options for the serializer.
   */
  tuple: <T extends any[], U extends T = T>(
    items: WrapInSerializer<[...T], [...U]>,
    options?: TupleSerializerOptions
  ) => Serializer<T, U>;

  /**
   * Creates a serializer for an array of items.
   *
   * @param item - The serializer to use for the array's items.
   * @param options - A set of options for the serializer.
   */
  array: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: ArraySerializerOptions
  ) => Serializer<T[], U[]>;

  /**
   * Creates a serializer for a map.
   *
   * @param key - The serializer to use for the map's keys.
   * @param value - The serializer to use for the map's values.
   * @param options - A set of options for the serializer.
   */
  map: <TK, TV, UK extends TK = TK, UV extends TV = TV>(
    key: Serializer<TK, UK>,
    value: Serializer<TV, UV>,
    options?: MapSerializerOptions
  ) => Serializer<Map<TK, TV>, Map<UK, UV>>;

  /**
   * Creates a serializer for a set.
   *
   * @param item - The serializer to use for the set's items.
   * @param options - A set of options for the serializer.
   */
  set: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: SetSerializerOptions
  ) => Serializer<Set<T>, Set<U>>;

  /**
   * Creates a serializer for an optional value using the {@link Option} type.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param options - A set of options for the serializer.
   */
  option: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: OptionSerializerOptions
  ) => Serializer<Option<T> | Nullable<T>, Option<U>>;

  /**
   * Creates a serializer for an optional value using `null` as the `None` value.
   *
   * @param item - The serializer to use for the value that may be present.
   * @param options - A set of options for the serializer.
   */
  nullable: <T, U extends T = T>(
    item: Serializer<T, U>,
    options?: NullableSerializerOptions
  ) => Serializer<Nullable<T>, Nullable<U>>;

  /**
   * Creates a serializer for a custom object.
   *
   * @param fields - The name and serializer of each field.
   * @param options - A set of options for the serializer.
   */
  struct: <T extends object, U extends T = T>(
    fields: StructToSerializerTuple<T, U>,
    options?: StructSerializerOptions
  ) => Serializer<T, U>;

  /**
   * Creates a scalar enum serializer.
   *
   * @param constructor - The constructor of the scalar enum.
   * @param options - A set of options for the serializer.
   */
  enum<T>(
    constructor: ScalarEnum<T> & {},
    options?: ScalarEnumSerializerOptions
  ): Serializer<T>;

  /**
   * Creates a data enum serializer.
   *
   * @param variants - The variant serializers of the data enum.
   * @param options - A set of options for the serializer.
   */
  dataEnum<T extends DataEnum, U extends T = T>(
    variants: DataEnumToSerializerTuple<T, U>,
    options?: DataEnumSerializerOptions
  ): Serializer<T, U>;

  /**
   * Creates a string serializer.
   *
   * @param options - A set of options for the serializer.
   */
  string: (options?: StringSerializerOptions) => Serializer<string>;

  /**
   * Creates a boolean serializer.
   *
   * @param options - A set of options for the serializer.
   */
  bool: (options?: BoolSerializerOptions) => Serializer<boolean>;

  /**
   * Creates a void serializer.
   *
   * @param options - A set of options for the serializer.
   */
  unit: (options?: UnitSerializerOptions) => Serializer<void>;

  /**
   * Creates a serializer for 1-byte unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u8: (options?: SingleByteNumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 2-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u16: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 4-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u64: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 16-bytes unsigned integers.
   *
   * @param options - A set of options for the serializer.
   */
  u128: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 1-byte signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i8: (options?: SingleByteNumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 2-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i16: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 4-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i64: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 16-bytes signed integers.
   *
   * @param options - A set of options for the serializer.
   */
  i128: (
    options?: NumberSerializerOptions
  ) => Serializer<number | bigint, bigint>;

  /**
   * Creates a serializer for 4-bytes floating point numbers.
   *
   * @param options - A set of options for the serializer.
   */
  f32: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer for 8-bytes floating point numbers.
   *
   * @param options - A set of options for the serializer.
   */
  f64: (options?: NumberSerializerOptions) => Serializer<number>;

  /**
   * Creates a serializer that passes the buffer as-is.
   *
   * @param options - A set of options for the serializer.
   */
  bytes: (options?: BytesSerializerOptions) => Serializer<Uint8Array>;

  /**
   * Creates a serializer for 32-bytes public keys.
   *
   * @param options - A set of options for the serializer.
   */
  publicKey: (
    options?: PublicKeySerializerOptions
  ) => Serializer<PublicKey | PublicKeyInput, PublicKey>;
}

/**
 * An implementation of the {@link SerializerInterface} that throws an error when called.
 * @category Serializers
 */
export function createNullSerializer(): SerializerInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError(
      'SerializerInterface',
      'serializer'
    );
  };
  return {
    tuple: errorHandler,
    array: errorHandler,
    map: errorHandler,
    set: errorHandler,
    option: errorHandler,
    nullable: errorHandler,
    struct: errorHandler,
    enum: errorHandler,
    dataEnum: errorHandler,
    string: errorHandler,
    bool: errorHandler,
    unit: errorHandler,
    u8: errorHandler,
    u16: errorHandler,
    u32: errorHandler,
    u64: errorHandler,
    u128: errorHandler,
    i8: errorHandler,
    i16: errorHandler,
    i32: errorHandler,
    i64: errorHandler,
    i128: errorHandler,
    f32: errorHandler,
    f64: errorHandler,
    bytes: errorHandler,
    publicKey: errorHandler,
  };
}
