import { PublicKey } from '@solana/web3.js';
import { BidReceiptGpaBuilder } from '../gpaBuilders';
import { AuctionHouse, Bid, LazyBid, toLazyBid } from '../models';
import { toBidReceiptAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindBidsOperation' as const;

/**
 * Finds Bids by multiple criteria.
 * You can use any combination of keys.
 *
 * ```ts
 * // Find all bids in an Auction House.
 * const bids = await metaplex
 *   .auctionHouse()
 *   .findBids({ auctionHouse });
 *
 * // Find bids by buyer and mint.
 * const bids = await metaplex
 *   .auctionHouse()
 *   .findBids({ auctionHouse, buyer, mint });
 *
 * // Find bids by metadata.
 * const bids = await metaplex
 *   .auctionHouse()
 *   .findBids({ auctionHouse, metadata });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findBidsOperation = useOperation<FindBidsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindBidsOperation = Operation<
  typeof Key,
  FindBidsInput,
  FindBidsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindBidsInput = {
  /** A model of the Auction House related to these listings. */
  auctionHouse: AuctionHouse;

  /** The address of a buyer to search by. */
  buyer?: PublicKey;

  /**
   * The address of metadata to search by.
   * Ignored when mint provided.
   */
  metadata?: PublicKey;

  /** The address of a mint to search by. */
  mint?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindBidsOutput = (LazyBid | Bid)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findBidsOperationHandler: OperationHandler<FindBidsOperation> = {
  handle: async (
    operation: FindBidsOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<FindBidsOutput> => {
    const { programs, commitment } = scope;
    const { auctionHouse, buyer, metadata, mint } = operation.input;
    const auctionHouseProgram = metaplex.programs().getAuctionHouse(programs);

    let bidQuery = new BidReceiptGpaBuilder(
      metaplex,
      auctionHouseProgram.address
    )
      .mergeConfig({ commitment })
      .whereAuctionHouse(auctionHouse.address);

    if (buyer) {
      bidQuery = bidQuery.whereBuyer(buyer);
    }

    if (metadata && !mint) {
      bidQuery = bidQuery.whereMetadata(metadata);
    }

    if (mint) {
      bidQuery = bidQuery.whereMetadata(
        metaplex.nfts().pdas().metadata({ mint, programs })
      );
    }

    scope.throwIfCanceled();

    return bidQuery.getAndMap((account) =>
      toLazyBid(toBidReceiptAccount(account), auctionHouse)
    );
  },
};
