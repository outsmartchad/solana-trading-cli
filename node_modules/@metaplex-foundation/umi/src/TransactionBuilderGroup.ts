import type { Context } from './Context';
import type {
  RpcConfirmTransactionResult,
  RpcSendTransactionOptions,
} from './RpcInterface';
import { RpcConfirmTransactionStrategy } from './RpcInterface';
import { signAllTransactions } from './Signer';
import type {
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionSignature,
} from './Transaction';
import {
  TransactionBuilder,
  TransactionBuilderSendAndConfirmOptions,
} from './TransactionBuilder';
import { zipMap } from './utils';

export type TransactionBuilderGroupOptions = {
  /** Whether to run the builders in parallel or, if false, sequentially. */
  parallel?: boolean;
};

export class TransactionBuilderGroup {
  constructor(
    readonly builders: TransactionBuilder[] = [],
    readonly options: TransactionBuilderGroupOptions = {}
  ) {}

  prepend(
    builder: TransactionBuilder | TransactionBuilder[]
  ): TransactionBuilderGroup {
    const newBuilders = Array.isArray(builder) ? builder : [builder];
    return new TransactionBuilderGroup(
      [...newBuilders, ...this.builders],
      this.options
    );
  }

  append(
    builder: TransactionBuilder | TransactionBuilder[]
  ): TransactionBuilderGroup {
    const newBuilders = Array.isArray(builder) ? builder : [builder];
    return new TransactionBuilderGroup(
      [...this.builders, ...newBuilders],
      this.options
    );
  }

  add(
    builder: TransactionBuilder | TransactionBuilder[]
  ): TransactionBuilderGroup {
    return this.append(builder);
  }

  sequential(): TransactionBuilderGroup {
    return new TransactionBuilderGroup(this.builders, {
      ...this.options,
      parallel: false,
    });
  }

  parallel(): TransactionBuilderGroup {
    return new TransactionBuilderGroup(this.builders, {
      ...this.options,
      parallel: true,
    });
  }

  isParallel(): boolean {
    return this.options.parallel ?? false;
  }

  merge(): TransactionBuilder {
    if (this.builders.length === 0) {
      return new TransactionBuilder();
    }
    return this.builders.reduce(
      (builder, next) => builder.add(next),
      this.builders[0].empty()
    );
  }

  build(context: Pick<Context, 'transactions' | 'payer'>): Transaction[] {
    return this.builders.map((builder) => builder.build(context));
  }

  async setLatestBlockhash(
    context: Pick<Context, 'rpc'>
  ): Promise<TransactionBuilderGroup> {
    const hasBlockhashlessBuilder = this.builders.some(
      (builder) => !builder.options.blockhash
    );
    if (!hasBlockhashlessBuilder) return this;
    const blockhash = await context.rpc.getLatestBlockhash();
    return this.map((builder) =>
      builder.options.blockhash ? builder : builder.setBlockhash(blockhash)
    );
  }

  async buildWithLatestBlockhash(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>
  ): Promise<Transaction[]> {
    return (await this.setLatestBlockhash(context)).build(context);
  }

  async buildAndSign(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>
  ): Promise<Transaction[]> {
    const transactions = await this.buildWithLatestBlockhash(context);
    const signers = this.builders.map((builder) => builder.getSigners(context));
    return signAllTransactions(
      zipMap(transactions, signers, (transaction, txSigners) => ({
        transaction,
        signers: txSigners ?? [],
      }))
    );
  }

  async send(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature[]> {
    return this.runAll(await this.buildAndSign(context), async (tx) =>
      context.rpc.sendTransaction(tx, options)
    );
  }

  async sendAndConfirm(
    context: Pick<Context, 'transactions' | 'rpc' | 'payer'>,
    options: TransactionBuilderSendAndConfirmOptions = {}
  ): Promise<
    Array<{
      signature: TransactionSignature;
      result: RpcConfirmTransactionResult;
    }>
  > {
    const blockhashWithExpiryBlockHeight = this.builders.find(
      (builder) => typeof builder.options.blockhash === 'object'
    )?.options.blockhash as BlockhashWithExpiryBlockHeight | undefined;

    let strategy: RpcConfirmTransactionStrategy;
    if (options.confirm?.strategy) {
      strategy = options.confirm.strategy;
    } else {
      const blockhash =
        blockhashWithExpiryBlockHeight ??
        (await context.rpc.getLatestBlockhash());
      strategy = options.confirm?.strategy ?? {
        type: 'blockhash',
        ...blockhash,
      };
    }

    return this.runAll(await this.buildAndSign(context), async (tx) => {
      const signature = await context.rpc.sendTransaction(tx, options.send);
      const result = await context.rpc.confirmTransaction(signature, {
        ...options.confirm,
        strategy,
      });
      return { signature, result };
    });
  }

  map(
    fn: (
      builder: TransactionBuilder,
      index: number,
      array: TransactionBuilder[]
    ) => TransactionBuilder
  ): TransactionBuilderGroup {
    return new TransactionBuilderGroup(this.builders.map(fn));
  }

  filter(
    fn: Parameters<Array<TransactionBuilder>['filter']>[0]
  ): TransactionBuilderGroup {
    return new TransactionBuilderGroup(this.builders.filter(fn));
  }

  async runAll<T, U>(
    array: T[],
    fn: (item: T, index: number, array: T[]) => Promise<U>
  ): Promise<U[]> {
    if (this.isParallel()) {
      return Promise.all(array.map(fn));
    }
    return array.reduce(
      async (promise, ...args) => [...(await promise), await fn(...args)],
      Promise.resolve([] as U[])
    );
  }
}

export function transactionBuilderGroup(
  builders: TransactionBuilder[] = []
): TransactionBuilderGroup {
  return new TransactionBuilderGroup(builders);
}
