import {
  cancelBidBuilder,
  CancelBidBuilderParams,
  cancelListingBuilder,
  CancelListingBuilderParams,
  depositToBuyerAccountBuilder,
  DepositToBuyerAccountBuilderParams,
  directBuyBuilder,
  DirectBuyBuilderParams,
  directSellBuilder,
  DirectSellBuilderParams,
  withdrawFromBuyerAccountBuilder,
  WithdrawFromBuyerAccountBuilderParams,
} from './operations';
import {
  createAuctionHouseBuilder,
  CreateAuctionHouseBuilderParams,
} from './operations/createAuctionHouse';
import {
  createBidBuilder,
  CreateBidBuilderParams,
} from './operations/createBid';
import {
  createListingBuilder,
  CreateListingBuilderParams,
} from './operations/createListing';
import {
  executeSaleBuilder,
  ExecuteSaleBuilderParams,
} from './operations/executeSale';
import {
  updateAuctionHouseBuilder,
  UpdateAuctionHouseBuilderParams,
} from './operations/updateAuctionHouse';
import type { Metaplex } from '@/Metaplex';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the Auction House module.
 *
 * @see {@link AuctionsClient}
 * @group Module Builders
 * */
export class AuctionHouseBuildersClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /** {@inheritDoc createBidBuilder} */
  bid(input: CreateBidBuilderParams, options?: TransactionBuilderOptions) {
    return createBidBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc directBuyBuilder} */
  buy(input: DirectBuyBuilderParams, options?: TransactionBuilderOptions) {
    return directBuyBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc cancelBidBuilder} */
  cancelBid(
    input: CancelBidBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return cancelBidBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc cancelListingBuilder} */
  cancelListing(
    input: CancelListingBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return cancelListingBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createAuctionHouseBuilder} */
  createAuctionHouse(
    input: CreateAuctionHouseBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createAuctionHouseBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc depositToBuyerAccountBuilder} */
  depositToBuyerAccount(
    input: DepositToBuyerAccountBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return depositToBuyerAccountBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc executeSaleBuilder} */
  executeSale(
    input: ExecuteSaleBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return executeSaleBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createListingBuilder} */
  list(input: CreateListingBuilderParams, options?: TransactionBuilderOptions) {
    return createListingBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc directSellBuilder} */
  sell(input: DirectSellBuilderParams, options?: TransactionBuilderOptions) {
    return directSellBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc updateAuctionHouseBuilder} */
  updateAuctionHouse(
    input: UpdateAuctionHouseBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return updateAuctionHouseBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc withdrawFromBuyerAccountBuilder} */
  withdrawFromBuyerAccount(
    input: WithdrawFromBuyerAccountBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return withdrawFromBuyerAccountBuilder(this.metaplex, input, options);
  }
}
