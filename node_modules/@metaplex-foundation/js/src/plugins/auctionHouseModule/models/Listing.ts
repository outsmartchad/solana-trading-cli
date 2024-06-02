import { PublicKey } from '@solana/web3.js';
import { ListingReceiptAccount } from '../accounts';
import { NftWithToken, SftWithToken } from '../../nftModule';
import { AuctionHouse } from './AuctionHouse';
import { assert, Option } from '@/utils';
import {
  amount,
  BigNumber,
  DateTime,
  lamports,
  Pda,
  SolAmount,
  SplTokenAmount,
  toBigNumber,
  toDateTime,
  toOptionDateTime,
} from '@/types';

/** @group Models */
export type Listing = Readonly<{
  /** A model identifier to distinguish models in the SDK. */
  model: 'listing';

  /**
   * Whether or not the asset was loaded.
   * When this is `false`, it means the Listing includes asset model.
   */
  lazy: false;

  /** A model of the Auction House related to this listing. */
  auctionHouse: AuctionHouse;

  /** The Nft or Sft with the associated token account. */
  asset: NftWithToken | SftWithToken;

  /** The address of the seller's trade state account. */
  tradeStateAddress: Pda;

  /** The address of the seller's wallet. */
  sellerAddress: PublicKey;

  /**
   * The address of the bookkeeper account.
   * It is responsible for signing a Listing Receipt Print.
   */
  bookkeeperAddress: Option<PublicKey>;

  /**
   * The address of the listing receipt account.
   * This is the account that stores information about this listing.
   * The Listing model is built on top of this account.
   */
  receiptAddress: Option<Pda>;

  /**
   * The address of the purchase receipt account.
   * This is the account that stores information about the purchase related to this listing.
   *
   * ```ts
   * const transactionBuilder = metaplex
   *   .auctionHouse()
   *   .builders()
   *   .findPurchaseByReceipt({ auctionHouse, receiptAddress: purchaseReceiptAddress });
   * ```
   */
  purchaseReceiptAddress: Option<PublicKey>;

  /** The sellers's price. */
  price: SolAmount | SplTokenAmount;

  /** The number of tokens listed in case it's a sale of a Fungible Token. */
  tokens: SplTokenAmount;

  /** The date of creation. */
  createdAt: DateTime;

  /** The date of cancellation. */
  canceledAt: Option<DateTime>;
}>;

/** @group Model Helpers */
export const isListing = (value: any): value is Listing =>
  typeof value === 'object' && value.model === 'listing' && !value.lazy;

/** @group Model Helpers */
export function assertListing(value: any): asserts value is Listing {
  assert(isListing(value), `Expected Listing type`);
}

/** @group Model Helpers */
export const toListing = (
  account: ListingReceiptAccount,
  auctionHouse: AuctionHouse,
  asset: NftWithToken | SftWithToken
): Listing => {
  const lazyListing = toLazyListing(account, auctionHouse);
  return {
    ...lazyListing,
    model: 'listing',
    lazy: false,
    asset,
    tokens: amount(lazyListing.tokens, asset.mint.currency),
  };
};

export type LazyListing = Omit<Listing, 'lazy' | 'asset' | 'tokens'> &
  Readonly<{
    lazy: true;
    metadataAddress: PublicKey;
    tokens: BigNumber;
  }>;

/** @group Model Helpers */
export const isLazyListing = (value: any): value is LazyListing =>
  typeof value === 'object' && value.model === 'listing' && value.lazy;

/** @group Model Helpers */
export function assertLazyListing(value: any): asserts value is LazyListing {
  assert(isLazyListing(value), `Expected LazyListing type`);
}

/** @group Model Helpers */
export const toLazyListing = (
  account: ListingReceiptAccount,
  auctionHouse: AuctionHouse
): LazyListing => {
  return {
    model: 'listing',
    lazy: true,
    auctionHouse,
    tradeStateAddress: new Pda(
      account.data.tradeState,
      account.data.tradeStateBump
    ),
    bookkeeperAddress: account.data.bookkeeper,
    sellerAddress: account.data.seller,
    metadataAddress: account.data.metadata,
    receiptAddress: new Pda(account.publicKey, account.data.bump),
    purchaseReceiptAddress: account.data.purchaseReceipt,

    // Data.
    price: auctionHouse.isNative
      ? lamports(account.data.price)
      : amount(account.data.price, auctionHouse.treasuryMint.currency),
    tokens: toBigNumber(account.data.tokenSize),
    createdAt: toDateTime(account.data.createdAt),
    canceledAt: toOptionDateTime(account.data.canceledAt),
  };
};
