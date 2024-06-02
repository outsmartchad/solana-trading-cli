import { PublicKey } from '@solana/web3.js';
import { createTransferInstruction } from '@metaplex-foundation/mpl-bubblegum';
import {
  MerkleTree,
  ConcurrentMerkleTreeAccount,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '@solana/spl-account-compression';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  TokenMetadataAuthorityHolder,
  TokenMetadataAuthorityTokenDelegate,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import { Sft } from '../models';
import { Metaplex } from '@/Metaplex';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  GetAssetProofRpcResponse,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  useOperation,
  TransferNftCompressionParam,
  ReadApiAsset,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'TransferCompressedNftOperation' as const;

/**
 * Transfers a compressed NFT or SFT from one account to another.
 *
 * ```ts
 * await metaplex.nfts().transfer({
 *   nftOrSft,
 *   toOwner,
 * });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const transferCompressedNftOperation =
  useOperation<TransferCompressedNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type TransferCompressedNftOperation = Operation<
  typeof Key,
  TransferCompressedNftInput,
  TransferCompressedNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type TransferCompressedNftInput = {
  /**
   * The compressed NFT or SFT to transfer.
   * We only need its address and token standard.
   */
  nftOrSft: Sft;

  /**
   * An authority allowed to transfer the asset.
   *
   * Note that Metadata authorities are
   * not supported for this instruction.
   *
   * If a `Signer` is provided directly,
   * it will be used as an Holder authority.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority?:
    | Signer
    | TokenMetadataAuthorityTokenDelegate
    | TokenMetadataAuthorityHolder;

  /**
   * The authorization rules and data to use for the transfer.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;

  /**
   * The wallet to get the tokens from.
   *
   * @defaultValue The public key of the provided authority.
   */
  fromOwner?: PublicKey;

  /**
   * The token account to be debited.
   *
   * @defaultValue Defaults to the associated token account of `fromOwner`.
   */
  fromToken?: PublicKey;

  /**
   * The wallet to send the tokens to.
   */
  toOwner: PublicKey;

  /**
   * The token account to be credited.
   *
   * @defaultValue Defaults to the associated token account of `toOwner`.
   */
  toToken?: PublicKey;

  /**
   * The amount of tokens to transfer.
   *
   * @defaultValue `token(1)`
   */
  amount?: SplTokenAmount;

  /**
   * The compression data needed for transfer.
   * Including the assetProof, concurrent merkle tree account info, and compression metadata.
   */
  compression: TransferNftCompressionParam;
};

/**
 * @group Operations
 * @category Outputs
 */
export type TransferCompressedNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const transferCompressedNftOperationHandler: OperationHandler<TransferCompressedNftOperation> =
  {
    handle: async (
      operation: TransferCompressedNftOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<TransferCompressedNftOutput> => {
      return transferCompressedNftBuilder(
        metaplex,
        operation.input,
        scope
      ).sendAndConfirm(metaplex, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type TransferCompressedNftBuilderParams = Omit<
  TransferCompressedNftInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Transfers a compressed NFT from one account to another.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .transfer({
 *     nftOrSft,
 *     toOwner,
 *     compression,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const transferCompressedNftBuilder = (
  metaplex: Metaplex,
  params: TransferCompressedNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { toOwner, compression } = params;

  // ensure all required compression data has been supplied
  if (
    !compression.merkleTree ||
    !compression.assetProof ||
    !compression.data ||
    !compression.ownership
  )
    throw Error('Invalid compression data supplied');

  const merkleTree = new PublicKey(compression.assetProof.tree_id);
  const treeAuthority = compression.merkleTree?.getAuthority();
  const canopyDepth = compression.merkleTree?.getCanopyDepth();

  const leafOwner = new PublicKey(compression.ownership.owner);
  const leafDelegate = !!compression.ownership?.delegate
    ? new PublicKey(compression.ownership.delegate)
    : leafOwner;

  // check if the provided assetProof path is valid for the provided root
  if (
    !MerkleTree.verify(new PublicKey(compression.assetProof.root).toBuffer(), {
      leafIndex: compression.data.leaf_id,
      leaf: new PublicKey(compression.assetProof.leaf).toBuffer(),
      root: new PublicKey(compression.assetProof.root).toBuffer(),
      proof: compression.assetProof.proof.map((node: string) =>
        new PublicKey(node).toBuffer()
      ),
    })
  )
    throw Error('Provided proof path did not pass verification');

  // parse the list of proof addresses into a valid AccountMeta[]
  const proofPath = compression.assetProof.proof
    .map((node: string) => ({
      pubkey: new PublicKey(node),
      isSigner: false,
      isWritable: false,
    }))
    .slice(
      0,
      compression.assetProof.proof.length - (!!canopyDepth ? canopyDepth : 0)
    );

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createTransferInstruction(
        {
          merkleTree,
          treeAuthority,
          leafOwner,
          leafDelegate,
          newLeafOwner: toOwner,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          anchorRemainingAccounts: proofPath,
        },
        {
          root: [
            ...new PublicKey(compression.assetProof.root.trim()).toBytes(),
          ],
          dataHash: [
            ...new PublicKey(compression.data.data_hash.trim()).toBytes(),
          ],
          creatorHash: [
            ...new PublicKey(compression.data.creator_hash.trim()).toBytes(),
          ],
          nonce: compression.data.leaf_id,
          index: compression.data.leaf_id,
        }
      ),
      signers: [payer],
      key: params.instructionKey ?? 'transferCompressedNft',
    });
};

/**
 * Helper function to auto fetch the asset proof data from the ReadApi
 */
export async function prepareTransferCompressedNftBuilder(
  metaplex: Metaplex,
  params: TransferCompressedNftBuilderParams
): Promise<TransferCompressedNftBuilderParams> {
  if (!params?.compression) params.compression = {};

  // auto fetch the assetProof data from the ReadApi, when not provided
  if (!params?.compression?.assetProof) {
    params.compression.assetProof = (await metaplex
      .rpc()
      .getAssetProof(params.nftOrSft.address)) as GetAssetProofRpcResponse;
  }

  const [asset, merkleTree] = await Promise.all([
    // get the asset from the ReadApi
    metaplex.rpc().getAsset(params.nftOrSft.address),

    // get the on-chain merkle tree AccountInfo (mainly needed for the `canopyHeight`)
    ConcurrentMerkleTreeAccount.fromAccountAddress(
      metaplex.connection,
      new PublicKey(params.compression.assetProof.tree_id)
    ),
  ]);

  // update the params data for use by the transfer operation
  params.compression.merkleTree = merkleTree;
  params.compression.data = (asset as ReadApiAsset).compression;
  params.compression.ownership = (asset as ReadApiAsset).ownership;

  return params as TransferCompressedNftBuilderParams;
}
