import { PublicKey } from '@solana/web3.js';
import { toPurchaseReceiptAccount } from '../accounts';
import { PurchaseReceiptGpaBuilder } from '../gpaBuilders';
import {
  AuctionHouse,
  LazyPurchase,
  Purchase,
  toLazyPurchase,
} from '../models';
import { FindAllSupportsOnlyThreeFiltersMaxError } from '../errors';
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

const Key = 'FindPurchasesOperation' as const;

/**
 * Finds Purchases by multiple criteria.
 * You can use any combination of keys.
 * Supports only 3 criteria at the same time including
 * the required `auctionHouse` attribute.
 *
 * ```ts
 * // Find all purchases in an Auction House.
 * const purchases = await metaplex
 *   .auctionHouse()
 *   .findPurchases({ auctionHouse });
 *
 * // Find purchases by buyer and mint.
 * const purchases = await metaplex
 *   .auctionHouse()
 *   .findPurchases({ auctionHouse, buyer, mint });
 *
 * // Find purchases by metadata.
 * const purchases = await metaplex
 *   .auctionHouse()
 *   .findPurchases({ auctionHouse, metadata });
 *
 * // Find purchases by seller and buyer.
 * const purchases = await metaplex
 *   .auctionHouse()
 *   .findPurchases({ auctionHouse, seller, buyer });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findPurchasesOperation = useOperation<FindPurchasesOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindPurchasesOperation = Operation<
  typeof Key,
  FindPurchasesInput,
  FindPurchasesOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindPurchasesInput = {
  /** A model of the Auction House related to these listings. */
  auctionHouse: AuctionHouse;

  /** The address of a buyer to search by. */
  buyer?: PublicKey;

  /** The address of a seller to search by. */
  seller?: PublicKey;

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
export type FindPurchasesOutput = (Purchase | LazyPurchase)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findPurchasesOperationHandler: OperationHandler<FindPurchasesOperation> =
  {
    handle: async (
      operation: FindPurchasesOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindPurchasesOutput> => {
      const { programs, commitment } = scope;
      const { auctionHouse, buyer, seller, metadata, mint } = operation.input;

      const auctionHouseProgram = metaplex.programs().getAuctionHouse(programs);

      let purchaseQuery = new PurchaseReceiptGpaBuilder(
        metaplex,
        auctionHouseProgram.address
      )
        .mergeConfig({ commitment })
        .whereAuctionHouse(auctionHouse.address);

      if (Object.keys(operation.input).length > 3) {
        throw new FindAllSupportsOnlyThreeFiltersMaxError();
      }

      if (buyer) {
        purchaseQuery = purchaseQuery.whereBuyer(buyer);
      }

      if (seller) {
        purchaseQuery = purchaseQuery.whereSeller(seller);
      }

      if (metadata && !mint) {
        purchaseQuery = purchaseQuery.whereMetadata(metadata);
      }

      if (mint) {
        purchaseQuery = purchaseQuery.whereMetadata(
          metaplex.nfts().pdas().metadata({ mint, programs })
        );
      }

      scope.throwIfCanceled();

      return purchaseQuery.getAndMap((account) =>
        toLazyPurchase(toPurchaseReceiptAccount(account), auctionHouse)
      );
    },
  };
