import { PublicKey } from '@solana/web3.js';
import type { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  SolAmount,
  useOperation,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'GetBuyerBalanceOperation' as const;

/**
 * Gets the balance of a buyer's escrow account for a given Auction House.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .getBuyerBalance({ auctionHouse, buyerAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getBuyerBalanceOperation =
  useOperation<GetBuyerBalanceOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetBuyerBalanceOperation = Operation<
  typeof Key,
  GetBuyerBalanceInput,
  GetBuyerBalanceOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetBuyerBalanceInput = {
  /** The Auction House in which to get the buyer's escrow balance. */
  auctionHouse: PublicKey;

  /** The buyer's address. */
  buyerAddress: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetBuyerBalanceOutput = SolAmount;

/**
 * @group Operations
 * @category Handlers
 */
export const getBuyerBalanceOperationHandler: OperationHandler<GetBuyerBalanceOperation> =
  {
    handle: async (
      operation: GetBuyerBalanceOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { auctionHouse, buyerAddress } = operation.input;
      const buyerEscrow = metaplex.auctionHouse().pdas().buyerEscrow({
        auctionHouse,
        buyer: buyerAddress,
        programs: scope.programs,
      });

      return metaplex.rpc().getBalance(buyerEscrow, scope.commitment);
    },
  };
