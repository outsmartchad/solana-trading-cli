import { PublicKey } from '@solana/web3.js';
import { GpaBuilder } from '@/utils';

type AccountDiscriminator = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];
// TODO: copied from auction house SDK
// SDK should either provide a GPA builder or expose this discriminator
const bidReceiptDiscriminator: AccountDiscriminator = [
  186, 150, 141, 135, 59, 122, 39, 99,
];

const PUBLIC_KEY_LENGTH = PublicKey.default.toBytes().byteLength;

const TRADE_STATE = bidReceiptDiscriminator.length;
const BOOKKEEPER = TRADE_STATE + PUBLIC_KEY_LENGTH;
const AUCTION_HOUSE = BOOKKEEPER + PUBLIC_KEY_LENGTH;
const BUYER = AUCTION_HOUSE + PUBLIC_KEY_LENGTH;
const METADATA = BUYER + PUBLIC_KEY_LENGTH;

export class BidReceiptGpaBuilder extends GpaBuilder {
  whereDiscriminator(discrimator: AccountDiscriminator) {
    return this.where(0, Buffer.from(discrimator));
  }

  bidReceiptAccounts() {
    return this.whereDiscriminator(bidReceiptDiscriminator);
  }

  whereAuctionHouse(auctionHouseAddress: PublicKey) {
    return this.bidReceiptAccounts().where(AUCTION_HOUSE, auctionHouseAddress);
  }

  whereBuyer(buyerAddress: PublicKey) {
    return this.where(BUYER, buyerAddress);
  }

  whereMetadata(metadataAddress: PublicKey) {
    return this.where(METADATA, metadataAddress);
  }
}
