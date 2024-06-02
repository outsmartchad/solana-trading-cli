import {
  Auctioneer,
  AuctionHouse,
  ListingReceipt,
  BidReceipt,
  PurchaseReceipt,
} from '@metaplex-foundation/mpl-auction-house';
import {
  Account,
  getAccountParsingAndAssertingFunction,
  getAccountParsingFunction,
} from '@/types';

/** @group Accounts */
export type AuctioneerAccount = Account<Auctioneer>;

/** @group Account Helpers */
export const parseAuctioneerAccount = getAccountParsingFunction(Auctioneer);

/** @group Account Helpers */
export const toAuctioneerAccount =
  getAccountParsingAndAssertingFunction(Auctioneer);

/** @group Accounts */
export type AuctionHouseAccount = Account<AuctionHouse>;

/** @group Account Helpers */
export const parseAuctionHouseAccount = getAccountParsingFunction(AuctionHouse);

/** @group Account Helpers */
export const toAuctionHouseAccount =
  getAccountParsingAndAssertingFunction(AuctionHouse);

/** @group Accounts */
export type ListingReceiptAccount = Account<ListingReceipt>;

/** @group Account Helpers */
export const parseListingReceiptAccount =
  getAccountParsingFunction(ListingReceipt);

/** @group Account Helpers */
export const toListingReceiptAccount =
  getAccountParsingAndAssertingFunction(ListingReceipt);

/** @group Accounts */
export type BidReceiptAccount = Account<BidReceipt>;

/** @group Account Helpers */
export const parseBidReceiptAccount = getAccountParsingFunction(BidReceipt);

/** @group Account Helpers */
export const toBidReceiptAccount =
  getAccountParsingAndAssertingFunction(BidReceipt);

/** @group Accounts */
export type PurchaseReceiptAccount = Account<PurchaseReceipt>;

/** @group Account Helpers */
export const parsePurchaseReceiptAccount =
  getAccountParsingFunction(PurchaseReceipt);

/** @group Account Helpers */
export const toPurchaseReceiptAccount =
  getAccountParsingAndAssertingFunction(PurchaseReceipt);
