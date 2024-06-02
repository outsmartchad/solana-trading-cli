import { Buffer } from 'buffer';
import type { Metaplex } from '@/Metaplex';
import { BigNumber, Pda, Program, PublicKey } from '@/types';
import { Option } from '@/utils';

/**
 * This client allows you to build PDAs related to the Auction House module.
 *
 * @see {@link AuctionHouseClient}
 * @group Module Pdas
 */
export class AuctionHousePdasClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /** Finds the Auction House PDA for a creator and treasury tuple. */
  auctionHouse(input: {
    /** The address of the Auction House's creator. */
    creator: PublicKey;
    /** The mint address of the Auction House's treasury. */
    treasuryMint: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      input.creator.toBuffer(),
      input.treasuryMint.toBuffer(),
    ]);
  }

  /** Finds the Auctioneer PDA of an Auction House. */
  auctioneer(input: {
    /** The Auction House address. */
    auctionHouse: PublicKey;
    /** The address of the Auctioneer authority. */
    auctioneerAuthority: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auctioneer', 'utf8'),
      input.auctionHouse.toBuffer(),
      input.auctioneerAuthority.toBuffer(),
    ]);
  }

  /**
   * Finds the PDA of the Auction House Program
   * itself used to sign transaction.
   */
  programAsSigner(input?: {
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input?.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      Buffer.from('signer', 'utf8'),
    ]);
  }

  /** Finds the PDA of an Auction House's fee account. */
  fee(input: {
    /** The Auction House address. */
    auctionHouse: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      input.auctionHouse.toBuffer(),
      Buffer.from('fee_payer', 'utf8'),
    ]);
  }

  /** Finds the PDA of an Auction House's treasury account. */
  treasury(input: {
    /** The Auction House address. */
    auctionHouse: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      input.auctionHouse.toBuffer(),
      Buffer.from('treasury', 'utf8'),
    ]);
  }

  /** Finds the PDA of a buyer's escrow account. */
  buyerEscrow(input: {
    /** The Auction House address. */
    auctionHouse: PublicKey;
    /** The address of the buyer. */
    buyer: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      input.auctionHouse.toBuffer(),
      input.buyer.toBuffer(),
    ]);
  }

  /** Finds the trade state PDA of a bid or listing. */
  tradeState(input: {
    /** The Auction House address. */
    auctionHouse: PublicKey;
    /** The address of the buyer or seller. */
    wallet: PublicKey;
    /** The mint address of the Auction House's treasury at the time of trade. */
    treasuryMint: PublicKey;
    /** The mint address of the token to trade. */
    tokenMint: PublicKey;
    /** The price of the trade in basis points. */
    price: BigNumber;
    /** The number of tokens to trade in basis points. */
    tokenSize: BigNumber;
    /** The token account from which to trade, unless it is a public bid. */
    tokenAccount?: Option<PublicKey>;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('auction_house', 'utf8'),
      input.wallet.toBuffer(),
      input.auctionHouse.toBuffer(),
      ...(input.tokenAccount ? [input.tokenAccount.toBuffer()] : []),
      input.treasuryMint.toBuffer(),
      input.tokenMint.toBuffer(),
      input.price.toArrayLike(Buffer, 'le', 8),
      input.tokenSize.toArrayLike(Buffer, 'le', 8),
    ]);
  }

  /** Finds the receipt PDA of a Listing trade state. */
  listingReceipt(input: {
    /** The trade state PDA of the Listing. */
    tradeState: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('listing_receipt', 'utf8'),
      input.tradeState.toBuffer(),
    ]);
  }

  /** Finds the receipt PDA of a Bid trade state. */
  bidReceipt(input: {
    /** The trade state PDA of the Bid. */
    tradeState: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('bid_receipt', 'utf8'),
      input.tradeState.toBuffer(),
    ]);
  }

  /** Finds the receipt PDA of a Purchase. */
  purchaseReceipt(input: {
    /** The trade state PDA of the Listing. */
    listingTradeState: PublicKey;
    /** The trade state PDA of the Bid. */
    bidTradeState: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const programId = this.programId(input.programs);
    return Pda.find(programId, [
      Buffer.from('purchase_receipt', 'utf8'),
      input.listingTradeState.toBuffer(),
      input.bidTradeState.toBuffer(),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.metaplex.programs().getAuctionHouse(programs).address;
  }
}
