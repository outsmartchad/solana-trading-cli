import { cusper, PROGRAM_ID } from '@metaplex-foundation/mpl-auction-house';
import { ProgramClient } from '../programModule';
import { AuctionHouseClient } from './AuctionHouseClient';
import {
  cancelBidOperation,
  cancelBidOperationHandler,
  cancelListingOperation,
  cancelListingOperationHandler,
  createAuctionHouseOperation,
  createAuctionHouseOperationHandler,
  createBidOperation,
  createBidOperationHandler,
  createListingOperation,
  createListingOperationHandler,
  depositToBuyerAccountOperation,
  depositToBuyerAccountOperationHandler,
  directBuyOperation,
  directBuyOperationHandler,
  directSellOperation,
  directSellOperationHandler,
  executeSaleOperation,
  executeSaleOperationHandler,
  findAuctionHouseByAddressOperation,
  findAuctionHouseByAddressOperationHandler,
  findAuctionHouseByCreatorAndMintOperation,
  findAuctionHouseByCreatorAndMintOperationHandler,
  findBidByReceiptOperation,
  findBidByReceiptOperationHandler,
  findBidByTradeStateOperation,
  findBidByTradeStateOperationHandler,
  findBidsOperation,
  findBidsOperationHandler,
  findListingByReceiptOperation,
  findListingByReceiptOperationHandler,
  findListingByTradeStateOperation,
  findListingByTradeStateOperationHandler,
  findListingsOperation,
  findListingsOperationHandler,
  findPurchaseByReceiptOperation,
  findPurchaseByReceiptOperationHandler,
  findPurchaseByTradeStateOperation,
  findPurchaseByTradeStateOperationHandler,
  findPurchasesOperation,
  findPurchasesOperationHandler,
  getBuyerBalanceOperation,
  getBuyerBalanceOperationHandler,
  loadBidOperation,
  loadBidOperationHandler,
  loadListingOperation,
  loadListingOperationHandler,
  loadPurchaseOperation,
  loadPurchaseOperationHandler,
  updateAuctionHouseOperation,
  updateAuctionHouseOperationHandler,
  withdrawFromBuyerAccountOperation,
  withdrawFromBuyerAccountOperationHandler,
  withdrawFromFeeAccountOperation,
  withdrawFromFeeAccountOperationHandler,
  withdrawFromTreasuryAccountOperation,
  withdrawFromTreasuryAccountOperationHandler,
} from './operations';
import type { ErrorWithLogs, MetaplexPlugin, Program } from '@/types';
import type { Metaplex } from '@/Metaplex';

/** @group Plugins */
export const auctionHouseModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    // Auction House Program.
    const auctionHouseProgram = {
      name: 'AuctionHouseProgram',
      address: PROGRAM_ID,
      errorResolver: (error: ErrorWithLogs) =>
        cusper.errorFromProgramLogs(error.logs, false),
    };
    metaplex.programs().register(auctionHouseProgram);
    metaplex.programs().getAuctionHouse = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(auctionHouseProgram.name, programs);
    };

    const op = metaplex.operations();
    op.register(cancelBidOperation, cancelBidOperationHandler);
    op.register(cancelListingOperation, cancelListingOperationHandler);
    op.register(
      createAuctionHouseOperation,
      createAuctionHouseOperationHandler
    );
    op.register(createBidOperation, createBidOperationHandler);
    op.register(createListingOperation, createListingOperationHandler);
    op.register(
      depositToBuyerAccountOperation,
      depositToBuyerAccountOperationHandler
    );
    op.register(directBuyOperation, directBuyOperationHandler);
    op.register(directSellOperation, directSellOperationHandler);
    op.register(executeSaleOperation, executeSaleOperationHandler);
    op.register(
      findAuctionHouseByAddressOperation,
      findAuctionHouseByAddressOperationHandler
    );
    op.register(
      findAuctionHouseByCreatorAndMintOperation,
      findAuctionHouseByCreatorAndMintOperationHandler
    );
    op.register(findBidByReceiptOperation, findBidByReceiptOperationHandler);
    op.register(
      findBidByTradeStateOperation,
      findBidByTradeStateOperationHandler
    );
    op.register(findBidsOperation, findBidsOperationHandler);
    op.register(
      findListingByReceiptOperation,
      findListingByReceiptOperationHandler
    );
    op.register(
      findListingByTradeStateOperation,
      findListingByTradeStateOperationHandler
    );
    op.register(findListingsOperation, findListingsOperationHandler);
    op.register(
      findPurchaseByReceiptOperation,
      findPurchaseByReceiptOperationHandler
    );
    op.register(
      findPurchaseByTradeStateOperation,
      findPurchaseByTradeStateOperationHandler
    );
    op.register(findPurchasesOperation, findPurchasesOperationHandler);
    op.register(getBuyerBalanceOperation, getBuyerBalanceOperationHandler);
    op.register(loadBidOperation, loadBidOperationHandler);
    op.register(loadListingOperation, loadListingOperationHandler);
    op.register(loadPurchaseOperation, loadPurchaseOperationHandler);
    op.register(
      updateAuctionHouseOperation,
      updateAuctionHouseOperationHandler
    );
    op.register(
      withdrawFromBuyerAccountOperation,
      withdrawFromBuyerAccountOperationHandler
    );
    op.register(
      withdrawFromFeeAccountOperation,
      withdrawFromFeeAccountOperationHandler
    );
    op.register(
      withdrawFromTreasuryAccountOperation,
      withdrawFromTreasuryAccountOperationHandler
    );

    metaplex.auctionHouse = function () {
      return new AuctionHouseClient(this);
    };
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    auctionHouse(): AuctionHouseClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getAuctionHouse(programs?: Program[]): Program;
  }
}
