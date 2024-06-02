import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { Token } from '../../tokenModule';
import { AuctioneerAuthorityRequiredError } from '../errors';
import {
  AuctionHouse,
  isPrivateBid,
  Listing,
  PrivateBid,
  PublicBid,
  Purchase,
} from '../models';
import { CreateListingBuilderContext } from './createListing';
import { ExecuteSaleBuilderContext } from './executeSale';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  now,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'DirectSellOperation' as const;

/**
 * Creates a listing on a given asset and then executes a sell on the created bid and listing.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .sell({ auctionHouse, bid };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const directSellOperation = useOperation<DirectSellOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type DirectSellOperation = Operation<
  typeof Key,
  DirectSellInput,
  DirectSellOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type DirectSellInput = {
  /** The Auction House in which to create a Listing and execute a Sale. */
  auctionHouse: AuctionHouse;

  /**
   * The Auction House authority.
   * If this is Signer the transaction fee
   * will be paid from the Auction House Fee Account
   *
   * @defaultValue `auctionHouse.authority`
   */
  authority?: PublicKey | Signer;

  /**
   * Creator of a listing.
   *
   * There must be one and only one signer; Authority or Seller must sign.
   *
   * @defaultValue `metaplex.identity()`
   */
  seller?: PublicKey | Signer;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: Signer;

  /**
   * The address of the bookkeeper wallet responsible for the receipt.
   *
   * @defaultValue `metaplex.identity()`
   */
  bookkeeper?: Signer;

  /**
   * Prints the purchase receipt.
   * The receipt holds information about the purchase,
   * So it's important to print it if you want to use the `Purchase` model
   *
   * @defaultValue `true`
   */
  printReceipt?: boolean;
} & (
  | {
      /**
       * The Token Account of an asset to sell.
       * Public Bid doesn't contain a token, so it must be provided externally via this parameter.
       */
      sellerToken: Token;

      /**
       * The Public Bid that is used in the sale.
       * We only need a subset of the `Bid` model but we
       * need enough information regarding its settings to know how
       * to execute the sale.
       *
       * This includes its auction house address, buyer, receipt address, etc.
       */
      bid: Omit<
        PublicBid,
        'bookkeeperAddress' | 'purchaseReceiptAddress' | 'createdAt'
      >;
    }
  | {
      /**
       * The Token Account of an asset to sell.
       * Not needed for private bid.
       */
      sellerToken?: null;

      /**
       * The Private Bid that is used in the sale.
       * We only need a subset of the `Bid` model but we
       * need enough information regarding its settings to know how
       * to execute the sale.
       *
       * This includes its asset, auction house address, buyer, receipt address, etc.
       */
      bid: Omit<
        PrivateBid,
        'bookkeeperAddress' | 'purchaseReceiptAddress' | 'createdAt'
      >;
    }
);

/**
 * @group Operations
 * @category Outputs
 */
export type DirectSellOutput = {
  /** A model that keeps information about the Listing. */
  listing: Listing;

  /** A model that keeps information about the Purchase. */
  purchase: Purchase;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const directSellOperationHandler: OperationHandler<DirectSellOperation> =
  {
    handle: async (
      operation: DirectSellOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const builder = await directSellBuilder(metaplex, operation.input, scope);
      scope.throwIfCanceled();

      return builder.sendAndConfirm(metaplex, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type DirectSellBuilderParams = Omit<
  DirectSellInput,
  'confirmOptions'
> & {
  createListingInstructionKey?: string;
  executeSaleInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type DirectSellBuilderContext = Omit<DirectSellOutput, 'response'>;

/**
 * Creates a listing on a given asset and executes a sale on the created listing and given bid.
 *
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .sell({ auctionHouse, bid, seller })
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const directSellBuilder = async (
  metaplex: Metaplex,
  params: DirectSellBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<DirectSellBuilderContext>> => {
  // Data.
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    auctionHouse,
    auctioneerAuthority,
    bid,
    seller = metaplex.identity(),
    authority = auctionHouse.authorityAddress,
    bookkeeper = metaplex.identity(),
    createListingInstructionKey,
    executeSaleInstructionKey,
  } = params;
  const { hasAuctioneer } = auctionHouse;
  const { tokens, price, buyerAddress } = bid;

  const printReceipt =
    (params.printReceipt ?? true) && Boolean(bid.receiptAddress);

  if (hasAuctioneer && !auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }

  const asset = isPrivateBid(bid)
    ? bid.asset
    : { ...bid.asset, token: params.sellerToken as Token };

  const listingBuilder: TransactionBuilder<CreateListingBuilderContext> =
    metaplex.auctionHouse().builders().list(
      {
        mintAccount: asset.mint.address,
        price,
        auctionHouse,
        auctioneerAuthority,
        seller,
        authority,
        tokenAccount: asset.token.address,
        tokens,
        printReceipt,
        bookkeeper,
        instructionKey: createListingInstructionKey,
      },
      { programs, payer }
    );
  const { receipt, sellerTradeState } = listingBuilder.getContext();

  const listing: Listing = {
    model: 'listing',
    lazy: false,
    auctionHouse,
    asset,
    tradeStateAddress: sellerTradeState,
    bookkeeperAddress: toPublicKey(bookkeeper),
    sellerAddress: toPublicKey(seller),
    receiptAddress: receipt,
    purchaseReceiptAddress: null,
    price,
    tokens,
    createdAt: now(),
    canceledAt: null,
  };

  const saleBuilder: TransactionBuilder<ExecuteSaleBuilderContext> = metaplex
    .auctionHouse()
    .builders()
    .executeSale(
      {
        auctionHouse,
        auctioneerAuthority,
        bid,
        listing,
        printReceipt,
        bookkeeper,
        instructionKey: executeSaleInstructionKey,
      },
      { programs, payer }
    );
  const { receipt: receiptAddress } = saleBuilder.getContext();

  const buyerTokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
    mint: asset.address,
    owner: buyerAddress,
    programs,
  });
  const purchasedAsset = {
    ...asset,
    token: {
      ...asset.token,
      address: buyerTokenAccount,
      ownerAddress: buyerAddress,
    },
  };

  const purchase: Purchase = {
    auctionHouse,
    model: 'purchase',
    lazy: false,
    asset: purchasedAsset,
    buyerAddress,
    sellerAddress: toPublicKey(seller),
    bookkeeperAddress: toPublicKey(bookkeeper),
    receiptAddress,
    price: bid.price,
    tokens,
    createdAt: now(),
  };

  return TransactionBuilder.make<DirectSellBuilderContext>()
    .setFeePayer(payer)
    .setContext({
      listing,
      purchase,
    })
    .add(listingBuilder)
    .add(saleBuilder);
};
