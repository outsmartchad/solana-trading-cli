import { createWithdrawInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  Signer,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'DeleteCandyMachineOperation' as const;

/**
 * Deletes a Candy Machine account by withdrawing its rent-exempt balance.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .delete({
 *     candyMachine: candyMachine.address,
 *     candyGuard: candyMachine.candyGuard.address,
 *     authority,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const deleteCandyMachineOperation =
  useOperation<DeleteCandyMachineOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type DeleteCandyMachineOperation = Operation<
  typeof Key,
  DeleteCandyMachineInput,
  DeleteCandyMachineOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type DeleteCandyMachineInput = {
  /** The address of the Candy Machine account to delete. */
  candyMachine: PublicKey;

  /**
   * The address of the Candy Guard associated with the Candy Machine account.
   * When provided the Candy Guard will be deleted as well.
   *
   * @defaultValue Defaults to not being deleted.
   */
  candyGuard?: PublicKey;

  /**
   * The authority of the Candy Machine account.
   *
   * This is the account that will received the rent-exemption
   * lamports from the Candy Machine account.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;

  /**
   * The authority of the Candy Guard account to delete.
   *
   * This is only required if `candyGuard` is provided and the Candy
   * Guard authority is not the same as the Candy Machine authority.
   *
   * @defaultValue `authority`
   */
  candyGuardAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type DeleteCandyMachineOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const deleteCandyMachineOperationHandler: OperationHandler<DeleteCandyMachineOperation> =
  {
    async handle(
      operation: DeleteCandyMachineOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<DeleteCandyMachineOutput> {
      return deleteCandyMachineBuilder(
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
export type DeleteCandyMachineBuilderParams = Omit<
  DeleteCandyMachineInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that deletes the Candy Machine account. */
  deleteCandyMachineInstructionKey?: string;
};

/**
 * Deletes a Candy Machine account by withdrawing its rent-exempt balance.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .delete({
 *     candyMachine: candyMachine.address,
 *     candyGuard: candyMachine.candyGuard.address,
 *     authority,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const deleteCandyMachineBuilder = (
  metaplex: Metaplex,
  params: DeleteCandyMachineBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyMachine,
    candyGuard,
    authority = metaplex.identity(),
    candyGuardAuthority = authority,
  } = params;

  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createWithdrawInstruction(
        {
          candyMachine,
          authority: authority.publicKey,
        },
        candyMachineProgram.address
      ),
      signers: [authority],
      key: params.deleteCandyMachineInstructionKey ?? 'deleteCandyMachine',
    });

  if (candyGuard) {
    builder.add(
      metaplex
        .candyMachines()
        .builders()
        .deleteCandyGuard(
          { candyGuard, authority: candyGuardAuthority },
          { payer, programs }
        )
    );
  }

  return builder;
};
