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
const listingReceiptDiscriminator: AccountDiscriminator = [
  240, 71, 225, 94, 200, 75, 84, 231,
];

const PUBLIC_KEY_LENGTH = PublicKey.default.toBytes().byteLength;

const TRADE_STATE = listingReceiptDiscriminator.length;
const BOOKKEEPER = TRADE_STATE + PUBLIC_KEY_LENGTH;
const AUCTION_HOUSE = BOOKKEEPER + PUBLIC_KEY_LENGTH;
const SELLER = AUCTION_HOUSE + PUBLIC_KEY_LENGTH;
const METADATA = SELLER + PUBLIC_KEY_LENGTH;

export class ListingReceiptGpaBuilder extends GpaBuilder {
  whereDiscriminator(discrimator: AccountDiscriminator) {
    return this.where(0, Buffer.from(discrimator));
  }

  listingReceiptAccounts() {
    return this.whereDiscriminator(listingReceiptDiscriminator);
  }

  whereAuctionHouse(auctionHouseAddress: PublicKey) {
    return this.listingReceiptAccounts().where(
      AUCTION_HOUSE,
      auctionHouseAddress
    );
  }

  whereSeller(sellerAddress: PublicKey) {
    return this.where(SELLER, sellerAddress);
  }

  whereMetadata(metadataAddress: PublicKey) {
    return this.where(METADATA, metadataAddress);
  }
}
