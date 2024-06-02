import {
  DeserializingEmptyBufferError,
  NotEnoughBytesError,
  Serializer,
} from '@metaplex-foundation/umi-serializers-core';
import {
  Endian,
  NumberSerializer,
  NumberSerializerOptions,
  SingleByteNumberSerializerOptions,
} from './common';
import { NumberOutOfRangeError } from './errors';

export function numberFactory(input: {
  name: string;
  size: number;
  range?: [number | bigint, number | bigint];
  set: (view: DataView, value: number | bigint, littleEndian?: boolean) => void;
  get: (view: DataView, littleEndian?: boolean) => number;
  options: SingleByteNumberSerializerOptions | NumberSerializerOptions;
}): Serializer<number>;
export function numberFactory(input: {
  name: string;
  size: number;
  range?: [number | bigint, number | bigint];
  set: (view: DataView, value: number | bigint, littleEndian?: boolean) => void;
  get: (view: DataView, littleEndian?: boolean) => bigint;
  options: SingleByteNumberSerializerOptions | NumberSerializerOptions;
}): Serializer<number | bigint, bigint>;
export function numberFactory(input: {
  name: string;
  size: number;
  range?: [number | bigint, number | bigint];
  set: (view: DataView, value: number | bigint, littleEndian?: boolean) => void;
  get: (view: DataView, littleEndian?: boolean) => number | bigint;
  options: SingleByteNumberSerializerOptions | NumberSerializerOptions;
}): NumberSerializer {
  let littleEndian: boolean | undefined;
  let defaultDescription: string = input.name;

  if (input.size > 1) {
    littleEndian =
      !('endian' in input.options) || input.options.endian === Endian.Little;
    defaultDescription += littleEndian ? '(le)' : '(be)';
  }

  return {
    description: input.options.description ?? defaultDescription,
    fixedSize: input.size,
    maxSize: input.size,
    serialize(value: number | bigint): Uint8Array {
      if (input.range) {
        assertRange(input.name, input.range[0], input.range[1], value);
      }
      const buffer = new ArrayBuffer(input.size);
      input.set(new DataView(buffer), value, littleEndian);
      return new Uint8Array(buffer);
    },
    deserialize(bytes, offset = 0): [number | bigint, number] {
      const slice = bytes.slice(offset, offset + input.size);
      assertEnoughBytes('i8', slice, input.size);
      const view = toDataView(slice);
      return [input.get(view, littleEndian), offset + input.size];
    },
  } as NumberSerializer;
}

/**
 * Helper function to ensure that the array buffer is converted properly from a uint8array
 * Source: https://stackoverflow.com/questions/37228285/uint8array-to-arraybuffer
 * @param {Uint8Array} array Uint8array that's being converted into an array buffer
 * @returns {ArrayBuffer} An array buffer that's necessary to construct a data view
 */
export const toArrayBuffer = (array: Uint8Array): ArrayBuffer =>
  array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);

export const toDataView = (array: Uint8Array): DataView =>
  new DataView(toArrayBuffer(array));

export const assertRange = (
  serializer: string,
  min: number | bigint,
  max: number | bigint,
  value: number | bigint
) => {
  if (value < min || value > max) {
    throw new NumberOutOfRangeError(serializer, min, max, value);
  }
};

export const assertEnoughBytes = (
  serializer: string,
  bytes: Uint8Array,
  expected: number
) => {
  if (bytes.length === 0) {
    throw new DeserializingEmptyBufferError(serializer);
  }
  if (bytes.length < expected) {
    throw new NotEnoughBytesError(serializer, expected, bytes.length);
  }
};
