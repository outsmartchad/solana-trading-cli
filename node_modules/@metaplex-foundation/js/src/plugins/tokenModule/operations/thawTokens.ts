import { createThawAccountInstruction } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import type { Metaplex } from '@/Metaplex';
import {
  isSigner,
  KeypairSigner,
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

const Key = 'ThawTokensOperation' as const;

/**
 * Thaws a token account.
 *
 * ```ts
 * await metaplex.tokens().thaw({ mintAddress, freezeAuthority });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const thawTokensOperation = useOperation<ThawTokensOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ThawTokensOperation = Operation<
  typeof Key,
  ThawTokensInput,
  ThawTokensOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ThawTokensInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The freeze authority as a Signer.
   *
   * This may be provided as a PublicKey if and only if
   * the `multiSigners` parameter is provided.
   */
  freezeAuthority: PublicKey | Signer;

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

  /**
   * The signing accounts to use if the freeze authority is a multisig.
   *
   * @defaultValue `[]`
   */
  multiSigners?: KeypairSigner[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type ThawTokensOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const thawTokensOperationHandler: OperationHandler<ThawTokensOperation> =
  {
    async handle(
      operation: ThawTokensOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<ThawTokensOutput> {
      return thawTokensBuilder(metaplex, operation.input, scope).sendAndConfirm(
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
export type ThawTokensBuilderParams = Omit<
  ThawTokensInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that thaws the token account. */
  instructionKey?: string;
};

/**
 * Thaws a token account.
 *
 * ```ts
 * const transactionBuilder = metaplex.tokens().builders().thaw({ mintAddress, freezeAuthority });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const thawTokensBuilder = (
  metaplex: Metaplex,
  params: ThawTokensBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    tokenOwner = metaplex.identity().publicKey,
    tokenAddress,
    multiSigners = [],
    freezeAuthority,
  } = params;

  const [authorityPublicKey, signers] = isSigner(freezeAuthority)
    ? [freezeAuthority.publicKey, [freezeAuthority]]
    : [freezeAuthority, multiSigners];

  const tokenProgram = metaplex.programs().getToken(programs);
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
      instruction: createThawAccountInstruction(
        tokenAddressOrAta,
        mintAddress,
        authorityPublicKey,
        multiSigners,
        tokenProgram.address
      ),
      signers,
      key: params.instructionKey ?? 'thawTokens',
    });
};
