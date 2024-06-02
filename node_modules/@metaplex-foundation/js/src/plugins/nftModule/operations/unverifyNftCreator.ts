import {
  VerificationArgs,
  createUnverifyInstruction,
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

const Key = 'UnverifyNftCreatorOperation' as const;

/**
 * Unverifies the creator of an NFT or SFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .unverifyCreator({ mintAddress, creator };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unverifyNftCreatorOperation =
  useOperation<UnverifyNftCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnverifyNftCreatorOperation = Operation<
  typeof Key,
  UnverifyNftCreatorInput,
  UnverifyNftCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnverifyNftCreatorInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The creator of the NFT or SFT as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  creator?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnverifyNftCreatorOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unverifyNftCreatorOperationHandler: OperationHandler<UnverifyNftCreatorOperation> =
  {
    handle: async (
      operation: UnverifyNftCreatorOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UnverifyNftCreatorOutput> => {
      return unverifyNftCreatorBuilder(
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
export type UnverifyNftCreatorBuilderParams = Omit<
  UnverifyNftCreatorInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that unverifies the creator. */
  instructionKey?: string;
};

/**
 * Unverifies the creator of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .unverifyCreator({ mintAddress, creator });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unverifyNftCreatorBuilder = (
  metaplex: Metaplex,
  params: UnverifyNftCreatorBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { mintAddress, creator = metaplex.identity() } = params;

  // Programs.
  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Verify the creator.
      .add({
        instruction: createUnverifyInstruction(
          {
            authority: creator.publicKey,
            metadata: metaplex.nfts().pdas().metadata({
              mint: mintAddress,
              programs,
            }),
            systemProgram: systemProgram.address,
            sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          },
          { verificationArgs: VerificationArgs.CreatorV1 },
          tokenMetadataProgram.address
        ),
        signers: [creator],
        key: params.instructionKey ?? 'unverifyCreator',
      })
  );
};
