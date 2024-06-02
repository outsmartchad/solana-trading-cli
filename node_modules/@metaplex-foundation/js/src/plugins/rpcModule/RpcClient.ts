import { Buffer } from 'buffer';
import {
  AccountInfo,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Commitment,
  ConfirmOptions,
  GetLatestBlockhashConfig,
  GetProgramAccountsConfig,
  PublicKey,
  RpcResponseAndContext,
  SendOptions,
  SignatureResult,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import {
  FailedToConfirmTransactionError,
  FailedToConfirmTransactionWithResponseError,
  FailedToSendTransactionError,
  MetaplexError,
  ParsedProgramError,
  RpcError,
  UnknownProgramError,
} from '@/errors';
import type { Metaplex } from '@/Metaplex';
import {
  assertSol,
  getSignerHistogram,
  isErrorWithLogs,
  lamports,
  Program,
  Signer,
  SolAmount,
  UnparsedAccount,
  UnparsedMaybeAccount,
} from '@/types';
import { TransactionBuilder, zipMap } from '@/utils';

import type {
  ReadApiAsset,
  ReadApiAssetList,
  GetAssetProofRpcResponse,
  GetAssetsByGroupRpcInput,
  GetAssetsByOwnerRpcInput,
} from '@/types/ReadApi';
import { ReadApiConnection } from '@/utils/readApiConnection';

export type ConfirmTransactionResponse = RpcResponseAndContext<SignatureResult>;
export type SendAndConfirmTransactionResponse = {
  signature: TransactionSignature;
  confirmResponse: ConfirmTransactionResponse;
  blockhash: Blockhash;
  lastValidBlockHeight: number;
};

/**
 * @group Modules
 */
export class RpcClient {
  protected defaultFeePayer?: Signer;

  constructor(protected readonly metaplex: Metaplex) {}

  protected async prepareTransaction(
    transaction: Transaction | TransactionBuilder,
    signers: Signer[]
  ): Promise<{
    transaction: Transaction;
    signers: Signer[];
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
  }> {
    let blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
    if (
      !('records' in transaction) &&
      transaction.recentBlockhash &&
      transaction.lastValidBlockHeight
    ) {
      blockhashWithExpiryBlockHeight = {
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
      };
    } else {
      blockhashWithExpiryBlockHeight = await this.getLatestBlockhash();
    }

    if ('records' in transaction) {
      signers = [...transaction.getSigners(), ...signers];
      transaction = transaction.toTransaction(blockhashWithExpiryBlockHeight);
    }

    return { transaction, signers, blockhashWithExpiryBlockHeight };
  }

  async signTransaction(
    transaction: Transaction,
    signers: Signer[]
  ): Promise<Transaction> {
    const { keypairs, identities } = getSignerHistogram(signers);

    // Keypair signers.
    if (keypairs.length > 0) {
      transaction.partialSign(...keypairs);
    }

    // Identity signers.
    for (let i = 0; i < identities.length; i++) {
      transaction = await identities[i].signTransaction(transaction);
    }

    return transaction;
  }

  async sendTransaction(
    transaction: Transaction | TransactionBuilder,
    sendOptions: SendOptions = {},
    signers: Signer[] = []
  ): Promise<TransactionSignature> {
    const prepared = await this.prepareTransaction(transaction, signers);
    transaction = prepared.transaction;
    signers = prepared.signers;

    const defaultFeePayer = this.getDefaultFeePayer();
    if (!transaction.feePayer && defaultFeePayer) {
      transaction.feePayer = defaultFeePayer.publicKey;
      signers = [defaultFeePayer, ...signers];
    }

    transaction = await this.signTransaction(transaction, signers);
    const rawTransaction = transaction.serialize();

    try {
      return await this.metaplex.connection.sendRawTransaction(
        rawTransaction,
        sendOptions
      );
    } catch (error) {
      throw this.parseProgramError(error, transaction);
    }
  }

  async confirmTransaction(
    signature: TransactionSignature,
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight,
    commitment?: Commitment
  ): Promise<ConfirmTransactionResponse> {
    let rpcResponse: ConfirmTransactionResponse;
    try {
      rpcResponse = await this.metaplex.connection.confirmTransaction(
        { signature, ...blockhashWithExpiryBlockHeight },
        commitment
      );
    } catch (error) {
      throw new FailedToConfirmTransactionError(error as Error);
    }

    if (rpcResponse.value.err) {
      throw new FailedToConfirmTransactionWithResponseError(rpcResponse);
    }

    return rpcResponse;
  }

  async sendAndConfirmTransaction(
    transaction: Transaction | TransactionBuilder,
    confirmOptions?: ConfirmOptions,
    signers: Signer[] = []
  ): Promise<SendAndConfirmTransactionResponse> {
    const prepared = await this.prepareTransaction(transaction, signers);
    const { blockhashWithExpiryBlockHeight } = prepared;
    transaction = prepared.transaction;
    signers = prepared.signers;

    const signature = await this.sendTransaction(
      transaction,
      confirmOptions,
      signers
    );

    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      confirmOptions?.commitment
    );

    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  async getAccount(publicKey: PublicKey, commitment?: Commitment) {
    const accountInfo = await this.metaplex.connection.getAccountInfo(
      publicKey,
      commitment
    );

    return this.getUnparsedMaybeAccount(publicKey, accountInfo);
  }

  async accountExists(publicKey: PublicKey, commitment?: Commitment) {
    const balance = await this.metaplex.connection.getBalance(
      publicKey,
      commitment
    );

    return balance > 0;
  }

  async getMultipleAccounts(publicKeys: PublicKey[], commitment?: Commitment) {
    const accountInfos = await this.metaplex.connection.getMultipleAccountsInfo(
      publicKeys,
      commitment
    );

    return zipMap(publicKeys, accountInfos, (publicKey, accountInfo) => {
      return this.getUnparsedMaybeAccount(publicKey, accountInfo);
    });
  }

  async getProgramAccounts(
    programId: PublicKey,
    configOrCommitment?: GetProgramAccountsConfig | Commitment
  ): Promise<UnparsedAccount[]> {
    const accounts = await this.metaplex.connection.getProgramAccounts(
      programId,
      configOrCommitment
    );

    return accounts.map(({ pubkey, account }) => ({
      ...account,
      publicKey: pubkey,
      lamports: lamports(account.lamports),
    }));
  }

  async airdrop(
    publicKey: PublicKey,
    amount: SolAmount,
    commitment?: Commitment
  ): Promise<SendAndConfirmTransactionResponse> {
    assertSol(amount);

    const signature = await this.metaplex.connection.requestAirdrop(
      publicKey,
      amount.basisPoints.toNumber()
    );

    const blockhashWithExpiryBlockHeight = await this.getLatestBlockhash();
    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      commitment
    );

    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  async getBalance(
    publicKey: PublicKey,
    commitment?: Commitment
  ): Promise<SolAmount> {
    const balance = await this.metaplex.connection.getBalance(
      publicKey,
      commitment
    );

    return lamports(balance);
  }

  async getRent(bytes: number, commitment?: Commitment): Promise<SolAmount> {
    const rent =
      await this.metaplex.connection.getMinimumBalanceForRentExemption(
        bytes,
        commitment
      );

    return lamports(rent);
  }

  async getLatestBlockhash(
    commitmentOrConfig: Commitment | GetLatestBlockhashConfig = 'finalized'
  ): Promise<BlockhashWithExpiryBlockHeight> {
    return this.metaplex.connection.getLatestBlockhash(commitmentOrConfig);
  }

  getSolanaExporerUrl(signature: string): string {
    let clusterParam = '';
    switch (this.metaplex.cluster) {
      case 'devnet':
        clusterParam = '?cluster=devnet';
        break;
      case 'testnet':
        clusterParam = '?cluster=testnet';
        break;
      case 'localnet':
      case 'custom':
        const url = encodeURIComponent(this.metaplex.connection.rpcEndpoint);
        clusterParam = `?cluster=custom&customUrl=${url}`;
        break;
    }

    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  }

  setDefaultFeePayer(payer: Signer) {
    this.defaultFeePayer = payer;

    return this;
  }

  getDefaultFeePayer(): Signer {
    return this.defaultFeePayer
      ? this.defaultFeePayer
      : this.metaplex.identity();
  }

  protected getUnparsedMaybeAccount(
    publicKey: PublicKey,
    accountInfo: AccountInfo<Buffer> | null
  ): UnparsedMaybeAccount {
    if (!accountInfo) {
      return { publicKey, exists: false };
    }

    return {
      ...accountInfo,
      publicKey,
      exists: true,
      lamports: lamports(accountInfo.lamports),
    };
  }

  async getAsset(assetId: PublicKey): Promise<ReadApiAsset | MetaplexError> {
    if (this.metaplex.connection instanceof ReadApiConnection) {
      return await this.metaplex.connection.getAsset(assetId);
    }

    return new RpcError(
      'Method not supported! Use a ReadApiConnection instead'
    );
  }

  async getAssetProof(
    assetId: PublicKey
  ): Promise<GetAssetProofRpcResponse | MetaplexError> {
    if (this.metaplex.connection instanceof ReadApiConnection) {
      return await this.metaplex.connection.getAssetProof(assetId);
    }

    return new RpcError(
      'Method not supported! Use a ReadApiConnection instead'
    );
  }

  async getAssetsByGroup({
    groupKey,
    groupValue,
    page,
    limit,
    sortBy,
    before,
    after,
  }: GetAssetsByGroupRpcInput): Promise<ReadApiAssetList | MetaplexError> {
    if (this.metaplex.connection instanceof ReadApiConnection) {
      return await this.metaplex.connection.getAssetsByGroup({
        groupKey,
        groupValue,
        page,
        limit,
        sortBy,
        before,
        after,
      });
    }

    return new RpcError(
      'Method not supported! Use a ReadApiConnection instead'
    );
  }

  async getAssetsByOwner({
    ownerAddress,
    page,
    limit,
    sortBy,
    before,
    after,
  }: GetAssetsByOwnerRpcInput): Promise<ReadApiAssetList | MetaplexError> {
    if (this.metaplex.connection instanceof ReadApiConnection) {
      return await this.metaplex.connection.getAssetsByOwner({
        ownerAddress,
        page,
        limit,
        sortBy,
        before,
        after,
      });
    }

    return new RpcError(
      'Method not supported! Use a ReadApiConnection instead'
    );
  }

  protected parseProgramError(
    error: unknown,
    transaction: Transaction
  ): MetaplexError {
    // Ensure the error as logs.
    if (!isErrorWithLogs(error)) {
      return new FailedToSendTransactionError(error as Error);
    }

    // Parse the instruction number.
    const regex = /Error processing Instruction (\d+):/;
    const instruction: string | null = error.message.match(regex)?.[1] ?? null;

    // Ensure there is an instruction number given to find the program.
    if (!instruction) {
      return new FailedToSendTransactionError(error);
    }

    // Get the program ID from the instruction in the transaction.
    const instructionNumber: number = parseInt(instruction, 10);
    const programId: PublicKey | null =
      transaction.instructions?.[instructionNumber]?.programId ?? null;

    // Ensure we were able to find a program ID for the instruction.
    if (!programId) {
      return new FailedToSendTransactionError(error);
    }

    // Find a registered program if any.
    let program: Program;
    try {
      program = this.metaplex.programs().get(programId);
    } catch (_programNotFoundError) {
      return new FailedToSendTransactionError(error);
    }

    // Ensure an error resolver exists on the program.
    if (!program.errorResolver) {
      return new UnknownProgramError(program, error);
    }

    // Finally, resolve the error.
    const resolvedError = program.errorResolver(error);

    return resolvedError
      ? new ParsedProgramError(program, resolvedError, error.logs)
      : new UnknownProgramError(program, error);
  }
}
