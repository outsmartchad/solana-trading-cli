import { createSetAuthorityInstruction } from '@metaplex-foundation/mpl-candy-guard';
import type { PublicKey } from '@solana/web3.js';
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

const Key = 'UpdateCandyGuardAuthorityOperation' as const;

/**
 * Updates the authority of a Candy Guard account.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .updateCandyGuardAuthority({
 *     candyGuard: candyGuard.address,
 *     authority: candyGuardAuthority,
 *     newAuthority,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateCandyGuardAuthorityOperation =
  useOperation<UpdateCandyGuardAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UpdateCandyGuardAuthorityOperation = Operation<
  typeof Key,
  UpdateCandyGuardAuthorityInput,
  UpdateCandyGuardAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateCandyGuardAuthorityInput = {
  /** The address of the Candy Guard to update. */
  candyGuard: PublicKey;

  /**
   * The Signer authorized to update the candy Guard.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;

  /** The address of the new authority. */
  newAuthority: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateCandyGuardAuthorityOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateCandyGuardAuthorityOperationHandler: OperationHandler<UpdateCandyGuardAuthorityOperation> =
  {
    async handle(
      operation: UpdateCandyGuardAuthorityOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UpdateCandyGuardAuthorityOutput> {
      return updateCandyGuardAuthorityBuilder(
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
export type UpdateCandyGuardAuthorityBuilderParams = Omit<
  UpdateCandyGuardAuthorityInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that updates the candy guard. */
  instructionKey?: string;
};

/**
 * Updates the authority of a Candy Guard account.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .builders()
 *   .updateCandyGuardAuthority({
 *     candyGuard: candyGuard.address,
 *     authority: candyGuardAuthority,
 *     newAuthority,
 *   };
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateCandyGuardAuthorityBuilder = (
  metaplex: Metaplex,
  params: UpdateCandyGuardAuthorityBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { candyGuard, newAuthority, authority = metaplex.identity() } = params;
  const candyGuardProgram = metaplex.programs().getCandyGuard(programs);

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the candy guard account.
      .add({
        instruction: createSetAuthorityInstruction(
          { candyGuard, authority: authority.publicKey },
          { newAuthority },
          candyGuardProgram.address
        ),
        signers: [authority, payer],
        key: params.instructionKey ?? 'updateCandyGuardAuthority',
      })
  );
};
