import { PublicKey } from '@solana/web3.js';
import { BidReceiptAccount } from '../accounts';
import { Nft, NftWithToken, Sft, SftWithToken } from '../../nftModule';
import { AuctionHouse } from './AuctionHouse';
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
import { assert, Option } from '@/utils';

/** @group Models */
export type Bid = Readonly<
  {
    /** A model identifier to distinguish models in the SDK. */
    model: 'bid';

    /**
     * Whether or not the asset was loaded.
     * When this is `false`, it means the Bid includes asset model.
     */
    lazy: false;

    /** A model of the Auction House related to this bid. */
    auctionHouse: AuctionHouse;

    /** The address of the buyer's trade state account. */
    tradeStateAddress: Pda;

    /** The address of the buyer's wallet. */
    buyerAddress: PublicKey;

    /**
     * The address of the bookkeeper account.
     * It is responsible for signing a Bid Receipt Print.
     */
    bookkeeperAddress: Option<PublicKey>;

    /**
     * The address of the bid receipt account.
     * This is the account that stores information about this bid.
     * The Bid model is built on top of this account.
     */
    receiptAddress: Option<Pda>;

    /**
     * The address of the purchase receipt account.
     * This is the account that stores information about the purchase related to this bid.
     *
     * ```ts
     * const transactionBuilder = metaplex
     *   .auctionHouse()
     *   .builders()
     *   .findPurchaseByReceipt({ auctionHouse, receiptAddress: purchaseReceiptAddress });
     * ```
     */
    purchaseReceiptAddress: Option<PublicKey>;

    /** The buyer's price. */
    price: SolAmount | SplTokenAmount;

    /** The number of tokens bid is for. */
    tokens: SplTokenAmount;

    /** The date of creation. */
    createdAt: DateTime;

    /** The date of cancellation. */
    canceledAt: Option<DateTime>;
  } & (
    | {
        /** The bid is not public, which means that it was created according to the listing. */
        isPublic: false;

        /** The Nft or Sft with the associated token account. */
        asset: SftWithToken | NftWithToken;
      }
    | {
        /**
         * The bid is public.
         * This means that a bid can stay active beyond the end of an auction
         * and be resolved if it meets the criteria for subsequent auctions of that token.
         */
        isPublic: true;

        /** The Nft or Sft related to the Bid. */
        asset: Sft | Nft;
      }
  )
>;

/** @group Model Helpers */
export const isBid = (value: any): value is Bid =>
  typeof value === 'object' && value.model === 'bid' && !value.lazy;

/** @group Model Helpers */
export function assertBid(value: any): asserts value is Bid {
  assert(isBid(value), `Expected Bid type`);
}

/** @group Model Helpers */
export const toBid = (
  account: BidReceiptAccount,
  auctionHouse: AuctionHouse,
  asset: Nft | Sft | NftWithToken | SftWithToken
): Bid => {
  const lazyBid = toLazyBid(account, auctionHouse);

  return {
    ...lazyBid,
    model: 'bid',
    lazy: false,
    ...('token' in asset
      ? {
          asset,
          tokens: amount(lazyBid.tokens, asset.mint.currency),
          isPublic: false,
        }
      : {
          asset,
          tokens: amount(lazyBid.tokens, asset.mint.currency),
          isPublic: true,
        }),
  };
};

/** @group Models */
export type PublicBid = Bid & { isPublic: true; asset: Sft | Nft };

/** @group Models */
export type PrivateBid = Bid & {
  isPublic: false;
  asset: SftWithToken | NftWithToken;
};

/** @group Model Helpers */
export const isPrivateBid = (value: any): value is PrivateBid =>
  typeof value === 'object' && value.model === 'bid' && !value.isPublic;

export type LazyBid = Omit<Bid, 'lazy' | 'asset' | 'tokens'> &
  Readonly<{
    lazy: true;
    metadataAddress: PublicKey;
    tokenAddress: Option<PublicKey>;
    tokens: BigNumber;
  }>;

/** @group Model Helpers */
export const isLazyBid = (value: any): value is LazyBid =>
  typeof value === 'object' && value.model === 'bid' && value.lazy;

/** @group Model Helpers */
export function assertLazyBid(value: any): asserts value is LazyBid {
  assert(isLazyBid(value), `Expected LazyBid type`);
}

/** @group Model Helpers */
export const toLazyBid = (
  account: BidReceiptAccount,
  auctionHouse: AuctionHouse
): LazyBid => {
  return {
    model: 'bid',
    lazy: true,
    auctionHouse,
    tradeStateAddress: new Pda(
      account.data.tradeState,
      account.data.tradeStateBump
    ),
    bookkeeperAddress: account.data.bookkeeper,
    buyerAddress: account.data.buyer,
    metadataAddress: account.data.metadata,
    tokenAddress: account.data.tokenAccount,
    receiptAddress: new Pda(account.publicKey, account.data.bump),
    purchaseReceiptAddress: account.data.purchaseReceipt,
    isPublic: Boolean(account.data.tokenAccount),

    // Data.
    price: auctionHouse.isNative
      ? lamports(account.data.price)
      : amount(account.data.price, auctionHouse.treasuryMint.currency),
    tokens: toBigNumber(account.data.tokenSize),
    createdAt: toDateTime(account.data.createdAt),
    canceledAt: toOptionDateTime(account.data.canceledAt),
  };
};
