import { SolAmount } from './Amount';
import type { Context } from './Context';
import { SdkError } from './errors';
import type {
  AccountMeta,
  Instruction,
  SignerMeta,
  WrappedInstruction,
} from './Instruction';
import type {
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcConfirmTransactionStrategy,
  RpcGetLatestBlockhashOptions,
  RpcSendTransactionOptions,
} from './RpcInterface';
import { Signer, signTransaction, uniqueSigners } from './Signer';
import {
  AddressLookupTableInput,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionInput,
  TransactionSignature,
  TransactionVersion,
  TRANSACTION_SIZE_LIMIT,
} from './Transaction';

/**
 * Defines an generic object with wrapped instructions,
 * such as a {@link TransactionBuilder}.
 * @category Transactions
 */
export type HasWrappedInstructions = { items: WrappedInstruction[] };

/**
 * Defines all the possible inputs for adding items to a transaction builder.
 * @category Transactions
 */
export type TransactionBuilderItemsInput =
  | WrappedInstruction
  | WrappedInstruction[]
  | HasWrappedInstructions
  | HasWrappedInstructions[];

/**
 * The available options of a transaction builder.
 * @category Transactions
 */
export type TransactionBuilderOptions = {
  /** The signer paying for the transaction fee. */
  feePayer?: Signer;
  /** The version of the transaction to build. */
  version?: TransactionVersion;
  /** The address lookup tables to attach to the built transaction. */
  addressLookupTables?: AddressLookupTableInput[];
  /** The blockhash that should be associated with the built transaction. */
  blockhash?: Blockhash | BlockhashWithExpiryBlockHeight;
};

/**
 * A set of options to use when sending and confirming
 * a transaction directly from a transaction builder.
 * @category Transactions
 */
export type TransactionBuilderSendAndConfirmOptions = {
  send?: RpcSendTransactionOptions;
  confirm?: Partial<RpcConfirmTransactionOptions>;
};

/**
 * A builder that helps construct transactions.
 * @category Transactions
 */
export class TransactionBuilder implements HasWrappedInstructions {
  constructor(
    readonly items: WrappedInstruction[] = [],
    readonly options: TransactionBuilderOptions = {}
  ) {}

  empty(): TransactionBuilder {
    return new TransactionBuilder([], this.options);
  }

  setItems(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(this.parseItems(input), this.options);
  }

  prepend(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(
      [...this.parseItems(input), ...this.items],
      this.options
    );
  }

  append(input: TransactionBuilderItemsInput): TransactionBuilder {
    return new TransactionBuilder(
      [...this.items, ...this.parseItems(input)],
      this.options
    );
  }

  add(input: TransactionBuilderItemsInput): TransactionBuilder {
    return this.append(input);
  }

  mapInstructions(
    fn: (
      wrappedInstruction: WrappedInstruction,
      index: number,
      array: WrappedInstruction[]
    ) => WrappedInstruction
  ): TransactionBuilder {
    return new TransactionBuilder(this.items.map(fn), this.options);
  }

  addRemainingAccounts(
    accountMeta: AccountMeta | SignerMeta | (AccountMeta | SignerMeta)[],
    instructionIndex?: number
  ): TransactionBuilder {
    instructionIndex = instructionIndex ?? this.items.length - 1;
    const metas = Array.isArray(accountMeta) ? accountMeta : [accountMeta];
    const extraKeys = metas.map((meta) =>
      'pubkey' in meta
        ? meta
        : {
            pubkey: meta.signer.publicKey,
            isSigner: true,
            isWritable: meta.isWritable,
          }
    );
    const extraSigners = metas.flatMap((meta) =>
      'pubkey' in meta ? [] : [meta.signer]
    );
    return this.mapInstructions((wrappedInstruction, index) => {
      if (index !== instructionIndex) return wrappedInstruction;
      const keys = [...wrappedInstruction.instruction.keys, ...extraKeys];
      return {
        ...wrappedInstruction,
        instruction: { ...wrappedInstruction.instruction, keys },
        signers: [...wrappedInstruction.signers, ...extraSigners],
      };
    });
  }

  splitByIndex(index: number): [TransactionBuilder, TransactionBuilder] {
    return [
      new TransactionBuilder(this.items.slice(0, index), this.options),
      new TransactionBuilder(this.items.slice(index), this.options),
    ];
  }

  /**
   * Split the builder into multiple builders, such that
   * each of them should fit in a single transaction.
   *
   * This method is unsafe for several reasons:
   * - Because transactions are atomic, splitting the builder
   *   into multiple transactions may cause undesired side effects.
   *   For example, if the first transaction succeeds but the second
   *   one fails, you may end up with an inconsistent account state.
   *   This is why it is recommended to manually split your transactions
   *   such that each of them is valid on its own.
   * - It can only split the instructions of the builder. Meaning that,
   *   if the builder has a single instruction that is too big to fit in
   *   a single transaction, it will not be able to split it.
   */
  unsafeSplitByTransactionSize(
    context: Pick<Context, 'transactions' | 'payer'>
  ): TransactionBuilder[] {
    return this.items.reduce(
      (builders, item) => {
        const lastBuilder = builders.pop() as TransactionBuilder;
        const lastBuilderWithItem = lastBuilder.add(item);
        if (lastBuilderWithItem.fitsInOneTransaction(context)) {
          builders.push(lastBuilderWithItem);
        } else {
          builders.push(lastBuilder);
          builders.push(lastBuilder.empty().add(item));
        }
        return builders;
      },
      [this.empty()]
    );
  }

  setFeePayer(feePayer: Signer): TransactionBuilder {
    return new TransactionBuilder(this.items, { ...this.options, feePayer });
  }

