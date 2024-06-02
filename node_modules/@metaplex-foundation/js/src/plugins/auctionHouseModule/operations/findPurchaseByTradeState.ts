import type { PublicKey } from '@solana/web3.js';
import { AuctionHouse, Purchase } from '../models';
import type { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'FindPurchaseByTradeStateOperation' as const;

/**
 * Finds a Purchase by its trade state address.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findPurchaseByTradeState({ sellerTradeState, buyerTradeState, auctionHouse };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findPurchaseByTradeStateOperation =
  useOperation<FindPurchaseByTradeStateOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindPurchaseByTradeStateOperation = Operation<
  typeof Key,
  FindPurchaseByTradeStateInput,
  Purchase
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindPurchaseByTradeStateInput = {
  /** Seller trade state PDA account encoding the listing order. */
  sellerTradeState: PublicKey;

  /** Buyer trade state PDA account encoding the bid order. */
  buyerTradeState: PublicKey;

  /** A model of the Auction House related to this purchase. */
  auctionHouse: AuctionHouse;

  /**
   * Whether or not we should fetch the JSON Metadata for the NFT or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findPurchaseByTradeStateOperationHandler: OperationHandler<FindPurchaseByTradeStateOperation> =
  {
    handle: async (
      operation: FindPurchaseByTradeStateOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { sellerTradeState, buyerTradeState } = operation.input;
      const receiptAddress = metaplex.auctionHouse().pdas().purchaseReceipt({
        listingTradeState: sellerTradeState,
        bidTradeState: buyerTradeState,
        programs: scope.programs,
      });

      return metaplex
        .auctionHouse()
        .findPurchaseByReceipt({ receiptAddress, ...operation.input }, scope);
    },
  };
