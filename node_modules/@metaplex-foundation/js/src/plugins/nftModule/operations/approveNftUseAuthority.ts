import { createApproveUseAuthorityInstruction } from '@metaplex-foundation/mpl-token-metadata';
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

const Key = 'ApproveNftUseAuthorityOperation' as const;

/**
 * Approves a new use authority.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .approveUseAuthority({ mintAddress, user };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const approveNftUseAuthorityOperation =
  useOperation<ApproveNftUseAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ApproveNftUseAuthorityOperation = Operation<
  typeof Key,
  ApproveNftUseAuthorityInput,
  ApproveNftUseAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ApproveNftUseAuthorityInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the use authority to approve. */
  user: PublicKey;

  /**
   * The owner of the NFT or SFT as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  owner?: Signer;

  /**
   * The address of the token account linking the mint account
   * with the owner account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `owner` parameters.
   */
  ownerTokenAddress?: PublicKey;

  /**
   * The number of usages this new use authority
   * is allowed to perform.
   *
   * @defaultValue `1`
   */
  numberOfUses?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type ApproveNftUseAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const approveNftUseAuthorityOperationHandler: OperationHandler<ApproveNftUseAuthorityOperation> =
  {
    handle: async (
      operation: ApproveNftUseAuthorityOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<ApproveNftUseAuthorityOutput> => {
      return approveNftUseAuthorityBuilder(
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
export type ApproveNftUseAuthorityBuilderParams = Omit<
  ApproveNftUseAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that approves the use authority. */
  instructionKey?: string;
};

/**
 * Approves a new use authority.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .approveUseAuthority({ mintAddress, user });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const approveNftUseAuthorityBuilder = (
  metaplex: Metaplex,
  params: ApproveNftUseAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { mintAddress, user, owner = metaplex.identity() } = params;

  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const useAuthorityRecord = metaplex.nfts().pdas().useAuthorityRecord({
    mint: mintAddress,
    useAuthority: user,
    programs,
  });
  const programAsBurner = metaplex.nfts().pdas().burner({
    programs,
  });
  const ownerTokenAddress =
    params.ownerTokenAddress ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: owner.publicKey,
      programs,
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Approve the use authority.
      .add({
        instruction: createApproveUseAuthorityInstruction(
          {
            useAuthorityRecord,
            owner: owner.publicKey,
            payer: payer.publicKey,
            user,
            ownerTokenAccount: ownerTokenAddress,
            metadata,
            mint: mintAddress,
            burner: programAsBurner,
            tokenProgram: tokenProgram.address,
            systemProgram: systemProgram.address,
          },
          {
            approveUseAuthorityArgs: {
              numberOfUses: params.numberOfUses ?? 1,
            },
          },
          tokenMetadataProgram.address
        ),
        signers: [owner, payer],
        key: params.instructionKey ?? 'approveUseAuthority',
      })
  );
};
