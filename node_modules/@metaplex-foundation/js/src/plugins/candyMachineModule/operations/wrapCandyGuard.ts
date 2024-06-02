import { createWrapInstruction } from '@metaplex-foundation/mpl-candy-guard';
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

const Key = 'WrapCandyGuardOperation' as const;

/**
 * Wraps the given Candy Machine in a Candy Guard.
 *
 * This makes the Candy Guard the mint authority for the Candy Machine
 * which means all minting will have to go through the Candy Guard.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .wrapCandyGuard({
 *     candyMachine,
 *     candyGuard,
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const wrapCandyGuardOperation =
  useOperation<WrapCandyGuardOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type WrapCandyGuardOperation = Operation<
  typeof Key,
  WrapCandyGuardInput,
  WrapCandyGuardOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type WrapCandyGuardInput = {
  /** The address of the Candy Machine to wrap. */
  candyMachine: PublicKey;

  /** The address of the Candy Guard to wrap the Candy Machine with. */
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
export type WrapCandyGuardOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const wrapCandyGuardOperationHandler: OperationHandler<WrapCandyGuardOperation> =
  {
    async handle(
      operation: WrapCandyGuardOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<WrapCandyGuardOutput> {
      return wrapCandyGuardBuilder(
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
export type WrapCandyGuardBuilderParams = Omit<
  WrapCandyGuardInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that wraps the Candy Machine in a Candy Guard. */
  wrapCandyGuardInstructionKey?: string;
};

/**
 * Wraps the given Candy Machine in a Candy Guard.
 *
 * This makes the Candy Guard the mint authority for the Candy Machine
 * which means all minting will have to go through the Candy Guard.
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .wrapCandyGuard({
 *     candyMachine,
 *     candyGuard,
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const wrapCandyGuardBuilder = (
  metaplex: Metaplex,
  params: WrapCandyGuardBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyGuard,
    candyGuardAuthority = metaplex.identity(),
    candyMachine,
    candyMachineAuthority = metaplex.identity(),
  } = params;

  const candyMachineProgram = metaplex.programs().getCandyMachine(programs);
  const candyGuardProgram = metaplex.programs().getCandyGuard(programs);

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createWrapInstruction(
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
      key: params.wrapCandyGuardInstructionKey ?? 'wrapCandyGuard',
    });
};
