import { createSetCollectionSizeInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Metaplex } from '@/Metaplex';
import {
  BigNumber,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'MigrateToSizedCollectionNftOperation' as const;

/**
 * Migrates a legacy Collection NFT to a sized Collection NFT.
 * Both can act as a Collection for NFTs but only the latter
 * keeps track of the size of the collection on chain.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .migrateToSizedCollection({ mintAddress, size: toBigNumber(10000) };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const migrateToSizedCollectionNftOperation =
  useOperation<MigrateToSizedCollectionNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type MigrateToSizedCollectionNftOperation = Operation<
  typeof Key,
  MigrateToSizedCollectionNftInput,
  MigrateToSizedCollectionNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type MigrateToSizedCollectionNftInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * An authority that can update the Collection NFT at the
   * given mint address. This can either be the update authority
   * for that Collection NFT or an approved delegate authority.
   *
   * @defaultValue `metaplex.identity()`
   */
  collectionAuthority?: Signer;

  /**
   * The current size of all **verified** NFTs and/or SFTs within
   * the Collection.
   *
   * **Warning, once set, this size can no longer be updated.**
   */
  size: BigNumber;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority
   * using `metaplex.nfts().approveCollectionAuthority()`.
   *
   * @defaultValue `false`
   */
  isDelegated?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type MigrateToSizedCollectionNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const migrateToSizedCollectionNftOperationHandler: OperationHandler<MigrateToSizedCollectionNftOperation> =
  {
    handle: async (
      operation: MigrateToSizedCollectionNftOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<MigrateToSizedCollectionNftOutput> => {
      return migrateToSizedCollectionNftBuilder(
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
export type MigrateToSizedCollectionNftBuilderParams = Omit<
  MigrateToSizedCollectionNftInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that sets the collection size. */
  instructionKey?: string;
};

/**
 * Migrates a legacy Collection NFT to a sized Collection NFT.
 * Both can act as a Collection for NFTs but only the latter
 * keeps track of the size of the collection on chain.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .migrateToSizedCollection({ mintAddress, size: toBigNumber(10000) });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const migrateToSizedCollectionNftBuilder = (
  metaplex: Metaplex,
  params: MigrateToSizedCollectionNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    collectionAuthority = metaplex.identity(),
    size,
    isDelegated = false,
  } = params;

  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const nftPdas = metaplex.nfts().pdas();

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createSetCollectionSizeInstruction(
          {
            collectionMetadata: nftPdas.metadata({
              mint: mintAddress,
              programs,
            }),
            collectionAuthority: collectionAuthority.publicKey,
            collectionMint: mintAddress,
            collectionAuthorityRecord: isDelegated
              ? nftPdas.collectionAuthorityRecord({
                  mint: mintAddress,
                  collectionAuthority: collectionAuthority.publicKey,
                  programs,
                })
              : undefined,
          },
          { setCollectionSizeArgs: { size } },
          tokenMetadataProgram.address
        ),
        signers: [collectionAuthority],
        key: params.instructionKey ?? 'setCollectionSize',
      })
  );
};
