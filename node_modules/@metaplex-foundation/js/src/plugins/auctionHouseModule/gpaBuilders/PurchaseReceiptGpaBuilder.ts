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
const purchaseReceiptDiscriminator: AccountDiscriminator = [
  79, 127, 222, 137, 154, 131, 150, 134,
];

const PUBLIC_KEY_LENGTH = PublicKey.default.toBytes().byteLength;

const BOOKKEEPER = purchaseReceiptDiscriminator.length;
const BUYER = BOOKKEEPER + PUBLIC_KEY_LENGTH;
const SELLER = BUYER + PUBLIC_KEY_LENGTH;
const AUCTION_HOUSE = SELLER + PUBLIC_KEY_LENGTH;
const METADATA = AUCTION_HOUSE + PUBLIC_KEY_LENGTH;

export class PurchaseReceiptGpaBuilder extends GpaBuilder {
  whereDiscriminator(discrimator: AccountDiscriminator) {
    return this.where(0, Buffer.from(discrimator));
  }

  purchaseReceiptAccounts() {
    return this.whereDiscriminator(purchaseReceiptDiscriminator);
  }

  whereAuctionHouse(auctionHouseAddress: PublicKey) {
    return this.purchaseReceiptAccounts().where(
      AUCTION_HOUSE,
      auctionHouseAddress
    );
  }

  whereBuyer(buyerAddress: PublicKey) {
    return this.where(BUYER, buyerAddress);
  }

  whereSeller(sellerAddress: PublicKey) {
    return this.where(SELLER, sellerAddress);
  }

  whereMetadata(metadataAddress: PublicKey) {
    return this.where(METADATA, metadataAddress);
  }
}
