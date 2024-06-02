import type { PublicKey } from '@solana/web3.js';
import { toPurchaseReceiptAccount } from '../accounts';
import { AuctionHouse, Purchase, toLazyPurchase } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindPurchaseByReceiptOperation' as const;

/**
 * Finds a Purchase by its receipt address.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findPurchaseByReceipt({ receiptAddress, auctionHouse };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findPurchaseByReceiptOperation =
  useOperation<FindPurchaseByReceiptOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindPurchaseByReceiptOperation = Operation<
  typeof Key,
  FindPurchaseByReceiptInput,
  Purchase
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindPurchaseByReceiptInput = {
  /**
   * The address of the purchase receipt account.
   * This is the account that stores information about this purchase.
   * The Purchase model is built on top of this account.
   */
  receiptAddress: PublicKey;

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
export const findPurchaseByReceiptOperationHandler: OperationHandler<FindPurchaseByReceiptOperation> =
  {
    handle: async (
      operation: FindPurchaseByReceiptOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { receiptAddress, auctionHouse } = operation.input;

      const account = toPurchaseReceiptAccount(
        await metaplex.rpc().getAccount(receiptAddress, scope.commitment)
      );
      scope.throwIfCanceled();

      const lazyPurchase = toLazyPurchase(account, auctionHouse);
      return metaplex
        .auctionHouse()
        .loadPurchase({ lazyPurchase, ...operation.input }, scope);
    },
  };
