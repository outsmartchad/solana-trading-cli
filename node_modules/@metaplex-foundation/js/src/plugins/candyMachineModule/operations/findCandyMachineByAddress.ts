import { CandyGuardsSettings, DefaultCandyGuardSettings } from '../guards';
import { CandyMachine, toCandyGuard, toCandyMachine } from '../models';
import { assertCandyGuardProgram } from '../programs';
import {
  assertAccountExists,
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindCandyMachineByAddressOperation' as const;

/**
 * Find an existing Candy Machine by its address.
 *
 * ```ts
 * const candyMachine = await metaplex
 *   .candyMachines()
 *   .findbyAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCandyMachineByAddressOperation =
  _findCandyMachineByAddressOperation;
// eslint-disable-next-line @typescript-eslint/naming-convention
function _findCandyMachineByAddressOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(
  input: FindCandyMachineByAddressInput
): FindCandyMachineByAddressOperation<T> {
  return { key: Key, input };
}
_findCandyMachineByAddressOperation.key = Key;

/**
 * @group Operations
 * @category Types
 */
export type FindCandyMachineByAddressOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Operation<typeof Key, FindCandyMachineByAddressInput, CandyMachine<T>>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCandyMachineByAddressInput = {
  /** The Candy Machine address. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findCandyMachineByAddressOperationHandler: OperationHandler<FindCandyMachineByAddressOperation> =
  {
    async handle<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
      operation: FindCandyMachineByAddressOperation<T>,
      metaplex: Metaplex,
      scope: OperationScope
    ) {
      const { address } = operation.input;
      const { commitment, programs } = scope;
      const potentialCandyGuardAddress = metaplex
        .candyMachines()
        .pdas()
        .candyGuard({ base: address, programs });
      const [candyMachineAccount, potentialCandyGuardAccount] = await metaplex
        .rpc()
        .getMultipleAccounts([address, potentialCandyGuardAddress], commitment);
      scope.throwIfCanceled();

      assertAccountExists(candyMachineAccount, 'CandyMachine');
      const candyMachine = toCandyMachine<T>(candyMachineAccount);
      const mintAuthority = candyMachine.mintAuthorityAddress;

      // Optimisation that tries to load both the Candy Machine
      // And the Candy Guard in one RPC call assuming the Candy
      // Machine's address is the base address of the Candy Guard.
      if (
        potentialCandyGuardAccount.exists &&
        potentialCandyGuardAccount.publicKey.equals(mintAuthority)
      ) {
        return {
          ...candyMachine,
          candyGuard: toCandyGuard<T>(potentialCandyGuardAccount, metaplex),
        };
      }

      // If the Candy Machine's mint authority is not a PDA,
      // it cannot have an associated Candy Guard.
      // TODO(loris): Does not seem to work when the Candy Guard does not derive from the Candy Machine.
      if (PublicKey.isOnCurve(mintAuthority)) {
        return candyMachine;
      }

      // Fetch the content of the mint authority PDA.
      const mintAuthorityAccount = await metaplex
        .rpc()
        .getAccount(mintAuthority, commitment);
      scope.throwIfCanceled();

      try {
        // Identity the program owner as a Candy Guard program
        // and parse the Candy Guard accordingly.
        assertAccountExists(mintAuthorityAccount);
        const program = metaplex.programs().get(mintAuthorityAccount.owner);
        assertCandyGuardProgram(program);

        return {
          ...candyMachine,
          candyGuard: toCandyGuard<T>(mintAuthorityAccount, metaplex),
        };
      } catch (error) {
        // If anything goes wrong, assume there is no Candy Guard
        // attached to this Candy Machine.
        return candyMachine;
      }
    },
  };
