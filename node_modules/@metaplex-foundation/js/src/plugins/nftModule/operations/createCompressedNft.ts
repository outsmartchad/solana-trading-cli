import {
  Uses,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  TokenProgramVersion,
  createMintToCollectionV1Instruction,
  getLeafAssetId,
  TokenStandard,
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
} from '@metaplex-foundation/mpl-bubblegum';
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  deserializeChangeLogEventV1,
} from '@solana/spl-account-compression';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import base58 from 'bs58';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertNft, Nft } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Creator,
  CreatorInput,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'CreateCompressedNftOperation' as const;

/**
 * Creates a new compressed NFT.
 *
 * ```ts
 * const { nft } = await metaplex
 *   .nfts()
 *   .createNft({
 *     name: 'My SFT',
 *     uri: 'https://example.com/my-nft',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *     tree: merkleTreeAccount
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createCompressedNftOperation =
  useOperation<CreateCompressedNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateCompressedNftOperation = Operation<
  typeof Key,
  CreateCompressedNftInput,
  CreateCompressedNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateCompressedNftInput = {
  /**
   * The authority that will be able to make changes
   * to the created SFT.
   *
   * This is required as a Signer because creating the
   * metadata account requires the update authority to be part
   * of the creators array as a verified creator.
   *
   * @defaultValue `metaplex.identity()`
   */
  updateAuthority?: Signer;

  /**
   * The address corresponding to the merkle tree where this
   * compressed NFT will be stored.
   *
   * Must be created ahead of time.
   *
   * @defaultValue `metaplex.identity()`
   */
  tree: PublicKey;

  /**
   * The owner of a token account associated with the SFT to create.
   *
   * This is completely optional as creating an SFT does not require
   * the existence of a token account. When provided, an associated
   * token account will be created from the given owner.
   *
   * You may alternatively pass the `tokenAddress` parameter instead.
   *
   * @defaultValue Defaults to not creating and/or minting
   * any token account.
   */
  tokenOwner?: PublicKey;

  /** The URI that points to the JSON metadata of the asset. */
  uri: string;

  /** The on-chain name of the asset, e.g. "My SFT". */
  name: string;

  /**
   * The royalties in percent basis point (i.e. 250 is 2.5%) that
   * should be paid to the creators on each secondary sale.
   */
  sellerFeeBasisPoints: number;

  /**
   * The on-chain symbol of the asset, stored in the Metadata account.
   * E.g. "MYSFT".
   *
   * @defaultValue `""`
   */
  symbol?: string;

  /**
   * {@inheritDoc CreatorInput}
   * @defaultValue
   * Defaults to using the provided `updateAuthority` as the only verified creator.
   * ```ts
   * [{
   *   address: updateAuthority.publicKey,
   *   authority: updateAuthority,
   *   share: 100,
   * }]
   * ```
   */
  creators?: CreatorInput[];

  /**
   * Whether or not the SFT's metadata is mutable.
   * When set to `false` no one can update the Metadata account,
   * not even the update authority.
   *
   * @defaultValue `true`
   */
  isMutable?: boolean;

  /**
   * When this field is not `null`, it indicates that the SFT
   * can be "used" by its owner or any approved "use authorities".
   *
   * @defaultValue `null`
   */
  uses?: Option<Uses>;

  /**
   * The Collection NFT that this new SFT belongs to.
   * When `null`, the created SFT will not be part of a collection.
   *
   * @defaultValue `null`
   */
  collection?: Option<PublicKey>;

  /**
   * The collection authority that should sign the created SFT
   * to prove that it is part of the provided collection.
   * When `null`, the provided `collection` will not be verified.
   *
   * @defaultValue `null`
   */
  collectionAuthority?: Option<Signer>;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority
   * using `metaplex.nfts().approveCollectionAuthority()`.
   *
   * @defaultValue `false`
   */
  collectionAuthorityIsDelegated?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateCompressedNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The newly created NFT and, potentially, its associated token. */
  nft: Nft;

  /** The mint address is the compressed NFT's assetId. */
  mintAddress: PublicKey;

  /** The metadata address is the compressed NFT's assetId. */
  metadataAddress: PublicKey;

  /** The master edition address is the compressed NFT's assetId. */
  masterEditionAddress: PublicKey;

  /** The token address is the compressed NFT's assetId. */
  tokenAddress: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createCompressedNftOperationHandler: OperationHandler<CreateCompressedNftOperation> =
  {
    handle: async (
      operation: CreateCompressedNftOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const builder = await createCompressedNftBuilder(
        metaplex,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        metaplex,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(metaplex, confirmOptions);
      scope.throwIfCanceled();

      const txInfo = await metaplex.connection.getTransaction(
        output.response.signature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );
      scope.throwIfCanceled();

      // find the index of the bubblegum instruction
      const relevantIndex =
        txInfo!.transaction.message.compiledInstructions.findIndex(
          (instruction) => {
            return (
              txInfo?.transaction.message.staticAccountKeys[
                instruction.programIdIndex
              ].toBase58() === 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'
            );
          }
        );

      // locate the no-op inner instructions called via cpi from bubblegum
      const relevantInnerIxs = txInfo!.meta?.innerInstructions?.[
        relevantIndex
      ].instructions.filter((instruction) => {
        return (
          txInfo?.transaction.message.staticAccountKeys[
            instruction.programIdIndex
          ].toBase58() === 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'
        );
      });

      // when no valid noop instructions are found, throw an error
      if (!relevantInnerIxs || relevantInnerIxs.length == 0)
        throw Error('Unable to locate valid noop instructions');

      // locate the asset index by attempting to locate and parse the correct `relevantInnerIx`
      let assetIndex: number | undefined = undefined;
      // note: the `assetIndex` is expected to be at position `1`, and normally expect only 2 `relevantInnerIx`
      for (let i = relevantInnerIxs.length - 1; i > 0; i--) {
        try {
          const changeLogEvent = deserializeChangeLogEventV1(
            Buffer.from(base58.decode(relevantInnerIxs[i]?.data!))
          );

          // extract a successful changelog index
          assetIndex = changeLogEvent?.index;
        } catch (__) {
          // do nothing, invalid data is handled just after the for loop
        }
      }

      // when no `assetIndex` was found, throw an error
      if (typeof assetIndex == 'undefined')
        throw Error('Unable to locate the newly minted assetId ');

      const assetId = await getLeafAssetId(
        operation.input.tree,
        new BN(assetIndex)
      );

      const nft = await metaplex.nfts().findByAssetId(
        {
          assetId,
        },
        scope
      );
      scope.throwIfCanceled();

      assertNft(nft);

      return {
        ...output,
        nft,
        /**
         * the assetId is impossible to know before the compressed nft is minted
         * all these addresses are derived from, or are, the `assetId`
         */
        mintAddress: assetId,
        tokenAddress: assetId,
        metadataAddress: nft.metadataAddress,
        masterEditionAddress: nft.edition.address,
      };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateCompressedNftBuilderParams = Omit<
  CreateCompressedNftInput,
  'confirmOptions' | 'tokenAddress' | 'metadataAddress' | 'masterEditionAddress'
> & {
  /**
   * Whether or not the provided token account already exists.
   * If `false`, we'll add another instruction to create it.
   *
   * @defaultValue `true`
   */
  tokenExists?: boolean;

  /** A key to distinguish the instruction that creates the mint account. */
  createMintAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the mint account. */
  initializeMintInstructionKey?: string;

  /** A key to distinguish the instruction that creates the associated token account. */
  createAssociatedTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that creates the token account. */
  createTokenAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the token account. */
  initializeTokenInstructionKey?: string;

  /** A key to distinguish the instruction that mints tokens. */
  mintTokensInstructionKey?: string;

  /** A key to distinguish the instruction that creates the metadata account. */
  createMetadataInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateCompressedNftBuilderContext = Omit<
  CreateCompressedNftOutput,
  'response' | 'nft'
>;

/**
 * Creates a new compressed NFT.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .nfts()
 *   .builders()
 *   .createCompressedNft({
 *     name: 'My SFT',
 *     uri: 'https://example.com/my-nft',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *     tree: merkleTreeAccount
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createCompressedNftBuilder = async (
  metaplex: Metaplex,
  params: CreateCompressedNftBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateCompressedNftBuilderContext>> => {
  const { payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { updateAuthority = metaplex.identity(), tree } = params;

  const creatorsInput: CreatorInput[] = params.creators ?? [
    {
      address: updateAuthority.publicKey,
      authority: updateAuthority,
      share: 100,
    },
  ];
  const creators: Option<Creator[]> =
    creatorsInput.length > 0
      ? creatorsInput.map((creator) => ({
          ...creator,
          verified: creator.address.equals(updateAuthority.publicKey),
        }))
      : null;

  // Likely that this information can only be derived after the mint
  // const verifyAdditionalCreatorInstructions = creatorsInput
  //   .filter((creator) => {
  //     return (
  //       !!creator.authority &&
  //       !creator.address.equals(updateAuthority.publicKey)
  //     );
  //   })
  //   .map((creator) => {
  //     return metaplex.nfts().builders().verifyCreator(
  //       {
  //         mintAddress,
  //         creator: creator.authority,
  //       },
  //       { programs, payer }
  //     );
  //   });

  return (
    TransactionBuilder.make<CreateCompressedNftBuilderContext>()
      .setFeePayer(payer)

      // Verify additional creators.
      // TODO(jon): Add the creator verification instructions
      // .add(...verifyAdditionalCreatorInstructions)

      // Verify collection.
      .when(!!params.collection && !!params.collectionAuthority, (builder) => {
        const { collection, collectionAuthority } = params;

        const [collectionMetadataAddress] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata', 'utf8'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            (collection as PublicKey).toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        );

        const [collectionMasterEditionAccount] =
          PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata', 'utf8'),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              (collection as PublicKey).toBuffer(),
              Buffer.from('edition', 'utf8'),
            ],
            TOKEN_METADATA_PROGRAM_ID
          );

        const [treeAuthority] = PublicKey.findProgramAddressSync(
          [tree.toBuffer()],
          BUBBLEGUM_PROGRAM_ID
        );

        const [bubblegumPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('collection_cpi', 'utf8')],
          BUBBLEGUM_PROGRAM_ID
        );

        return builder.add({
          instruction:
            // TODO(jon): We should be able to infer some of these in an intermediary SDK
            createMintToCollectionV1Instruction(
              {
                payer: payer.publicKey,

                merkleTree: tree,
                treeAuthority,
                // TODO(jon): Replace this delegate
                treeDelegate: payer.publicKey,

                // TODO(jon): This should respect the configured owner
                leafOwner: payer.publicKey,
                leafDelegate: payer.publicKey,

                collectionMetadata: collectionMetadataAddress,
                collectionMint: collection as PublicKey,
                collectionAuthority: (collectionAuthority as Signer).publicKey,
                // TODO(jon): This should be `collectionMasterEditionAccount`
                editionAccount: collectionMasterEditionAccount,

                // TODO(jon): Pass along another parameter for this field and default to the BUBBLEGUM_PROGRAM_ID
                collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,

                bubblegumSigner: bubblegumPDA,

                // Programs
                /* Account Compression */
                compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
                // TODO(jon): This argument should be `logWrapperProgram`
                logWrapper: SPL_NOOP_PROGRAM_ID,

                /* Bubblegum */
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
              },
              {
                metadataArgs: {
                  ...params,

                  symbol: params.symbol ?? '',
                  creators: creators ?? [],

                  isMutable: !!params.isMutable,
                  uses: params.uses ?? null,

                  // Only NonFungible tokens are supported.
                  tokenStandard: TokenStandard.NonFungible,
                  collection: {
                    key: collection as PublicKey,
                    // TODO(jon): Can we verify this here or do we need to send a separate instruction?
                    verified: false,
                  },

                  primarySaleHappened: false,
                  editionNonce: null,

                  tokenProgramVersion: TokenProgramVersion.Original,
                },
              }
            ),
          signers: [payer, params.collectionAuthority as Signer],
        });
      })
  );
};
