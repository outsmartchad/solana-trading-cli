import { SerializerInterface } from '@metaplex-foundation/umi';
import {
  array,
  bool,
  bytes,
  dataEnum,
  f32,
  f64,
  i128,
  i16,
  i32,
  i64,
  i8,
  map,
  nullable,
  option,
  publicKey,
  scalarEnum,
  set,
  string,
  struct,
  tuple,
  u128,
  u16,
  u32,
  u64,
  u8,
  unit,
} from '@metaplex-foundation/umi/serializers';

export type DataViewSerializerOptions = {};

export function createDataViewSerializer(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: DataViewSerializerOptions = {}
): SerializerInterface {
  return {
    tuple,
    array,
    map,
    set,
    option,
    nullable,
    struct,
    enum: scalarEnum,
    dataEnum,
    string,
    bool,
    unit,
    u8,
    u16,
    u32,
    u64,
    u128,
    i8,
    i16,
    i32,
    i64,
    i128,
    f32,
    f64,
    bytes,
    publicKey,
  };
}
