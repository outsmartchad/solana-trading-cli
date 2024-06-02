import { Buffer } from 'buffer';
import type { Beet } from '@metaplex-foundation/beet';
import * as beet from '@metaplex-foundation/beet';
import {
  FailedToDeserializeDataError,
  FailedToSerializeDataError,
  UnexpectedAccountError,
} from '../errors';
import {
  Account,
  MaybeAccount,
  UnparsedAccount,
  UnparsedMaybeAccount,
} from './Account';

export type Serializer<T> = {
  description: string;
  serialize: (value: T) => Buffer;
  deserialize: (buffer: Buffer, offset?: number) => [T, number];
};

export const mapSerializer = <T, U>(
  serializer: Serializer<T>,
  map: (value: T) => U,
  unmap: (value: U) => T
): Serializer<U> => ({
  description: serializer.description,
  serialize: (value) => serializer.serialize(unmap(value)),
  deserialize: (buffer, offset) => {
    const [value, newOffset] = serializer.deserialize(buffer, offset);
    return [map(value), newOffset];
  },
});

export const createSerializerFromBeet = <T>(
  beetArg: Beet<T>
): Serializer<T> => ({
  description: beetArg.description,
  serialize: (value: T) => {
    const fixedBeet = beet.isFixableBeet(beetArg)
      ? beetArg.toFixedFromValue(value)
      : beetArg;
    const writer = new beet.BeetWriter(fixedBeet.byteSize);
    writer.write(fixedBeet, value);
    return writer.buffer;
  },
  deserialize: (buffer: Buffer, offset?: number) => {
    const fixedBeet = beet.isFixableBeet(beetArg)
      ? beetArg.toFixedFromData(buffer, offset ?? 0)
      : beetArg;
    const reader = new beet.BeetReader(buffer, offset ?? 0);
    const value = reader.read(fixedBeet);
    return [value, reader.offset];
  },
});

export type SolitaType<T> = {
  name: string;
  deserialize: (data: Buffer, offset?: number) => [T, number];
  fromArgs: (args: T) => {
    serialize: () => [Buffer, number];
  };
};

export const createSerializerFromSolitaType = <T>(
  solitaType: SolitaType<T>,
  description?: string
): Serializer<T> => ({
  description: description ?? solitaType.name,
  serialize: (value: T) => {
    return solitaType.fromArgs(value).serialize()[0];
  },
  deserialize: (buffer: Buffer, offset?: number) => {
    return solitaType.deserialize(buffer, offset);
  },
});

export const serialize = <T>(
  value: T,
  serializer: Pick<Serializer<T>, 'description' | 'serialize'>
): Buffer => {
  try {
    return serializer.serialize(value);
  } catch (error) {
    throw new FailedToSerializeDataError(
      serializer.description,
      error as Error
    );
  }
};

export const deserialize = <T>(
  value: Buffer,
  serializer: Pick<Serializer<T>, 'description' | 'deserialize'>
): [T, number] => {
  try {
    return serializer.deserialize(value);
  } catch (error) {
    throw new FailedToDeserializeDataError(
      serializer.description,
      error as Error
    );
  }
};

export function deserializeAccount<T>(
  account: UnparsedMaybeAccount,
  serializer: Pick<Serializer<T>, 'description' | 'deserialize'>
): MaybeAccount<T>;
export function deserializeAccount<T>(
  account: UnparsedAccount,
  serializer: Pick<Serializer<T>, 'description' | 'deserialize'>
): Account<T>;
export function deserializeAccount<T>(
  account: UnparsedAccount | UnparsedMaybeAccount,
  serializer: Pick<Serializer<T>, 'description' | 'deserialize'>
): Account<T> | MaybeAccount<T> {
  if ('exists' in account && !account.exists) {
    return account;
  }

  try {
    const data: T = serializer.deserialize(account.data)[0];
    return { ...account, data };
  } catch (error) {
    throw new UnexpectedAccountError(
      account.publicKey,
      serializer.description,
      error as Error
    );
  }
}

export const serializeDiscriminator = (discriminator: number[]): Buffer => {
  const serializer = createSerializerFromBeet(
    beet.uniformFixedSizeArray(beet.u8, 8)
  );
  return serialize(discriminator, serializer);
};
