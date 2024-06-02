import { AuctionHouseBuildersClient } from './AuctionHouseBuildersClient';
import {
  CancelBidInput,
  cancelBidOperation,
  CancelListingInput,
  cancelListingOperation,
  CreateAuctionHouseInput,
  createAuctionHouseOperation,
  CreateBidInput,
  createBidOperation,
  CreateListingInput,
  createListingOperation,
  DepositToBuyerAccountInput,
  depositToBuyerAccountOperation,
  DirectBuyInput,
  directBuyOperation,
  DirectSellInput,
  directSellOperation,
  ExecuteSaleInput,
  executeSaleOperation,
  FindAuctionHouseByAddressInput,
  findAuctionHouseByAddressOperation,
  FindAuctionHouseByCreatorAndMintInput,
  findAuctionHouseByCreatorAndMintOperation,
  FindBidByReceiptInput,
  findBidByReceiptOperation,
  FindBidByTradeStateInput,
  findBidByTradeStateOperation,
  FindBidsInput,
  findBidsOperation,
  FindListingByReceiptInput,
  findListingByReceiptOperation,
  FindListingByTradeStateInput,
  findListingByTradeStateOperation,
  FindListingsInput,
  findListingsOperation,
  FindPurchaseByReceiptInput,
  findPurchaseByReceiptOperation,
  FindPurchaseByTradeStateInput,
  findPurchaseByTradeStateOperation,
  FindPurchasesInput,
  findPurchasesOperation,
  GetBuyerBalanceInput,
  getBuyerBalanceOperation,
  LoadBidInput,
  loadBidOperation,
  LoadListingInput,
  loadListingOperation,
  LoadPurchaseInput,
  loadPurchaseOperation,
  UpdateAuctionHouseInput,
  updateAuctionHouseOperation,
  WithdrawFromBuyerAccountInput,
  withdrawFromBuyerAccountOperation,
  WithdrawFromFeeAccountInput,
  withdrawFromFeeAccountOperation,
  WithdrawFromTreasuryAccountInput,
  withdrawFromTreasuryAccountOperation,
} from './operations';
import { AuctionHousePdasClient } from './AuctionHousePdasClient';
import type { Metaplex } from '@/Metaplex';
import { OperationOptions } from '@/types';

/**
 * This is a client for the Auction House module.
 *
 * It enables us to interact with the Auction House program in order to
 * create and update Auction House to configure a marketplace as well to allow
 * users to list, bid and execute sales.
 *
 * You may access this client via the `auctionHouse()` method of your `Metaplex` instance.
 *
 * ```ts
 * const auctionHouseClient = metaplex.auctionHouse();
 * ```
 *
 * @example
 * You can create a new Auction House with minimum input like so.
 * By default, the current identity of the Metaplex instance will be
 * the authority of the Auction House.
 *
 * ```ts
 * const { auctionHouse } = await metaplex
 *   .auctionHouse()
 *   .create({
 *     sellerFeeBasisPoints: 500, // 5% royalties
 *   };
 * ```
 *
 * @see {@link AuctionHouse} The `AuctionHouse` model
 * @group Modules
 */
