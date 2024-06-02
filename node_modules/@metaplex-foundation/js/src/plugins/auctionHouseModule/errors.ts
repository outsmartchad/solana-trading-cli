import { MetaplexError } from '@/errors';
import { Amount, formatAmount } from '@/types';

/** @group Errors */
export class AuctionHouseError extends MetaplexError {
  readonly name: string = 'AuctionHouseError';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Auction House', cause);
  }
}

/** @group Errors */
export class TreasuryDestinationOwnerRequiredError extends AuctionHouseError {
  readonly name: string = 'TreasuryDestinationOwnerRequiredError';
  constructor() {
    const message =
      'You are trying to update an Auction House which uses a custom token as a treasury. ' +
      'You have not provided the "treasuryWithdrawalDestinationOwner" because you do not wish to change it. ' +
      'However, the Auction House account does not keep track of that information so we cannot prefill that for you. ' +
      'Thus, if you wish to keep the same treasury withdrawal, you must provide it explicilty. ' +
      'Please provide the current "treasuryWithdrawalDestinationOwner" parameter so you can update the other fields.' +
      'Note that we keep that parameter optional because no Associate Token Account is needed for Auction Houses ' +
      'whose treasury is the native SOL.';
    super(message);
  }
}

/** @group Errors */
export class AuctioneerAuthorityRequiredError extends AuctionHouseError {
  readonly name: string = 'AuctioneerAuthorityRequiredError';
  constructor() {
    const message =
      'You are trying to use or fetch an Auction House which delegates to an Auctioneer authority ' +
      'but you have not provided the required "auctioneerAuthority" parameter. ' +
      'Please provide the "auctioneerAuthority" parameter so the SDK can figure out which Auctioneer instance to interact with. ' +
      'Note that we keep that parameter optional because no Auctioneer Authority is needed for Auction Houses ' +
      'that use native Auction House behavior.';
    super(message);
  }
}

/** @group Errors */
export class AuctioneerPartialSaleNotSupportedError extends AuctionHouseError {
  readonly name: string = 'AuctioneerPartialSaleNotSupportedError';
  constructor() {
    const message =
      'You are trying to execute a partial sale, but partial orders are not supported in Auctioneer. ' +
      'Any Partial Buys must be executed against a sale listed through the Auction House Sale.';
    super(message);
  }
}

/** @group Errors */
export class BidAndListingHaveDifferentAuctionHousesError extends AuctionHouseError {
  readonly name: string = 'BidAndListingHaveDifferentAuctionHousesError';
  constructor() {
    const message =
      'You are trying to use a Bid and a Listing from different Auction Houses. ' +
      'Please provide both Bid and Listing from the same Auction House. ' +
      'They should have the same "auctionHouse.address".';
    super(message);
  }
}

/** @group Errors */
export class BidAndListingHaveDifferentMintsError extends AuctionHouseError {
  readonly name: string = 'BidAndListingHaveDifferentMintsError';
  constructor() {
    const message =
      'You are trying to execute a sale using a Bid and a Listing that have different mint addresses. ' +
      'Please provide a Bid and a Listing on the same asset in order to execute the sale. ' +
      'They should have the same "asset.address".';
    super(message);
  }
}

/** @group Errors */
export class CanceledBidIsNotAllowedError extends AuctionHouseError {
  readonly name: string = 'CanceledBidIsNotAllowedError';
  constructor() {
    const message =
      'You are trying to execute a sale using a canceled Bid. ' +
      'Please provide a Bid that is not cancelled in order to execute the sale.';
    super(message);
  }
}

/** @group Errors */
export class CanceledListingIsNotAllowedError extends AuctionHouseError {
  readonly name: string = 'CanceledListingIsNotAllowedError';
  constructor() {
    const message =
      'You are trying to execute a sale using a canceled Listing. ' +
      'Please provide a Listing that is not cancelld in order to execute the sale.';
    super(message);
  }
}

/** @group Errors */
export class CreateListingRequiresSignerError extends AuctionHouseError {
  readonly name: string = 'CreateListingRequiresSignerError';
  constructor() {
    const message =
      'You are trying to create a listing without providing a signer. ' +
      'Either a seller or authority must be a Signer.';
    super(message);
  }
}

/** @group Errors */
export class WithdrawFromBuyerAccountRequiresSignerError extends AuctionHouseError {
  readonly name: string = 'WithdrawFromBuyerAccountRequiresSignerError';
  constructor() {
    const message =
      'You are trying to withdraw from buyer account without providing a signer. ' +
      'Either a buyer or authority must be a Signer.';
    super(message);
  }
}

/** @group Errors */
export class PartialPriceMismatchError extends AuctionHouseError {
  readonly name: string = 'PartialPriceMismatchError';
  constructor(expected: Amount, actual: Amount) {
    const message =
      'The calculated partial price does not equal the partial price provided. ' +
      `Expected to receive ${formatAmount(expected)} per SFT ` +
      `but provided ${formatAmount(actual)} per SFT. ` +
      'The token price must equal the price it has in the listing. ' +
      'If executing a partial sale, ' +
      'divide the total price by the number of total tokens on sale and multiply it by the number of tokens you want to buy.';
    super(message);
  }
}

/** @group Errors */
export class FindAllSupportsOnlyThreeFiltersMaxError extends AuctionHouseError {
  readonly name: string = 'FindAllSupportsOnlyThreeFiltersMaxError';
  constructor() {
    const message =
      'Solana filter allows only to provide four custom filters, ' +
      'one of the filters is internal so it is only possible to provide 3 custom filters. ' +
      'Please provide less filters to the find all query.';
    super(message);
  }
}
