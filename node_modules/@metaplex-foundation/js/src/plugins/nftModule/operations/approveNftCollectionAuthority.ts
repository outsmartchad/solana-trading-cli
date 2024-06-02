import { createApproveCollectionAuthorityInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
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

const Key = 'ApproveNftCollectionAuthorityOperation' as const;

/**
 * Approves a new collection authority.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .approveCollectionAuthority({
 *     mintAddress,
 *     collectionAuthority,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const approveNftCollectionAuthorityOperation =
  useOperation<ApproveNftCollectionAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ApproveNftCollectionAuthorityOperation = Operation<
  typeof Key,
  ApproveNftCollectionAuthorityInput,
  ApproveNftCollectionAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ApproveNftCollectionAuthorityInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the collection authority to approve. */
  collectionAuthority: PublicKey;

  /**
   * The update authority of the NFT or SFT as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  updateAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ApproveNftCollectionAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const approveNftCollectionAuthorityOperationHandler: OperationHandler<ApproveNftCollectionAuthorityOperation> =
  {
    handle: async (
      operation: ApproveNftCollectionAuthorityOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<ApproveNftCollectionAuthorityOutput> => {
      return approveNftCollectionAuthorityBuilder(
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
export type ApproveNftCollectionAuthorityBuilderParams = Omit<
  ApproveNftCollectionAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that approves the collection authority. */
  instructionKey?: string;
};

/**
 * Approves a new collection authority.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .approveCollectionAuthority({
 *     mintAddress,
 *     collectionAuthority,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const approveNftCollectionAuthorityBuilder = (
  metaplex: Metaplex,
  params: ApproveNftCollectionAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    collectionAuthority,
    updateAuthority = metaplex.identity(),
  } = params;

  // Programs.
  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  // PDAs.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const collectionAuthorityRecord = metaplex
    .nfts()
    .pdas()
    .collectionAuthorityRecord({
      mint: mintAddress,
      collectionAuthority,
      programs,
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Approve the collection authority.
      .add({
        instruction: createApproveCollectionAuthorityInstruction(
          {
            collectionAuthorityRecord,
            newCollectionAuthority: collectionAuthority,
            updateAuthority: updateAuthority.publicKey,
            payer: payer.publicKey,
            metadata,
            mint: mintAddress,
            systemProgram: systemProgram.address,
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, updateAuthority],
        key: params.instructionKey ?? 'approveCollectionAuthority',
      })
  );
};
