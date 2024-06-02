import type { PublicKey } from '@solana/web3.js';
import { AuctionHouse, Bid } from '../models';
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

const Key = 'FindBidByTradeStateOperation' as const;

/**
 * Finds a Bid by its trade state address.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findBidByTradeState({ tradeStateAddress, auctionHouse };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findBidByTradeStateOperation =
  useOperation<FindBidByTradeStateOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindBidByTradeStateOperation = Operation<
  typeof Key,
  FindBidByTradeStateInput,
  Bid
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindBidByTradeStateInput = {
  /** Buyer trade state PDA account encoding the bid order. */
  tradeStateAddress: PublicKey;

  /** A model of the Auction House related to this bid. */
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
export const findBidByTradeStateOperationHandler: OperationHandler<FindBidByTradeStateOperation> =
  {
    handle: async (
      operation: FindBidByTradeStateOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { tradeStateAddress } = operation.input;
      const receiptAddress = metaplex.auctionHouse().pdas().bidReceipt({
        tradeState: tradeStateAddress,
        programs: scope.programs,
      });

      return metaplex
        .auctionHouse()
        .findBidByReceipt({ receiptAddress, ...operation.input }, scope);
    },
  };
