import {
  Serializer as _Serializer,
  NumberSerializer as _NumberSerializer,
  WrapInSerializer as _WrapInSerializer,
  mapSerializer as _mapSerializer,
  fixSerializer as _fixSerializer,
  reverseSerializer as _reverseSerializer,
  mergeBytes as _mergeBytes,
  padBytes as _padBytes,
  fixBytes as _fixBytes,
  utf8 as _utf8,
  baseX as _baseX,
  base10 as _base10,
  base58 as _base58,
  base64 as _base64,
  base16 as _base16,
  bitArray as _bitArray,
  removeNullCharacters as _removeNullCharacters,
  padNullCharacters as _padNullCharacters,
  StructToSerializerTuple as _StructToSerializerTuple,
  DataEnumToSerializerTuple as _DataEnumToSerializerTuple,
  Endian as _Endian,
  ArrayLikeSerializerSize as _ArrayLikeSerializerSize,
  BaseSerializerOptions as _BaseSerializerOptions,
  TupleSerializerOptions as _TupleSerializerOptions,
  ArraySerializerOptions as _ArraySerializerOptions,
  MapSerializerOptions as _MapSerializerOptions,
  SetSerializerOptions as _SetSerializerOptions,
  OptionSerializerOptions as _OptionSerializerOptions,
  NullableSerializerOptions as _NullableSerializerOptions,
  StructSerializerOptions as _StructSerializerOptions,
  ScalarEnumSerializerOptions as _ScalarEnumSerializerOptions,
  DataEnumSerializerOptions as _DataEnumSerializerOptions,
  StringSerializerOptions as _StringSerializerOptions,
  BoolSerializerOptions as _BoolSerializerOptions,
  UnitSerializerOptions as _UnitSerializerOptions,
  SingleByteNumberSerializerOptions as _SingleByteNumberSerializerOptions,
  NumberSerializerOptions as _NumberSerializerOptions,
  BytesSerializerOptions as _BytesSerializerOptions,
  PublicKeySerializerOptions as _PublicKeySerializerOptions,
  ScalarEnum as _ScalarEnum,
  DataEnum as _DataEnum,
  GetDataEnumKind as _GetDataEnumKind,
  GetDataEnumKindContent as _GetDataEnumKindContent,
} from '@metaplex-foundation/umi-serializers';

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type Serializer<From, To extends From = From> = _Serializer<From, To>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type NumberSerializer = _NumberSerializer;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type WrapInSerializer<From, To extends From = From> = _WrapInSerializer<
  From,
  To
>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const mapSerializer = _mapSerializer;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const fixSerializer = _fixSerializer;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const reverseSerializer = _reverseSerializer;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const mergeBytes = _mergeBytes;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const padBytes = _padBytes;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const fixBytes = _fixBytes;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const utf8 = _utf8;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const baseX = _baseX;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const base10 = _base10;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const base58 = _base58;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const base64 = _base64;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const base16 = _base16;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const bitArray = _bitArray;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const removeNullCharacters = _removeNullCharacters;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const padNullCharacters = _padNullCharacters;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type StructToSerializerTuple<
  T extends object,
  U extends T
> = _StructToSerializerTuple<T, U>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type DataEnumToSerializerTuple<
  T extends _DataEnum,
  U extends T
> = _DataEnumToSerializerTuple<T, U>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export const Endian = _Endian;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type ArrayLikeSerializerSize = _ArrayLikeSerializerSize;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type BaseSerializerOptions = _BaseSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type TupleSerializerOptions = _TupleSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type ArraySerializerOptions = _ArraySerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type MapSerializerOptions = _MapSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type SetSerializerOptions = _SetSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type OptionSerializerOptions = _OptionSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type NullableSerializerOptions = _NullableSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type StructSerializerOptions = _StructSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type EnumSerializerOptions = _ScalarEnumSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type DataEnumSerializerOptions = _DataEnumSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type StringSerializerOptions = _StringSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type BoolSerializerOptions = _BoolSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type UnitSerializerOptions = _UnitSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type SingleByteNumberSerializerOptions =
  _SingleByteNumberSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type NumberSerializerOptions = _NumberSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type BytesSerializerOptions = _BytesSerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type PublicKeySerializerOptions = _PublicKeySerializerOptions;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type ScalarEnum<T> = _ScalarEnum<T>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type DataEnum = _DataEnum;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type GetDataEnumKind<
  T extends _DataEnum,
  K extends T['__kind']
> = _GetDataEnumKind<T, K>;

/** @deprecated import from "@metaplex-foundation/umi/serializers" instead. */
export type GetDataEnumKindContent<
  T extends _DataEnum,
  K extends T['__kind']
> = _GetDataEnumKindContent<T, K>;
