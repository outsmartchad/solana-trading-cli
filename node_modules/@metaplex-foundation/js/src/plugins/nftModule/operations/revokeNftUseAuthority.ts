import { createRevokeUseAuthorityInstruction } from '@metaplex-foundation/mpl-token-metadata';
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

const Key = 'RevokeNftUseAuthorityOperation' as const;

/**
 * Revokes an existing use authority.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .revokeUseAuthority({ mintAddress, user };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const revokeNftUseAuthorityOperation =
  useOperation<RevokeNftUseAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RevokeNftUseAuthorityOperation = Operation<
  typeof Key,
  RevokeNftUseAuthorityInput,
  RevokeNftUseAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RevokeNftUseAuthorityInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /** The address of the use authority to revoke. */
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
};

/**
 * @group Operations
 * @category Outputs
 */
export type RevokeNftUseAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const revokeNftUseAuthorityOperationHandler: OperationHandler<RevokeNftUseAuthorityOperation> =
  {
    handle: async (
      operation: RevokeNftUseAuthorityOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<RevokeNftUseAuthorityOutput> => {
      return revokeNftUseAuthorityBuilder(
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
export type RevokeNftUseAuthorityBuilderParams = Omit<
  RevokeNftUseAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that revokes the use authority. */
  instructionKey?: string;
};

/**
 * Revokes an existing use authority.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .revokeUseAuthority({ mintAddress, user });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const revokeNftUseAuthorityBuilder = (
  metaplex: Metaplex,
  params: RevokeNftUseAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { mintAddress, user, owner = metaplex.identity() } = params;

  // Programs.
  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  // PDAs.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const useAuthorityRecord = metaplex.nfts().pdas().useAuthorityRecord({
    mint: mintAddress,
    useAuthority: user,
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

      // Revoke the use authority.
      .add({
        instruction: createRevokeUseAuthorityInstruction(
          {
            useAuthorityRecord,
            owner: owner.publicKey,
            user,
            ownerTokenAccount: ownerTokenAddress,
            mint: mintAddress,
            metadata,
            tokenProgram: tokenProgram.address,
            systemProgram: systemProgram.address,
          },
          tokenMetadataProgram.address
        ),
        signers: [owner],
        key: params.instructionKey ?? 'revokeUseAuthority',
      })
  );
};
