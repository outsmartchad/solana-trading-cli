import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { MaybeRpcAccount, RpcAccount } from './Account';
import { SolAmount } from './Amount';
import type { Cluster } from './Cluster';
import { DateTime } from './DateTime';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type {
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Transaction,
  TransactionError,
  TransactionSignature,
  TransactionStatus,
  TransactionWithMeta,
} from './Transaction';
import { InterfaceImplementationMissingError } from './errors';

/**
 * Defines the interface for an RPC client.
 * It allows us to interact with the Solana blockchain.
 *
 * @category Context and Interfaces
 */
export interface RpcInterface {
  /** The RPC endpoint used by the client. */
  getEndpoint(): string;

  /** The Solana cluster of the RPC being used. */
  getCluster(): Cluster;

  /**
   * Fetch a raw account at the given address.
   *
   * @param publicKey The public key of the account to fetch.
   * @param options The options to use when fetching the account.
   * @returns A raw account that may or may not exist.
   */
  getAccount(
    publicKey: PublicKey,
    options?: RpcGetAccountOptions
  ): Promise<MaybeRpcAccount>;

  /**
   * Fetch multiple raw accounts at the given addresses.
   *
   * @param publicKey The public keys of the accounts to fetch.
   * @param options The options to use when fetching multiple accounts.
   * @returns An array of raw accounts that may or may not exist.
   */
  getAccounts(
    publicKeys: PublicKey[],
    options?: RpcGetAccountsOptions
  ): Promise<MaybeRpcAccount[]>;

  /**
   * Fetch multiple raw accounts from a program.
   *
   * @param programId The public key of the program to fetch accounts from.
   * @param options The options to use when fetching program accounts.
   * @returns An array of raw accounts.
   */
  getProgramAccounts(
    programId: PublicKey,
    options?: RpcGetProgramAccountsOptions
  ): Promise<RpcAccount[]>;

  /**
   * Fetch the estimated production time of a block.
   *
   * @param slot The slot to get the estimated production time for.
   * @param options The options to use when getting the block time of a slot.
   * @returns The estimated production time of the block in Unix time.
   */
  getBlockTime(
    slot: number,
    options?: RpcGetBlockTimeOptions
  ): Promise<DateTime | null>;

  /**
   * Fetch the balance of an account.
   *
   * @param publicKey The public key of the account.
   * @param options The options to use when fetching an account's balance.
   * @returns An amount of SOL.
   */
  getBalance(
    publicKey: PublicKey,
    options?: RpcGetBalanceOptions
  ): Promise<SolAmount>;

  /**
   * Get the amount of rent-exempt SOL required to create an account of the given size.
   *
   * @param bytes The size of the account in bytes.
   * @param options The options to use when fetching the rent exempt amount.
   * @returns An amount of SOL.
   */
  getRent(bytes: number, options?: RpcGetRentOptions): Promise<SolAmount>;

  /**
   * Fetch the recent slot.
   *
   * @param options The options to use when fetching the recent slot.
   * @returns The recent slot.
   */
  getSlot(options?: RpcGetSlotOptions): Promise<number>;

  /**
   * Fetch the latest blockhash.
   *
   * @param options The options to use when fetching the latest blockhash.
   * @returns The latest blockhash and its block height.
   */
  getLatestBlockhash(
    options?: RpcGetLatestBlockhashOptions
  ): Promise<BlockhashWithExpiryBlockHeight>;

  /**
   * Fetch a transaction by its signature.
   *
   * @param signature The signature of the transaction to fetch.
   * @param options The options to use when fetching transactions.
   * @returns A transaction with its metadata or `null` if the transaction was not found.
   */
  getTransaction(
    signature: TransactionSignature,
    options?: RpcGetTransactionOptions
  ): Promise<TransactionWithMeta | null>;

  /**
   * Fetch transaction commitments from an array of signatures.
   *
   * @param signatures The signatures of all transactions we want to fetch commitments for.
   * @param options The options to use when fetching transaction commitments.
   * @returns An array of transaction statuses in the same order as the signatures.
   * If a transaction was not found, `null` will be returned instead.
   */
  getSignatureStatuses(
    signatures: TransactionSignature[],
    options?: RpcGetSignatureStatusesOptions
  ): Promise<Array<TransactionStatus | null>>;

