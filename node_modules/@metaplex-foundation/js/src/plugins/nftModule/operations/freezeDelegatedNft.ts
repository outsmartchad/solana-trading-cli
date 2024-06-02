import { createFreezeDelegatedAccountInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Metaplex } from '@/Metaplex';
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

const Key = 'FreezeDelegatedNftOperation' as const;

/**
 * Freezes a NFT via its delegate authority.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .freezeDelegatedNft({ mintAddress, delegateAuthority };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const freezeDelegatedNftOperation =
  useOperation<FreezeDelegatedNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FreezeDelegatedNftOperation = Operation<
  typeof Key,
  FreezeDelegatedNftInput,
  FreezeDelegatedNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FreezeDelegatedNftInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The SPL Token delegate authority.
   *
   * This authority should have been approved using
   * `metaplex.tokens().approveDelegateAuthority()` beforehand.
   */
  delegateAuthority: Signer;

  /**
   * The owner of the token account.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  tokenOwner?: PublicKey;

  /**
   * The address of the token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `tokenOwner` parameters.
   */
  tokenAddress?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FreezeDelegatedNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const freezeDelegatedNftOperationHandler: OperationHandler<FreezeDelegatedNftOperation> =
  {
    async handle(
      operation: FreezeDelegatedNftOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FreezeDelegatedNftOutput> {
      return freezeDelegatedNftBuilder(
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
export type FreezeDelegatedNftBuilderParams = Omit<
  FreezeDelegatedNftInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that freezes the NFT. */
  instructionKey?: string;
};

/**
 * Freezes a NFT via its delegate authority.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .freezeDelegatedNft({ mintAddress, delegateAuthority });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const freezeDelegatedNftBuilder = (
  metaplex: Metaplex,
  params: FreezeDelegatedNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    delegateAuthority,
    tokenOwner = metaplex.identity().publicKey,
    tokenAddress,
  } = params;

  // Programs.
  const tokenProgram = metaplex.programs().getToken(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  // PDAs.
  const editionAddress = metaplex.nfts().pdas().masterEdition({
    mint: mintAddress,
    programs,
  });
  const tokenAddressOrAta =
    tokenAddress ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner: tokenOwner,
      programs,
    });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createFreezeDelegatedAccountInstruction(
        {
          delegate: delegateAuthority.publicKey,
          tokenAccount: tokenAddressOrAta,
          edition: editionAddress,
          mint: mintAddress,
          tokenProgram: tokenProgram.address,
        },
        tokenMetadataProgram.address
      ),
      signers: [delegateAuthority],
      key: params.instructionKey ?? 'freezeDelegatedNft',
    });
};
