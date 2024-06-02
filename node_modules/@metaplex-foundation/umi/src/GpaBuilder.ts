import { publicKey, PublicKey } from '@metaplex-foundation/umi-public-keys';
import type {
  Serializer,
  StructToSerializerTuple,
} from '@metaplex-foundation/umi-serializers';
import { base10, base58, base64 } from '@metaplex-foundation/umi-serializers';
import type { RpcAccount } from './Account';
import type { Context } from './Context';
import { SdkError } from './errors';
import type {
  RpcDataFilter,
  RpcDataSlice,
  RpcGetProgramAccountsOptions,
} from './RpcInterface';

/**
 * Callback for sorting raw accounts from `getProgramAccounts` RPC requests.
 * @category Utils — GpaBuilder
 */
export type GpaBuilderSortCallback = (a: RpcAccount, b: RpcAccount) => number;

/**
 * Callback for mapping raw accounts into any type.
 * @category Utils — GpaBuilder
 */
export type GpaBuilderMapCallback<T> = (account: RpcAccount) => T;

/**
 * Get the GPA field offsets and serializers from their object definition.
 * @category Utils — GpaBuilder
 */
export type GpaBuilderFieldSerializers<T extends object, U extends T> = {
  [K in keyof T]: [number | null, Serializer<T[K], U[K]>];
};

/**
 * Builder for `getProgramAccounts` RPC requests.
 * @category Utils — GpaBuilder
 */
export class GpaBuilder<
  Account extends object = RpcAccount,
  Fields extends object = {}