export class AuctionHouseClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = metaplex.auctions().builders();
   * ```
   */
  builders() {
    return new AuctionHouseBuildersClient(this.metaplex);
  }

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = metaplex.auctionHouse().pdas();
   * ```
   */
  pdas() {
    return new AuctionHousePdasClient(this.metaplex);
  }

  /** {@inheritDoc createBidOperation} */
  bid(input: CreateBidInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createBidOperation(input), options);
  }

  /** {@inheritDoc directBuyOperation} */
  buy(input: DirectBuyInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(directBuyOperation(input), options);
  }

  /** {@inheritDoc cancelBidOperation} */
  cancelBid(input: CancelBidInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(cancelBidOperation(input), options);
  }

  /** {@inheritDoc cancelListingOperation} */
  cancelListing(input: CancelListingInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(cancelListingOperation(input), options);
  }

  /** {@inheritDoc createAuctionHouseOperation} */
  create(input: CreateAuctionHouseInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createAuctionHouseOperation(input), options);
  }

  /** {@inheritDoc depositToBuyerAccountOperation} */
  depositToBuyerAccount(
    input: DepositToBuyerAccountInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(depositToBuyerAccountOperation(input), options);
  }

  /** {@inheritDoc executeSaleOperation} */
  executeSale(input: ExecuteSaleInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(executeSaleOperation(input), options);
  }

  /** {@inheritDoc findAuctionHouseByAddressOperation} */
  findByAddress(
    input: FindAuctionHouseByAddressInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findAuctionHouseByAddressOperation(input), options);
  }

  /** {@inheritDoc findAuctionHouseByCreatorAndMintOperation} */
  findByCreatorAndMint(
    input: FindAuctionHouseByCreatorAndMintInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findAuctionHouseByCreatorAndMintOperation(input), options);
  }

  /** {@inheritDoc findBidByReceiptOperation} */
  findBidByReceipt(input: FindBidByReceiptInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findBidByReceiptOperation(input), options);
  }

  /** {@inheritDoc findBidByTradeStateOperation} */
  findBidByTradeState(
    input: FindBidByTradeStateInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findBidByTradeStateOperation(input), options);
  }

  /** {@inheritDoc findBidsOperation} */
  findBids(input: FindBidsInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findBidsOperation(input), options);
  }

  /** {@inheritDoc findListingByTradeStateOperation} */
  findListingByTradeState(
    input: FindListingByTradeStateInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findListingByTradeStateOperation(input), options);
  }

  /** {@inheritDoc findListingByReceiptOperation} */
  findListingByReceipt(
    input: FindListingByReceiptInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findListingByReceiptOperation(input), options);
  }

  /** {@inheritDoc findListingsOperation} */
  findListings(input: FindListingsInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findListingsOperation(input), options);
  }

  /** {@inheritDoc findPurchaseByTradeStateOperation} */
  findPurchaseByTradeState(
    input: FindPurchaseByTradeStateInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findPurchaseByTradeStateOperation(input), options);
  }

  /** {@inheritDoc findPurchaseByReceiptOperation} */
  findPurchaseByReceipt(
    input: FindPurchaseByReceiptInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findPurchaseByReceiptOperation(input), options);
  }

  /** {@inheritDoc findPurchasesOperation} */
  findPurchases(input: FindPurchasesInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findPurchasesOperation(input), options);
  }

  /** {@inheritDoc getBuyerBalanceOperation} */
  getBuyerBalance(input: GetBuyerBalanceInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(getBuyerBalanceOperation(input), options);
  }

  /** {@inheritDoc createListingOperation} */
  list(input: CreateListingInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createListingOperation(input), options);
  }

  /** {@inheritDoc loadBidOperation} */
  loadBid(input: LoadBidInput, options?: OperationOptions) {
    return this.metaplex.operations().execute(loadBidOperation(input), options);
  }

  /** {@inheritDoc loadListingOperation} */
  loadListing(input: LoadListingInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(loadListingOperation(input), options);
  }

  /** {@inheritDoc loadPurchaseOperation} */
  loadPurchase(input: LoadPurchaseInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(loadPurchaseOperation(input), options);
  }

  /** {@inheritDoc directSellOperation} */
  sell(input: DirectSellInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(directSellOperation(input), options);
  }

  /** {@inheritDoc updateAuctionHouseOperation} */
  update(input: UpdateAuctionHouseInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(updateAuctionHouseOperation(input), options);
  }

  /** {@inheritDoc withdrawFromBuyerAccountOperation} */
  withdrawFromBuyerAccount(
    input: WithdrawFromBuyerAccountInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(withdrawFromBuyerAccountOperation(input), options);
  }

  /** {@inheritDoc withdrawFromFeeAccountOperation} */
  withdrawFromFeeAccount(
    input: WithdrawFromFeeAccountInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(withdrawFromFeeAccountOperation(input), options);
  }

  /** {@inheritDoc withdrawFromTreasuryAccountOperation} */
  withdrawFromTreasuryAccount(
    input: WithdrawFromTreasuryAccountInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(withdrawFromTreasuryAccountOperation(input), options);
  }
}
