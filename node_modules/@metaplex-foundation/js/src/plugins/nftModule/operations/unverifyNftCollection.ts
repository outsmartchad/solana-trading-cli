import {
  VerificationArgs,
  createUnverifyCollectionInstruction,
  createUnverifyInstruction,
  createUnverifySizedCollectionItemInstruction,
} from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Metaplex } from '@/Metaplex';
import {
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

const Key = 'UnverifyNftCollectionOperation' as const;

/**
 * Unverifies the collection of an NFT or SFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .unverifyCollection({ mintAddress, collectionMintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unverifyNftCollectionOperation =
  useOperation<UnverifyNftCollectionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnverifyNftCollectionOperation = Operation<
  typeof Key,
  UnverifyNftCollectionInput,
  UnverifyNftCollectionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnverifyNftCollectionInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The mint address of the collection NFT. */
  collectionMintAddress: PublicKey;

  /**
   * An authority that can verify and unverify collection items
   * from the provided `collectionMintAddress`.
   *
   * @defaultValue `metaplex.identity()`
   */
  collectionAuthority?: Signer;

  /**
   * Whether or not the provided `collectionMintAddress` is a
   * sized collection (as opposed to a legacy collection).
   *
   * @defaultValue `true`
   */
  isSizedCollection?: boolean;

  /**
   * Whether or not the provided `collectionAuthority` is a delegated
   * collection authority, i.e. it was approved by the update authority.
   *
   * - `false` means the collection authority is the update authority of the collection.
   * - `legacyDelegate` means the collection authority is a delegate that was approved
   *  using the legacy `metaplex.nfts().approveCollectionAuthority()` operation.
   * - `metadataDelegate` means the collection authority is a delegate that was approved
   *  using the new `metaplex.nfts().delegate()` operation.
   * - `true` is equivalent to `legacyDelegate` for backwards compatibility.
   *
   * @defaultValue `false`
   */
  isDelegated?: boolean | 'legacyDelegate' | 'metadataDelegate';

  /**
   * The update authority of the Collection NFT.
   *
   * This is used to compute the metadata delegate record when
   * `isDelegated` is equal to `"metadataDelegate"`.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  collectionUpdateAuthority?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnverifyNftCollectionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unverifyNftCollectionOperationHandler: OperationHandler<UnverifyNftCollectionOperation> =
  {
    handle: async (
      operation: UnverifyNftCollectionOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UnverifyNftCollectionOutput> => {
      return unverifyNftCollectionBuilder(
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
export type UnverifyNftCollectionBuilderParams = Omit<
  UnverifyNftCollectionInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that unverifies the collection. */
  instructionKey?: string;
};

/**
 * Unverifies the collection of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .unverifyCollection({ mintAddress, collectionMintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unverifyNftCollectionBuilder = (
  metaplex: Metaplex,
  params: UnverifyNftCollectionBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    collectionMintAddress,
    isSizedCollection = true,
    isDelegated = false,
    collectionAuthority = metaplex.identity(),
    collectionUpdateAuthority = metaplex.identity().publicKey,
  } = params;

  // Programs.
  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  // Accounts.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const collectionMetadata = metaplex.nfts().pdas().metadata({
    mint: collectionMintAddress,
    programs,
  });
  const collectionEdition = metaplex.nfts().pdas().masterEdition({
    mint: collectionMintAddress,
    programs,
  });

  if (isDelegated === 'legacyDelegate' || isDelegated === true) {
    const accounts = {
      metadata,
      collectionAuthority: collectionAuthority.publicKey,
      payer: payer.publicKey,
      collectionMint: collectionMintAddress,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionEdition,
      collectionAuthorityRecord: metaplex
        .nfts()
        .pdas()
        .collectionAuthorityRecord({
          mint: collectionMintAddress,
          collectionAuthority: collectionAuthority.publicKey,
          programs,
        }),
    };

    const instruction = isSizedCollection
      ? createUnverifySizedCollectionItemInstruction(
          accounts,
          tokenMetadataProgram.address
        )
      : createUnverifyCollectionInstruction(
          accounts,
          tokenMetadataProgram.address
        );

    return TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction,
        signers: [payer, collectionAuthority],
        key: params.instructionKey ?? 'unverifyCollection',
      });
  }

  const delegateRecord =
    isDelegated === 'metadataDelegate'
      ? metaplex.nfts().pdas().metadataDelegateRecord({
          mint: collectionMintAddress,
          type: 'CollectionV1',
          updateAuthority: collectionUpdateAuthority,
          delegate: collectionAuthority.publicKey,
          programs,
        })
      : undefined;

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUnverifyInstruction(
        {
          authority: collectionAuthority.publicKey,
          delegateRecord,
          metadata,
          collectionMint: collectionMintAddress,
          collectionMetadata,
          systemProgram: systemProgram.address,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        { verificationArgs: VerificationArgs.CollectionV1 },
        tokenMetadataProgram.address
      ),
      signers: [collectionAuthority],
      key: params.instructionKey ?? 'unverifyCollection',
    });
};
