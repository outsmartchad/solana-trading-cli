import { PublicKey } from '@solana/web3.js';
import {
  parseCandyMachineV2CollectionAccount,
  toCandyMachineV2Account,
} from '../accounts';
import { CandyMachineV2, toCandyMachineV2 } from '../models';
import { findCandyMachineV2CollectionPda } from '../pdas';
import {
  assertAccountExists,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindCandyMachineV2ByAddressOperation' as const;

/**
 * Find an existing Candy Machine by its address.
 *
 * ```ts
 * const candyMachine = await metaplex.candyMachinesV2().findbyAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findCandyMachineV2ByAddressOperation =
  useOperation<FindCandyMachineV2ByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindCandyMachineV2ByAddressOperation = Operation<
  typeof Key,
  FindCandyMachineV2ByAddressInput,
  CandyMachineV2
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindCandyMachineV2ByAddressInput = {
  /** The Candy Machine address. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findCandyMachineV2ByAddressOperationHandler: OperationHandler<FindCandyMachineV2ByAddressOperation> =
  {
    handle: async (
      operation: FindCandyMachineV2ByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { commitment } = scope;
      const { address } = operation.input;
      const collectionPda = findCandyMachineV2CollectionPda(address);
      const accounts = await metaplex
        .rpc()
        .getMultipleAccounts([address, collectionPda], commitment);

      const unparsedAccount = accounts[0];
      assertAccountExists(unparsedAccount);
      const account = toCandyMachineV2Account(unparsedAccount);
      const collectionAccount = parseCandyMachineV2CollectionAccount(
        accounts[1]
      );

      const mint = account.data.tokenMint
        ? await metaplex
            .tokens()
            .findMintByAddress({ address: account.data.tokenMint }, scope)
        : null;

      return toCandyMachineV2(
        account,
        unparsedAccount,
        collectionAccount,
        mint
      );
    },
  };