  getFeePayer(context: Pick<Context, 'payer'>): Signer {
    return this.options.feePayer ?? context.payer;
  }

  setVersion(version: TransactionVersion): TransactionBuilder {
    return new TransactionBuilder(this.items, { ...this.options, version });
  }

  useLegacyVersion(): TransactionBuilder {
    return this.setVersion('legacy');
  }

  useV0(): TransactionBuilder {
    return this.setVersion(0);
  }

  setAddressLookupTables(
    addressLookupTables: AddressLookupTableInput[]
  ): TransactionBuilder {
    return new TransactionBuilder(this.items, {
      ...this.options,
      addressLookupTables,
    });
  }

  getBlockhash(): Blockhash | undefined {
    return typeof this.options.blockhash === 'object'
      ? this.options.blockhash.blockhash
      : this.options.blockhash;
  }

  setBlockhash(
    blockhash: Blockhash | BlockhashWithExpiryBlockHeight
  ): TransactionBuilder {
    return new TransactionBuilder(this.items, { ...this.options, blockhash });
  }

  async setLatestBlockhash(
    context: Pick<Context, 'rpc'>,
    options: RpcGetLatestBlockhashOptions = {}
  ): Promise<TransactionBuilder> {
    return this.setBlockhash(await context.rpc.getLatestBlockhash(options));
  }

  getInstructions(): Instruction[] {
    return this.items.map((item) => item.instruction);
  }

  getSigners(context: Pick<Context, 'payer'>): Signer[] {
    return uniqueSigners([
      this.getFeePayer(context),
      ...this.items.flatMap((item) => item.signers),
    ]);
  }

  getBytesCreatedOnChain(): number {
    return this.items.reduce((sum, item) => sum + item.bytesCreatedOnChain, 0);
  }

  async getRentCreatedOnChain(
    context: Pick<Context, 'rpc'>
  ): Promise<SolAmount> {
    return context.rpc.getRent(this.getBytesCreatedOnChain(), {
      includesHeaderBytes: true,
    });
  }

  getTransactionSize(context: Pick<Context, 'transactions' | 'payer'>): number {
    return context.transactions.serialize(
      this.setBlockhash('11111111111111111111111111111111').build(context)
    ).length;
  }

  minimumTransactionsRequired(
    context: Pick<Context, 'transactions' | 'payer'>
  ): number {
    return Math.ceil(this.getTransactionSize(context) / TRANSACTION_SIZE_LIMIT);
  }

  fitsInOneTransaction(
    context: Pick<Context, 'transactions' | 'payer'>
  ): boolean {
    return this.minimumTransactionsRequired(context) === 1;
  }

  build(context: Pick<Context, 'transactions' | 'payer'>): Transaction {
    const blockhash = this.getBlockhash();
    if (!blockhash) {
      throw new SdkError(
        'Setting a blockhash is required to build a transaction. ' +
          'Please use the `setBlockhash` or `setLatestBlockhash` methods.'
      );
    }
    const input: TransactionInput = {
      version: this.options.version ?? 0,
      payer: this.getFeePayer(context).publicKey,
      instructions: this.getInstructions(),
      blockhash,
    };
    if (input.version === 0 && this.options.addressLookupTables) {
      input.addressLookupTables = this.options.addressLookupTables;
    }
    return context.transactions.create(input);
  }

  async buildWithLatestBlockhash(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    options: RpcGetLatestBlockhashOptions = {}
  ): Promise<Transaction> {
    let builder: TransactionBuilder = this;
    if (!this.options.blockhash) {
      builder = await this.setLatestBlockhash(context, options);
    }
    return builder.build(context);
  }

  async buildAndSign(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>
  ): Promise<Transaction> {
    return signTransaction(
      await this.buildWithLatestBlockhash(context),
      this.getSigners(context)
    );
  }

  async send(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> {
    const transaction = await this.buildAndSign(context);
    return context.rpc.sendTransaction(transaction, options);
  }

  async confirm(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    signature: TransactionSignature,
    options: Partial<RpcConfirmTransactionOptions> = {}
  ): Promise<RpcConfirmTransactionResult> {
    let builder: TransactionBuilder = this;
    if (!this.options.blockhash) {
      builder = await this.setLatestBlockhash(context);
    }

    let strategy: RpcConfirmTransactionStrategy;
    if (options.strategy) {
      strategy = options.strategy;
    } else {
      const blockhash =
        typeof builder.options.blockhash === 'object'
          ? builder.options.blockhash
          : await context.rpc.getLatestBlockhash();
      strategy = options.strategy ?? { type: 'blockhash', ...blockhash };
    }

    return context.rpc.confirmTransaction(signature, { ...options, strategy });
  }

  async sendAndConfirm(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    options: TransactionBuilderSendAndConfirmOptions = {}
  ): Promise<{
    signature: TransactionSignature;
    result: RpcConfirmTransactionResult;
  }> {
    let builder: TransactionBuilder = this;
    if (!this.options.blockhash) {
      builder = await this.setLatestBlockhash(context);
    }
    const signature = await builder.send(context, options.send);
    const result = await builder.confirm(context, signature, options.confirm);
    return { signature, result };
  }

  protected parseItems(
    input: TransactionBuilderItemsInput
  ): WrappedInstruction[] {
    return (Array.isArray(input) ? input : [input]).flatMap((item) =>
      'items' in item ? item.items : [item]
    );
  }
}

/**
 * Creates a new transaction builder.
 * @category Transactions
 */
export const transactionBuilder = (items: WrappedInstruction[] = []) =>
  new TransactionBuilder(items);
