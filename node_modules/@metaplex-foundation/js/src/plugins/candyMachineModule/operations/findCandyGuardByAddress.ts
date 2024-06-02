import { PublicKey } from '@solana/web3.js';
import { CandyGuardsSettings, DefaultCandyGuardSettings } from '../guards';
import { CandyGuard, toCandyGuard } from '../models';
import {
  assertAccountExists,
  Operation,
  OperationHandler,
  OperationScope,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindCandyGuardByAddressOperation' as const;

/**
 * Find an existing Candy Guard by its address.
 *
 * ```ts
 * const candyGuard = await metaplex
 *   .candyMachines()
 *   .findCandyGuardbyAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCandyGuardByAddressOperation =
  _findCandyGuardByAddressOperation;
// eslint-disable-next-line @typescript-eslint/naming-convention
function _findCandyGuardByAddressOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
>(input: FindCandyGuardByAddressInput): FindCandyGuardByAddressOperation<T> {
  return { key: Key, input };
}
_findCandyGuardByAddressOperation.key = Key;

/**
 * @group Operations
 * @category Types
 */
export type FindCandyGuardByAddressOperation<
  T extends CandyGuardsSettings = DefaultCandyGuardSettings
> = Operation<typeof Key, FindCandyGuardByAddressInput, CandyGuard<T>>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCandyGuardByAddressInput = {
  /** The Candy Guard address. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findCandyGuardByAddressOperationHandler: OperationHandler<FindCandyGuardByAddressOperation> =
  {
    handle: async <T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
      operation: FindCandyGuardByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<CandyGuard<T>> => {
      const { address } = operation.input;
      const account = await metaplex
        .rpc()
        .getAccount(address, scope.commitment);
      assertAccountExists(account);

      return toCandyGuard<T>(account, metaplex);
    },
  };
