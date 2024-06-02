import { createUnwrapInstruction } from '@metaplex-foundation/mpl-candy-guard';
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

const Key = 'UnwrapCandyGuardOperation' as const;

/**
 * Unwraps the given Candy Machine from its Candy Guard.
 *
 * This makes the Candy Machine authority its own mint authority again
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .unwrapCandyGuard({
 *     candyMachine,
 *     candyGuard,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const unwrapCandyGuardOperation =
  useOperation<UnwrapCandyGuardOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UnwrapCandyGuardOperation = Operation<
  typeof Key,
  UnwrapCandyGuardInput,
  UnwrapCandyGuardOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UnwrapCandyGuardInput = {
  /** The address of the Candy Machine to unwrap. */
  candyMachine: PublicKey;

  /** The address of the Candy Guard to unwrap the Candy Machine from. */
  candyGuard: PublicKey;

  /**
   * The authority of the Candy Machine as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  candyMachineAuthority?: Signer;

  /**
   * The authority of the Candy Guard as a Signer.
   *
   * @defaultValue `metaplex.identity()`
   */
  candyGuardAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UnwrapCandyGuardOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const unwrapCandyGuardOperationHandler: OperationHandler<UnwrapCandyGuardOperation> =
  {
    async handle(
      operation: UnwrapCandyGuardOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UnwrapCandyGuardOutput> {
      return unwrapCandyGuardBuilder(
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
export type UnwrapCandyGuardBuilderParams = Omit<
  UnwrapCandyGuardInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that unwraps the Candy Machine from its Candy Guard. */
  unwrapCandyGuardInstructionKey?: string;
};

/**
 * Unwraps the given Candy Machine from its Candy Guard.
 *
 * This makes the Candy Machine authority its own mint authority again
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .unwrapCandyGuard({
 *     candyMachine,
 *     candyGuard,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const unwrapCandyGuardBuilder = (
  metaplex: Metaplex,
  params: UnwrapCandyGuardBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyGuard,
    candyGuardAuthority = metaplex.identity(),
    candyMachine,
    candyMachineAuthority = metaplex.identity(),
  } = params;

  // Programs.
  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);
  const candyGuardProgram = metaplex.programs().getCandyGuard(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createUnwrapInstruction(
        {
          candyGuard,
          authority: candyGuardAuthority.publicKey,
          candyMachine,
          candyMachineProgram: candyMachineProgram.address,
          candyMachineAuthority: candyMachineAuthority.publicKey,
        },
        candyGuardProgram.address
      ),
      signers: [candyGuardAuthority, candyMachineAuthority],
      key: params.unwrapCandyGuardInstructionKey ?? 'unwrapCandyGuard',
    });
};
