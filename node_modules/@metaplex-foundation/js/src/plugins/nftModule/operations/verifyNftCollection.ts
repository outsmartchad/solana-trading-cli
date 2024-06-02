import {
  VerificationArgs,
  createVerifyCollectionInstruction,
  createVerifyInstruction,
  createVerifySizedCollectionItemInstruction,
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

const Key = 'VerifyNftCollectionOperation' as const;

/**
 * Verifies the collection of an NFT or SFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .verifyCollection({ mintAddress, collectionMintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const verifyNftCollectionOperation =
  useOperation<VerifyNftCollectionOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type VerifyNftCollectionOperation = Operation<
  typeof Key,
  VerifyNftCollectionInput,
  VerifyNftCollectionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type VerifyNftCollectionInput = {
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
export type VerifyNftCollectionOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const verifyNftCollectionOperationHandler: OperationHandler<VerifyNftCollectionOperation> =
  {
    handle: async (
      operation: VerifyNftCollectionOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<VerifyNftCollectionOutput> => {
      return verifyNftCollectionBuilder(
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
export type VerifyNftCollectionBuilderParams = Omit<
  VerifyNftCollectionInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that verifies the collection. */
  instructionKey?: string;
};

/**
 * Verifies the collection of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .verifyCollection({ mintAddress, collectionMintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const verifyNftCollectionBuilder = (
  metaplex: Metaplex,
  params: VerifyNftCollectionBuilderParams,
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
    };
    const instruction = isSizedCollection
      ? createVerifySizedCollectionItemInstruction(
          accounts,
          tokenMetadataProgram.address
        )
      : createVerifyCollectionInstruction(
          accounts,
          tokenMetadataProgram.address
        );
    instruction.keys.push({
      pubkey: metaplex.nfts().pdas().collectionAuthorityRecord({
        mint: collectionMintAddress,
        collectionAuthority: collectionAuthority.publicKey,
        programs,
      }),
      isWritable: false,
      isSigner: false,
    });

    return TransactionBuilder.make()
      .setFeePayer(payer)
      .add({
        instruction,
        signers: [payer, collectionAuthority],
        key: params.instructionKey ?? 'verifyCollection',
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
      instruction: createVerifyInstruction(
        {
          authority: collectionAuthority.publicKey,
          delegateRecord,
          metadata,
          collectionMint: collectionMintAddress,
          collectionMetadata,
          collectionMasterEdition: collectionEdition,
          systemProgram: systemProgram.address,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        { verificationArgs: VerificationArgs.CollectionV1 },
        tokenMetadataProgram.address
      ),
      signers: [collectionAuthority],
      key: params.instructionKey ?? 'verifyCollection',
    });
};
