import {
  ACCOUNT_HEADER_SIZE,
  BlockhashWithExpiryBlockHeight,
  Cluster,
  Commitment,
  CompiledInstruction,
  Context,
  DateTime,
  ErrorWithLogs,
  MaybeRpcAccount,
  ProgramError,
  PublicKey,
  RpcAccount,
  RpcAccountExistsOptions,
  RpcAirdropOptions,
  RpcCallOptions,
  RpcConfirmTransactionOptions,
  RpcConfirmTransactionResult,
  RpcDataFilter,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  RpcGetBalanceOptions,
  RpcGetBlockTimeOptions,
  RpcGetLatestBlockhashOptions,
  RpcGetProgramAccountsOptions,
  RpcGetRentOptions,
  RpcGetSignatureStatusesOptions,
  RpcGetSlotOptions,
  RpcGetTransactionOptions,
  RpcInterface,
  RpcSendTransactionOptions,
  SolAmount,
  Transaction,
  TransactionMetaInnerInstruction,
  TransactionMetaTokenBalance,
  TransactionSignature,
  TransactionStatus,
  TransactionWithMeta,
  createAmount,
  dateTime,
  isZeroAmount,
  lamports,
  resolveClusterFromEndpoint,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsMessage,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import { base58 } from '@metaplex-foundation/umi/serializers';
import {
  AccountInfo as Web3JsAccountInfo,
  Connection as Web3JsConnection,
  ConnectionConfig as Web3JsConnectionConfig,
  GetProgramAccountsFilter as Web3JsGetProgramAccountsFilter,
  PublicKey as Web3JsPublicKey,
  TokenBalance as Web3JsTokenBalance,
  TransactionConfirmationStrategy as Web3JsTransactionConfirmationStrategy,
} from '@solana/web3.js';
import type { JSONRPCCallbackTypePlain } from 'jayson';
import type RpcClient from 'jayson/lib/client/browser';

export type Web3JsRpcOptions = Commitment | Web3JsConnectionConfig;

export function createWeb3JsRpc(
  context: Pick<Context, 'programs' | 'transactions'>,
  endpoint: string,
  rpcOptions?: Web3JsRpcOptions
): RpcInterface & { connection: Web3JsConnection };
export function createWeb3JsRpc(
  context: Pick<Context, 'programs' | 'transactions'>,
  connection: Web3JsConnection
): RpcInterface & { connection: Web3JsConnection };
export function createWeb3JsRpc(
  context: Pick<Context, 'programs' | 'transactions'>,
  endpointOrConnection: string | Web3JsConnection,
  rpcOptions?: Web3JsRpcOptions
): RpcInterface & { connection: Web3JsConnection } {
  let connection: Web3JsConnection | null = null;
  const getConnection = () => {
    if (connection) {
      return connection;
    }
    if (typeof endpointOrConnection === 'string') {
      connection = new Web3JsConnection(endpointOrConnection, rpcOptions);
    } else {
      connection = endpointOrConnection;
    }
    return connection;
  };

  const cluster = resolveClusterFromEndpoint(getConnection().rpcEndpoint);

  const getAccount = async (
    publicKey: PublicKey,
    options: RpcGetAccountOptions = {}
  ): Promise<MaybeRpcAccount> => {
    const account = await getConnection().getAccountInfo(
      toWeb3JsPublicKey(publicKey),
      options
    );
    return parseMaybeAccount(account, publicKey);
  };

  const getAccounts = async (
    publicKeys: PublicKey[],
    options: RpcGetAccountsOptions = {}
  ): Promise<MaybeRpcAccount[]> => {
    const accounts = await getConnection().getMultipleAccountsInfo(
      publicKeys.map(toWeb3JsPublicKey),
      options
    );
    return accounts.map((account, index) =>
      parseMaybeAccount(account, publicKeys[index])
    );
  };

  const getProgramAccounts = async (
    programId: PublicKey,
    options: RpcGetProgramAccountsOptions = {}
  ): Promise<RpcAccount[]> => {
    const accounts = await getConnection().getProgramAccounts(
      toWeb3JsPublicKey(programId),
      {
        ...options,
        filters: options.filters?.map((filter) => parseDataFilter(filter)),
      }
    );
    return accounts.map(({ pubkey, account }) =>
      parseAccount(account, fromWeb3JsPublicKey(pubkey))
    );
  };

  const getBlockTime = async (
    slot: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: RpcGetBlockTimeOptions = {}
  ): Promise<DateTime | null> => {
    const blockTime = await getConnection().getBlockTime(slot);
    return blockTime ? dateTime(blockTime) : null;
  };

  const getBalance = async (
    publicKey: PublicKey,
    options: RpcGetBalanceOptions = {}
  ): Promise<SolAmount> => {
    const balanceInLamports = await getConnection().getBalance(
      toWeb3JsPublicKey(publicKey),
      options
    );
    return lamports(balanceInLamports);
  };

  const getRent = async (
    bytes: number,
    options: RpcGetRentOptions = {}
  ): Promise<SolAmount> => {
    const rentFor = (bytes: number) =>
      getConnection().getMinimumBalanceForRentExemption(
        bytes,
        options.commitment
      );
    if (options.includesHeaderBytes ?? false) {
      const headerRent = await rentFor(0);
      const rentPerByte = BigInt(headerRent) / BigInt(ACCOUNT_HEADER_SIZE);
      return lamports(rentPerByte * BigInt(bytes));
    }
    return lamports(await rentFor(bytes));
  };

  const getLatestBlockhash = async (
    options: RpcGetLatestBlockhashOptions = {}
  ): Promise<BlockhashWithExpiryBlockHeight> =>
    getConnection().getLatestBlockhash(options);

  const getTransaction = async (
    signature: TransactionSignature,
    options: RpcGetTransactionOptions = {}
  ): Promise<TransactionWithMeta | null> => {
    const response = await getConnection().getTransaction(
      base58.deserialize(signature)[0],
      {
        commitment: options.commitment as 'confirmed' | 'finalized' | undefined,
        maxSupportedTransactionVersion: 0,
      }
    );

    if (!response) {
      return null;
    }

    if (!response.meta) {
      // TODO: Custom error.
      throw new Error('Transaction meta is missing.');
    }

    const { transaction, meta } = response;
    const message = fromWeb3JsMessage(transaction.message);
    const mapPublicKey = (key: string) =>
      fromWeb3JsPublicKey(new Web3JsPublicKey(key));
    const mapTokenBalance = (
      tokenBalance: Web3JsTokenBalance
    ): TransactionMetaTokenBalance => ({
      accountIndex: tokenBalance.accountIndex,
      amount: createAmount(
        tokenBalance.uiTokenAmount.amount,
        'splToken',
        tokenBalance.uiTokenAmount.decimals
      ),
      mint: mapPublicKey(tokenBalance.mint),
      owner: tokenBalance.owner ? mapPublicKey(tokenBalance.owner) : null,
    });

    return {
      message,
      serializedMessage: context.transactions.serializeMessage(message),
      signatures: transaction.signatures.map(base58.serialize),
      meta: {
        fee: lamports(meta.fee),
        logs: meta.logMessages ?? [],
        preBalances: meta.preBalances.map(lamports),
        postBalances: meta.postBalances.map(lamports),
        preTokenBalances: (meta.preTokenBalances ?? []).map(mapTokenBalance),
        postTokenBalances: (meta.postTokenBalances ?? []).map(mapTokenBalance),
        innerInstructions:
          meta.innerInstructions?.map(
            (inner): TransactionMetaInnerInstruction => ({
              index: inner.index,
              instructions: inner.instructions.map(
                (instruction): CompiledInstruction => ({
                  programIndex: instruction.programIdIndex,
                  accountIndexes: instruction.accounts,
                  data: base58.serialize(instruction.data),
                })
              ),
            })
          ) ?? null,
        loadedAddresses: {
          writable: (meta.loadedAddresses?.writable ?? []).map(
            fromWeb3JsPublicKey
          ),
          readonly: (meta.loadedAddresses?.readonly ?? []).map(
            fromWeb3JsPublicKey
          ),
        },
        computeUnitsConsumed: meta.computeUnitsConsumed
          ? BigInt(meta.computeUnitsConsumed)
          : null,
        err: meta.err,
      },
    };
  };

  const getSignatureStatuses = async (
    signatures: TransactionSignature[],
    options: RpcGetSignatureStatusesOptions = {}
  ): Promise<Array<TransactionStatus | null>> => {
    const response = await getConnection().getSignatureStatuses(
      signatures.map((signature) => base58.deserialize(signature)[0]),
      { searchTransactionHistory: options?.searchTransactionHistory ?? false }
    );
    return response.value.map((status) => {
      if (!status) return null;
      return {
        slot: status.slot,
        confirmations: status.confirmations,
        error: status.err,
        commitment: status.confirmationStatus ?? null,
      };
    });
  };

  const accountExists = async (
    publicKey: PublicKey,
    options: RpcAccountExistsOptions = {}
  ): Promise<boolean> => !isZeroAmount(await getBalance(publicKey, options));

  const airdrop = async (
    publicKey: PublicKey,
    amount: SolAmount,
    options: RpcAirdropOptions = {}
  ): Promise<void> => {
    const signature = await getConnection().requestAirdrop(
      toWeb3JsPublicKey(publicKey),
      Number(amount.basisPoints)
    );
    if (options.strategy) {
      await confirmTransaction(
        base58.serialize(signature),
        options as RpcConfirmTransactionOptions
      );
      return;
    }
    await confirmTransaction(base58.serialize(signature), {
      ...options,
      strategy: { type: 'blockhash', ...(await getLatestBlockhash()) },
    });
  };

  const call = async <Result, Params extends any[] = any[]>(
    method: string,
    params?: [...Params],
    options: RpcCallOptions = {}
  ): Promise<Result> => {
    const client = (getConnection() as any)._rpcClient as RpcClient;
    const resolvedParams = resolveCallParams(
      (params ? [...params] : []) as [...Params],
      options.commitment,
      options.extra
    );
    return new Promise((resolve, reject) => {
      const callback: JSONRPCCallbackTypePlain = (error, response) =>
        error ? reject(error) : resolve(response.result);
      if (options.id) {
        client.request(method, resolvedParams, options.id, callback);
      } else {
        client.request(method, resolvedParams, callback);
      }
    });
  };

  const sendTransaction = async (
    transaction: Transaction,
    options: RpcSendTransactionOptions = {}
  ): Promise<TransactionSignature> => {
    try {
      const signature = await getConnection().sendRawTransaction(
        context.transactions.serialize(transaction),
        options
      );
      return base58.serialize(signature);
    } catch (error: any) {
      let resolvedError: ProgramError | null = null;
      if (error instanceof Error && 'logs' in error) {
        resolvedError = context.programs.resolveError(
          error as ErrorWithLogs,
          transaction
        );
      }
      throw resolvedError || error;
    }
  };

  const confirmTransaction = async (
    signature: TransactionSignature,
    options: RpcConfirmTransactionOptions
  ): Promise<RpcConfirmTransactionResult> =>
    getConnection().confirmTransaction(
      parseConfirmStrategy(signature, options),
      options.commitment
    );

  return {
    getEndpoint: (): string => getConnection().rpcEndpoint,
    getCluster: (): Cluster => cluster,
    getAccount,
    getAccounts,
    getProgramAccounts,
    getBlockTime,
    getBalance,
    getRent,
    getSlot: async (options: RpcGetSlotOptions = {}) =>
      getConnection().getSlot(options),
    getLatestBlockhash,
    getTransaction,
    getSignatureStatuses,
    accountExists,
    airdrop,
    call,
    sendTransaction,
    confirmTransaction,

    get connection() {
      return getConnection();
    },
  };
}

function parseAccount(
  account: Web3JsAccountInfo<Uint8Array>,
  publicKey: PublicKey
): RpcAccount {
  return {
    executable: account.executable,
    owner: fromWeb3JsPublicKey(account.owner),
    lamports: lamports(account.lamports),
    rentEpoch: account.rentEpoch ? BigInt(account.rentEpoch) : undefined,
    publicKey,
    data: new Uint8Array(account.data),
  };
}

function parseMaybeAccount(
  account: Web3JsAccountInfo<Uint8Array> | null,
  publicKey: PublicKey
): MaybeRpcAccount {
  return account
    ? { ...parseAccount(account, publicKey), exists: true }
    : { exists: false, publicKey };
}

function parseDataFilter(
  filter: RpcDataFilter
): Web3JsGetProgramAccountsFilter {
  if (!('memcmp' in filter)) return filter;
  const { bytes, ...rest } = filter.memcmp;
  return { memcmp: { ...rest, bytes: base58.deserialize(bytes)[0] } };
}

function parseConfirmStrategy(
  signature: TransactionSignature,
  options: RpcConfirmTransactionOptions
): Web3JsTransactionConfirmationStrategy {
  if (options.strategy.type === 'blockhash') {
    return {
      ...options.strategy,
      signature: base58.deserialize(signature)[0],
    };
  }
  return {
    ...options.strategy,
    signature: base58.deserialize(signature)[0],
    nonceAccountPubkey: toWeb3JsPublicKey(options.strategy.nonceAccountPubkey),
  };
}

function resolveCallParams<Params extends any[]>(
  args: Params,
  commitment?: Commitment,
  extra?: object
): Params {
  if (!commitment && !extra) return args;
  let options: any = {};
  if (commitment) options.commitment = commitment;
  if (extra) options = { ...options, ...extra };
  args.push(options);
  return args;
}