  /**
   * Whether or not an account at a given address exists.
   *
   * @param publicKey The public key of the account.
   * @param options The options to use when checking if an account exists.
   * @returns `true` if the account exists, `false` otherwise.
   */
  accountExists(
    publicKey: PublicKey,
    options?: RpcAccountExistsOptions
  ): Promise<boolean>;

  /**
   * Send and confirm an airdrop transaction to the given address.
   *
   * @param publicKey The public key of the account to airdrop to.
   * @param amount The amount of SOL to airdrop.
   * @param options The options to use when airdropping SOL.
   */
  airdrop(
    publicKey: PublicKey,
    amount: SolAmount,
    options?: RpcAirdropOptions
  ): Promise<void>;

  /**
   * Send a custom RPC request to the node.
   *
   * @param method The method to call.
   * @param params The parameters to pass to the method.
   * @param options The options to use when sending a custom RPC request.
   * @returns The generic result of the RPC call.
   */
  call<R, P extends any[] = any[]>(
    method: string,
    params?: [...P],
    options?: RpcCallOptions
  ): Promise<R>;

  /**
   * Send a transaction to the blockchain.
   *
   * @param transaction The transaction to send.
   * @param options The options to use when sending a transaction.
   * @returns The signature of the sent transaction.
   */
  sendTransaction(
    transaction: Transaction,
    options?: RpcSendTransactionOptions
  ): Promise<TransactionSignature>;

