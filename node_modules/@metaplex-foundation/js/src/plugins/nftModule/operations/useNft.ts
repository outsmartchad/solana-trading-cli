import { createUtilizeInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { ExpectedSignerError } from '@/errors';
import { Metaplex } from '@/Metaplex';
import {
  isSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'UseNftOperation' as const;

/**
 * Utilizes a usable NFT.
 *
 * ```ts
 * await metaplex.nfts().use({ mintAddress });
 * await metaplex.nfts().use({ mintAddress, numberOfUses: 3 });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const useNftOperation = useOperation<UseNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UseNftOperation = Operation<typeof Key, UseNftInput, UseNftOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type UseNftInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The number of uses to utilize.
   *
   * @defaultValue `1`
   */
  numberOfUses?: number; // Defaults to 1.

  /**
   * The owner of the NFT or SFT.
   *
   * This must be a Signer unless a `useAuthority` is provided.
   *
   * @defaultValue `metaplex.identity()`
   */
  owner?: PublicKey | Signer;

  /**
   * The address of the token account linking the mint account
   * with the owner account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `owner` parameters.
   */
  ownerTokenAccount?: PublicKey;

  /**
   * The delegated use authority that should authorize this operation.
   *
   * @defaultValue Defaults to not using a delegated use authority
   * and using the `owner` parameter as a Signer instead.
   */
  useAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UseNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const useNftOperationHandler: OperationHandler<UseNftOperation> = {
  handle: async (
    operation: UseNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<UseNftOutput> => {
    return useNftBuilder(metaplex, operation.input, scope).sendAndConfirm(
      metaplex,
      scope.confirmOptions
    );
  },
};

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UseNftBuilderParams = Omit<UseNftInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Utilizes a usable NFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .use({ mintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const useNftBuilder = (
  metaplex: Metaplex,
  params: UseNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    numberOfUses = 1,
    owner = metaplex.identity(),
    useAuthority,
  } = params;

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  if (!isSigner(owner) && !useAuthority) {
    throw new ExpectedSignerError(
      'owner',
      'PublicKey',
      'In order to use an NFT you must either provide the owner as a Signer ' +
        'or a delegated use authority as a Signer.'
    );
  }

  // PDAs.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const tokenAccount =
    params.ownerTokenAccount ??
    metaplex
      .tokens()
      .pdas()
      .associatedTokenAccount({
        mint: mintAddress,
        owner: toPublicKey(owner),
        programs,
      });
  const useAuthorityRecord = useAuthority
    ? metaplex.nfts().pdas().useAuthorityRecord({
        mint: mintAddress,
        useAuthority: useAuthority.publicKey,
        programs,
      })
    : undefined;
  const programAsBurner = metaplex.nfts().pdas().burner({ programs });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createUtilizeInstruction(
          {
            metadata,
            tokenAccount,
            useAuthority: useAuthority
              ? useAuthority.publicKey
              : toPublicKey(owner),
            mint: mintAddress,
            owner: toPublicKey(owner),
            useAuthorityRecord,
            burner: useAuthorityRecord ? programAsBurner : undefined,
          },
          { utilizeArgs: { numberOfUses } },
          tokenMetadataProgram.address
        ),
        signers: [owner, useAuthority].filter(isSigner),
        key: params.instructionKey ?? 'utilizeNft',
      })
  );
};
