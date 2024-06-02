import { createUpdateInstruction } from '@metaplex-foundation/mpl-candy-guard';
import type { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { CandyGuardsSettings, DefaultCandyGuardSettings } from '../guards';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { Operation, OperationHandler, OperationScope, Signer } from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'UpdateCandyGuardOperation' as const;

/**
 * Updates an existing Candy Guard account.
 *
 * Note that the provided `guards` and `groups`
 * will replace the existing ones.
 *
 * ```ts
 * await metaplex
 *   .candyMachines()
 *   .updateCandyGuard({
 *     candyGuard: candyGuard.address,
 *     guards: {
 *       startDate: { date: toDateTime('2022-09-05T20:00:00.000Z') },
 *       solPayment: { amount: sol(1.5), },
 *       botTax: { lamports: sol(0.01), lastInstruction: true },
 *     },
 *     groups: [],
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateCandyGuardOperation = _updateCandyGuardOperation;
// eslint-disable-next-line @typescript-eslint/naming-convention
function _updateCandyGuardOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(input: UpdateCandyGuardInput<T>): UpdateCandyGuardOperation<T> {
  return { key: Key, input };
}
_updateCandyGuardOperation.key = Key;

/**
 * @group Operations
 * @category Types
 */
export type UpdateCandyGuardOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Operation<typeof Key, UpdateCandyGuardInput<T>, UpdateCandyGuardOutput>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateCandyGuardInput<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = {
  /** The address of the Candy Guard to update. */
  candyGuard: PublicKey;

  /**
   * The settings of all guards we wish to activate.
   *
   * Note that this will override the existing `guards` parameter
   * so you must provide all guards you wish to activate.
   *
   * Any guard not provided or set to `null` will be disabled.
   */
  guards: Partial<T>;

  /**
   * This parameter allows us to create multiple minting groups that have their
   * own set of requirements — i.e. guards.
   *
   * Note that this will override the existing `groups` parameter
   * so you must provide all groups and guards you wish to activate.
   *
   * When groups are provided, the `guards` parameter becomes a set of default
   * guards that will be applied to all groups. If a specific group enables
   * a guard that is also present in the default guards, the group's guard
   * will override the default guard.
   *
   * For each group, any guard not provided or set to `null` will be disabled.
   *
   * You may disable groups by providing an empty array `[]`.
   */
  groups?: { label: string; guards: Partial<T> }[];

  /**
   * The Signer authorized to update the candy Guard.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateCandyGuardOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateCandyGuardOperationHandler: OperationHandler<UpdateCandyGuardOperation> =
  {
    async handle<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
      operation: UpdateCandyGuardOperation<T>,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<UpdateCandyGuardOutput> {
      return updateCandyGuardBuilder<T>(
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
export type UpdateCandyGuardBuilderParams<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Omit<UpdateCandyGuardInput<T>, 'confirmOptions'> & {
  /** A key to distinguish the instruction that updates the candy guard. */
  updateInstructionKey?: string;
};

/**
 * Updates an existing Candy Guard account.
 *
 * Note that the provided `guards` and `groups`
 * will replace the existing ones.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .candyMachines()
 *   .builders()
 *   .updateCandyGuard({
 *     candyGuard: candyGuard.address,
 *     guards: {
 *       startDate: { date: toDateTime('2022-09-05T20:00:00.000Z') },
 *       solPayment: { amount: sol(1.5), },
 *       botTax: { lamports: sol(0.01), lastInstruction: true },
 *     },
 *     groups: [],
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateCandyGuardBuilder = <
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  metaplex: Metaplex,
  params: UpdateCandyGuardBuilderParams<T>,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    candyGuard,
    guards,
    groups,
    authority = metaplex.identity(),
  } = params;

  const candyGuardProgram = metaplex.programs().getCandyGuard(programs);
  const serializedSettings = metaplex
    .candyMachines()
    .guards()
    .serializeSettings<T>(guards, groups, programs);

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the candy guard account.
      .add({
        instruction: createUpdateInstruction(
          {
            candyGuard,
            authority: authority.publicKey,
            payer: payer.publicKey,
          },
          { data: serializedSettings },
          candyGuardProgram.address
        ),
        signers: [authority, payer],
        key: params.updateInstructionKey ?? 'updateCandyGuard',
      })
  );
};