  /**
   * Confirm a sent transaction.
   *
   * @param signature The signature of the transaction to confirm.
   * @param options The options to use when confirming a transaction.
   * @returns The RPC response of the transaction confirmation.
   */
  confirmTransaction(
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult>;
}

/**
 * The various commitment levels when fetching data from the blockchain.
 * @category Rpc
 */
export type Commitment = 'processed' | 'confirmed' | 'finalized';

/**
 * An object to request a slice of data starting
 * at `offset` and ending at `offset + length`.
 * @category Rpc
 */
export type RpcDataSlice = { offset: number; length: number };

/**
 * Defines a filter to use when fetching program accounts.
 * @category Rpc
 */
export type RpcDataFilter = RpcDataFilterSize | RpcDataFilterMemcmp;

/**
 * Defines a filter that selects accounts by size.
 * @category Rpc
 */
export type RpcDataFilterSize = { dataSize: number };

/**
 * Defines a filter that selects accounts by comparing
 * the given bytes at the given offset.
 * @category Rpc
 */
export type RpcDataFilterMemcmp = {
  memcmp: { offset: number; bytes: Uint8Array };
};

/**
 * Defines an RPC result that wraps the returned value
 * and provides the slot number as context.
 * @category Rpc
 */
export type RpcResultWithContext<Value> = {
  context: { slot: number };
  value: Value;
};

/**
 * Defines the common options re-used by all
 * the methods defines in the RPC interface.
 * @category Rpc
 */
export type RpcBaseOptions = {
  /** An explicit RPC request identifier. */
  id?: string;
  /** An abort signal to prematurely cancel the request. */
  signal?: GenericAbortSignal;
  /** The commitment level to use when fetching data. */
  commitment?: Commitment;
  /** The minimum slot to use when fetching data. */
  minContextSlot?: number;
};

/**
 * The options to use when fetching an account.
 * @category Rpc
 */
export type RpcGetAccountOptions = RpcBaseOptions & {
  /** Select only a portion of the account's data. */
  dataSlice?: RpcDataSlice;
};

/**
 * The options to use when fetching multiple accounts.
 * @category Rpc
 */
export type RpcGetAccountsOptions = RpcBaseOptions & {
  /** For each account, select only a portion of their data. */
  dataSlice?: RpcDataSlice;
};

/**
 * The options to use when fetching program accounts.
 * @category Rpc
 */
export type RpcGetProgramAccountsOptions = RpcBaseOptions & {
  /** For each program account, select only a portion of their data. */
  dataSlice?: RpcDataSlice;
  /** A set of filters to narrow down the returned program accounts. Max 5 filters. */
  filters?: RpcDataFilter[];
};

/**
 * The options to use when getting the block time of a slot.
 * @category Rpc
 */
export type RpcGetBlockTimeOptions = RpcBaseOptions;

/**
 * The options to use when fetching the balance of an account.
 * @category Rpc
 */
export type RpcGetBalanceOptions = RpcBaseOptions;

/**
 * The options to use when fetching the rent exempt amount.
 * @category Rpc
 */
export type RpcGetRentOptions = RpcBaseOptions & {
  /** @defaultValue `false` */
  includesHeaderBytes?: boolean;
};

/**
 * The options to use when fetching the recent slot.
 * @category Rpc
 */
export type RpcGetSlotOptions = RpcBaseOptions;

/**
 * The options to use when fetching the latest blockhash.
 * @category Rpc
 */
export type RpcGetLatestBlockhashOptions = RpcBaseOptions;

/**
 * The options to use when fetching a transaction.
 * @category Rpc
 */
export type RpcGetTransactionOptions = RpcBaseOptions;

/**
 * The options to use when fetching transaction statuses.
 * @category Rpc
 */
export type RpcGetSignatureStatusesOptions = RpcBaseOptions & {
  /**
   * Enable searching status history, not needed for recent transactions.
   * @defaultValue `false`
   */
  searchTransactionHistory?: boolean;
};

/**
 * The options to use when checking if an account exists.
 * @category Rpc
 */
export type RpcAccountExistsOptions = RpcBaseOptions;

/**
 * The options to use when airdropping SOL.
 * @category Rpc
 */
export type RpcAirdropOptions = Partial<RpcConfirmTransactionOptions>;

/**
 * The options to use when sending a custom RPC request.
 * @category Rpc
 */
export type RpcCallOptions = RpcBaseOptions & {
  /**
   * By default, the RPC client pushes an additional `options`
   * parameter to the RPC request when a commitment is specified.
   * This `extra` parameter can be used to add more data to the
   * `options` parameter.
   */
  extra?: object;
};

/**
 * The options to use when sending a transaction.
 * @category Rpc
 */
export type RpcSendTransactionOptions = RpcBaseOptions & {
  /** Whether to skip the preflight check. */
  skipPreflight?: boolean;
  /** The commitment level to use for the preflight check. */
  preflightCommitment?: Commitment;
  /** The maximum number of retries to use. */
  maxRetries?: number;
};

/**
 * The options to use when confirming a transaction.
 * @category Rpc
 */
export type RpcConfirmTransactionOptions = RpcBaseOptions & {
  /** The confirm strategy to use. */
  strategy: RpcConfirmTransactionStrategy;
};

/**
 * Represents all the possible strategies to use when confirming a transaction.
 * @category Rpc
 */
export type RpcConfirmTransactionStrategy =
  | {
      type: 'blockhash';
      blockhash: Blockhash;
      lastValidBlockHeight: number;
    }
  | {
      type: 'durableNonce';
      minContextSlot: number;
      nonceAccountPubkey: PublicKey;
      nonceValue: string;
    };

/**
 * Defines the result of a transaction confirmation.
 * @category Rpc
 */
export type RpcConfirmTransactionResult = RpcResultWithContext<{
  err: TransactionError | null;
}>;

/**
 * An implementation of the {@link RpcInterface} that throws an error when called.
 * @category Rpc
 */
export function createNullRpc(): RpcInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError('RpcInterface', 'rpc');
  };
  return {
    getEndpoint: errorHandler,
    getCluster: errorHandler,
    getAccount: errorHandler,
    getAccounts: errorHandler,
    getProgramAccounts: errorHandler,
    getBlockTime: errorHandler,
    getBalance: errorHandler,
    getRent: errorHandler,
    getSlot: errorHandler,
    getLatestBlockhash: errorHandler,
    getTransaction: errorHandler,
    getSignatureStatuses: errorHandler,
    accountExists: errorHandler,
    airdrop: errorHandler,
    call: errorHandler,
    sendTransaction: errorHandler,
    confirmTransaction: errorHandler,
  };
}