> {
  constructor(
    protected readonly context: Pick<Context, 'rpc'>,
    readonly programId: PublicKey,
    readonly options: {
      readonly fields?: GpaBuilderFieldSerializers<Fields, Fields>;
      readonly deserializeCallback?: GpaBuilderMapCallback<Account>;
      readonly dataSlice?: RpcDataSlice;
      readonly filters?: RpcDataFilter[];
      readonly sortCallback?: GpaBuilderSortCallback;
    } = {}
  ) {}

  reset(): GpaBuilder<Account, Fields> {
    return new GpaBuilder<Account, Fields>(this.context, this.programId, {
      fields: this.options.fields,
      deserializeCallback: this.options.deserializeCallback,
    });
  }

  registerFields<T extends object>(
    fields: GpaBuilderFieldSerializers<T, T>
  ): GpaBuilder<Account, T> {
    return new GpaBuilder<Account, T>(this.context, this.programId, {
      ...this.options,
      fields,
    });
  }

  registerFieldsFromStruct<T extends object>(
    structFields: StructToSerializerTuple<T, T>
  ): GpaBuilder<Account, T> {
    let offset: number | null = 0;
    const fields = structFields.reduce((acc, [field, serializer]) => {
      acc[field] = [offset, serializer];
      offset =
        offset === null || serializer.fixedSize === null
          ? null
          : offset + serializer.fixedSize;
      return acc;
    }, {} as GpaBuilderFieldSerializers<T, T>);
    return this.registerFields(fields);
  }

  deserializeUsing<T extends object>(
    callback: GpaBuilderMapCallback<T>
  ): GpaBuilder<T, Fields> {
    return new GpaBuilder<T, Fields>(this.context, this.programId, {
      ...this.options,
      deserializeCallback: callback,
    });
  }

  slice(offset: number, length: number): GpaBuilder<Account, Fields> {
    return new GpaBuilder<Account, Fields>(this.context, this.programId, {
      ...this.options,
      dataSlice: { offset, length },
    });
  }

  sliceField(
    field: keyof Fields,
    offset?: number
  ): GpaBuilder<Account, Fields> {
    const [effectiveOffset, serializer] = this.getField(field, offset);
    if (!serializer.fixedSize) {
      throw new SdkError(
        `Cannot slice field [${field as string}] because its size is variable.`
      );
    }
    return this.slice(effectiveOffset, serializer.fixedSize);
  }

  withoutData(): GpaBuilder<Account, Fields> {
    return this.slice(0, 0);
  }

  addFilter(...filters: RpcDataFilter[]): GpaBuilder<Account, Fields> {
    return new GpaBuilder<Account, Fields>(this.context, this.programId, {
      ...this.options,
      filters: [...(this.options.filters ?? []), ...filters],
    });
  }

  where(
    offset: number,
    data: string | bigint | number | boolean | Uint8Array | PublicKey
  ): GpaBuilder<Account, Fields> {
    let bytes: Uint8Array;
    if (typeof data === 'string') {
      bytes = base58.serialize(data);
    } else if (
      typeof data === 'number' ||
      typeof data === 'bigint' ||
      typeof data === 'boolean'
    ) {
      bytes = base10.serialize(BigInt(data).toString());
    } else {
      bytes = new Uint8Array(data);
    }

    return this.addFilter({ memcmp: { offset, bytes } });
  }

  whereField<K extends keyof Fields>(
    field: K,
    data: Fields[K],
    offset?: number
  ): GpaBuilder<Account, Fields> {
    const [effectiveOffset, serializer] = this.getField(field, offset);
    return this.where(effectiveOffset, serializer.serialize(data));
  }

  whereSize(dataSize: number): GpaBuilder<Account, Fields> {
    return this.addFilter({ dataSize });
  }

  sortUsing(callback: GpaBuilderSortCallback): GpaBuilder<Account, Fields> {
    return new GpaBuilder(this.context, this.programId, {
      ...this.options,
      sortCallback: callback,
    });
  }

  async get(options: RpcGetProgramAccountsOptions = {}): Promise<RpcAccount[]> {
    const accounts = await this.context.rpc.getProgramAccounts(this.programId, {
      ...options,
      dataSlice: options.dataSlice ?? this.options.dataSlice,
      filters: [...(options.filters ?? []), ...(this.options.filters ?? [])],
    });

    if (this.options.sortCallback) {
      accounts.sort(this.options.sortCallback);
    }

    return accounts;
  }

  async getAndMap<T>(
    callback: GpaBuilderMapCallback<T>,
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<T[]> {
    return (await this.get(options)).map(callback);
  }

  async getDeserialized(
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<Account[]> {
    const rpcAccounts = await this.get(options);
    if (!this.options.deserializeCallback) return rpcAccounts as Account[];
    return rpcAccounts.map(this.options.deserializeCallback);
  }

  async getPublicKeys(
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<PublicKey[]> {
    return this.getAndMap((account) => account.publicKey, options);
  }

  async getDataAsPublicKeys(
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<PublicKey[]> {
    return this.getAndMap((account) => {
      try {
        return publicKey(account.data);
      } catch (error) {
        const message =
          `Following a getProgramAccount call, you are trying to use an ` +
          `account's data (or a slice of it) as a public key. ` +
          `However, we encountered an account ` +
          `[${account.publicKey}] whose data ` +
          `[base64=${base64.deserialize(account.data)}] ` +
          `is not a valid public key.`;
        throw new SdkError(message);
      }
    }, options);
  }

  protected getField<K extends keyof Fields>(
    fieldName: K,
    forcedOffset?: number
  ): [number, Serializer<Fields[K]>] {
    if (!this.options.fields) {
      throw new SdkError('Fields are not defined in this GpaBuilder.');
    }

    const field = this.options.fields[fieldName];
    if (!field) {
      throw new SdkError(
        `Field [${fieldName as string}] is not defined in this GpaBuilder.`
      );
    }

    const [offset, serializer] = field;
    if (forcedOffset !== undefined) {
      return [forcedOffset, serializer];
    }

    if (offset === null) {
      throw new SdkError(
        `Field [${fieldName as string}] does not have a fixed offset. ` +
          `This is likely because it is not in the fixed part of ` +
          `the account's data. In other words, it is located after ` +
          `a field of variable length which means we cannot find a ` +
          `fixed offset for the filter. You may go around this by ` +
          `providing an offset explicitly.`
      );
    }

    return [offset, serializer];
  }
}

/**
 * Creates a new {@link GpaBuilder} instance.
 * @category Utils — GpaBuilder
 */
export const gpaBuilder = (
  context: Pick<Context, 'rpc'>,
  programId: PublicKey
): GpaBuilder => new GpaBuilder(context, programId);
