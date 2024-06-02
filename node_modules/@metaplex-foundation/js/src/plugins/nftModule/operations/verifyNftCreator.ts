import {
  VerificationArgs,
  createVerifyInstruction,
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

const Key = 'VerifyNftCreatorOperation' as const;

/**
 * Verifies the creator of an NFT or SFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .verifyCreator({ mintAddress, creator };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const verifyNftCreatorOperation =
  useOperation<VerifyNftCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type VerifyNftCreatorOperation = Operation<
  typeof Key,
  VerifyNftCreatorInput,
  VerifyNftCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type VerifyNftCreatorInput = {
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
export type VerifyNftCreatorOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const verifyNftCreatorOperationHandler: OperationHandler<VerifyNftCreatorOperation> =
  {
    handle: async (
      operation: VerifyNftCreatorOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<VerifyNftCreatorOutput> => {
      return verifyNftCreatorBuilder(
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
export type VerifyNftCreatorBuilderParams = Omit<
  VerifyNftCreatorInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that verifies the creator. */
  instructionKey?: string;
};

/**
 * Verifies the creator of an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .verifyCreator({ mintAddress, creator });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const verifyNftCreatorBuilder = (
  metaplex: Metaplex,
  params: VerifyNftCreatorBuilderParams,
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
        instruction: createVerifyInstruction(
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
        key: params.instructionKey ?? 'verifyCreator',
      })
  );
};
