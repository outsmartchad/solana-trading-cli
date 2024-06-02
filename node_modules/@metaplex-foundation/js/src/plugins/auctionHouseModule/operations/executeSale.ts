import {
  AuctioneerExecuteSaleInstructionAccounts,
  createAuctioneerExecuteSaleInstruction,
  createExecutePartialSaleInstruction,
  createExecuteSaleInstruction,
  createPrintPurchaseReceiptInstruction,
  ExecutePartialSaleInstructionArgs,
} from '@metaplex-foundation/mpl-auction-house';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  AuctioneerAuthorityRequiredError,
  AuctioneerPartialSaleNotSupportedError,
  BidAndListingHaveDifferentAuctionHousesError,
  BidAndListingHaveDifferentMintsError,
  CanceledBidIsNotAllowedError,
  CanceledListingIsNotAllowedError,
  PartialPriceMismatchError,
} from '../errors';
import { AuctionHouse, Bid, LazyPurchase, Listing, Purchase } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  amount,
  isSigner,
  lamports,
  now,
  Operation,
  OperationHandler,
  OperationScope,
  Pda,
  Signer,
  SolAmount,
  SplTokenAmount,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'ExecuteSaleOperation' as const;

/**
 * Executes a sale on a given bid and listing.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .executeSale({ auctionHouse, bid, listing };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const executeSaleOperation = useOperation<ExecuteSaleOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type ExecuteSaleOperation = Operation<
  typeof Key,
  ExecuteSaleInput,
  ExecuteSaleOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type ExecuteSaleInput = {
  /**
   * The Bid that is used in the sale.
   * We only need a subset of the `Bid` model but we
   * need enough information regarding its settings to know how
   * to execute the sale.
   *
   * This includes, its asset, auction house address, buyer, receipt address etc.
   */
  bid: Pick<
    Bid,
    | 'asset'
    | 'auctionHouse'
    | 'buyerAddress'
    | 'canceledAt'
    | 'price'
    | 'receiptAddress'
    | 'tokens'
    | 'tradeStateAddress'
  >;

  /**
   * The Listing that is used in the sale.
   * We only need a subset of the `Listing` model but we
   * need enough information regarding its settings to know how
   * to execute the sale.
   *
   * This includes, its asset, auction house address, seller, receipt address etc.
   */
  listing: Pick<
    Listing,
    | 'asset'
    | 'auctionHouse'
    | 'canceledAt'
    | 'price'
    | 'receiptAddress'
    | 'sellerAddress'
    | 'tokens'
    | 'tradeStateAddress'
  >;

  /** The Auction House in which to execute a sale. */
  auctionHouse: AuctionHouse;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: Signer; // Use Auctioneer ix when provided

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
};

/**
 * @group Operations
 * @category Outputs
 */
export type ExecuteSaleOutput = {
  /** Seller trade state account address encoding the listing order. */
  sellerTradeState: PublicKey;

  /** Biyer trade state account address encoding the bid order. */
  buyerTradeState: PublicKey;

  /** The buyer address. */
  buyer: PublicKey;

  /** The seller address. */
  seller: PublicKey;

  /** The asset's metadata address. */
  metadata: PublicKey;

  /** The address of the bookkeeper account responsible for the receipt. */
  bookkeeper: Option<PublicKey>;

  /** The PDA of the receipt account in case it was printed. */
  receipt: Option<Pda>;

  /** The sale price. */
  price: SolAmount | SplTokenAmount;

  /** The number of tokens bought. */
  tokens: SplTokenAmount;

  /** A model that keeps information about the Purchase. */
  purchase: Purchase;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * Executes a sale on a given bid and listing.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .executeSale({ auctionHouse, listing, bid });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const executeSaleOperationHandler: OperationHandler<ExecuteSaleOperation> =
  {
    async handle(
      operation: ExecuteSaleOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<ExecuteSaleOutput> {
      const { auctionHouse } = operation.input;

      const output = await executeSaleBuilder(
        metaplex,
        operation.input,
        scope
      ).sendAndConfirm(metaplex, scope.confirmOptions);
      scope.throwIfCanceled();

      if (output.receipt) {
        const purchase = await metaplex
          .auctionHouse()
          .findPurchaseByReceipt(
            { auctionHouse, receiptAddress: output.receipt },
            scope
          );

        return { purchase, ...output };
      }

      const lazyPurchase: LazyPurchase = {
        model: 'purchase',
        lazy: true,
        auctionHouse: operation.input.auctionHouse,
        buyerAddress: output.buyer,
        sellerAddress: output.seller,
        metadataAddress: output.metadata,
        bookkeeperAddress: output.bookkeeper,
        receiptAddress: output.receipt,
        price: output.price,
        tokens: output.tokens.basisPoints,
        createdAt: now(),
      };

      return {
        purchase: await metaplex
          .auctionHouse()
          .loadPurchase({ lazyPurchase }, scope),
        ...output,
      };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type ExecuteSaleBuilderParams = Omit<
  ExecuteSaleInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type ExecuteSaleBuilderContext = Omit<
  ExecuteSaleOutput,
  'response' | 'purchase'
>;

/**
 * @group Transaction Builders
 * @category Constructors
 */
export const executeSaleBuilder = (
  metaplex: Metaplex,
  params: ExecuteSaleBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<ExecuteSaleBuilderContext> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { auctionHouse, listing, bid, auctioneerAuthority } = params;
  const { sellerAddress, asset } = listing;
  const { buyerAddress } = bid;
  const {
    hasAuctioneer,
    isNative,
    treasuryMint,
    address: auctionHouseAddress,
    authorityAddress,
    feeAccountAddress,
    treasuryAccountAddress,
  } = auctionHouse;

  const isPartialSale = bid.tokens.basisPoints < listing.tokens.basisPoints;

  // Use full size of listing & price when finding trade state PDA for the partial sale.
  const { tokens, price } = isPartialSale ? listing : bid;
  const { price: buyerPrice, tokens: buyerTokensSize } = bid;

  if (!listing.auctionHouse.address.equals(bid.auctionHouse.address)) {
    throw new BidAndListingHaveDifferentAuctionHousesError();
  }
  if (!listing.asset.address.equals(bid.asset.address)) {
    throw new BidAndListingHaveDifferentMintsError();
  }
  if (bid.canceledAt) {
    throw new CanceledBidIsNotAllowedError();
  }
  if (listing.canceledAt) {
    throw new CanceledListingIsNotAllowedError();
  }
  if (hasAuctioneer && !auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }
  if (isPartialSale && hasAuctioneer) {
    throw new AuctioneerPartialSaleNotSupportedError();
  }
  if (isPartialSale) {
    const listingPricePerToken = price.basisPoints.div(tokens.basisPoints);
    const buyerPricePerToken = buyerPrice.basisPoints.div(
      buyerTokensSize.basisPoints
    );

    if (!listingPricePerToken.eq(buyerPricePerToken)) {
      throw new PartialPriceMismatchError(
        auctionHouse.isNative
          ? lamports(listingPricePerToken)
          : amount(listingPricePerToken, auctionHouse.treasuryMint.currency),
        auctionHouse.isNative
          ? lamports(buyerPricePerToken)
          : amount(buyerPricePerToken, auctionHouse.treasuryMint.currency)
      );
    }
  }

  // Accounts.
  const sellerPaymentReceiptAccount = isNative
    ? sellerAddress
    : metaplex.tokens().pdas().associatedTokenAccount({
        mint: treasuryMint.address,
        owner: sellerAddress,
        programs,
      });
  const buyerReceiptTokenAccount = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: asset.address,
      owner: buyerAddress,
      programs,
    });
  const escrowPayment = metaplex.auctionHouse().pdas().buyerEscrow({
    auctionHouse: auctionHouseAddress,
    buyer: buyerAddress,
    programs,
  });
  const freeTradeState = metaplex
    .auctionHouse()
    .pdas()
    .tradeState({
      auctionHouse: auctionHouseAddress,
      wallet: sellerAddress,
      treasuryMint: treasuryMint.address,
      tokenMint: asset.address,
      price: lamports(0).basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount: asset.token.address,
      programs,
    });
  const programAsSigner = metaplex.auctionHouse().pdas().programAsSigner();

  const accounts = {
    buyer: buyerAddress,
    seller: sellerAddress,
    tokenAccount: asset.token.address,
    tokenMint: asset.address,
    metadata: asset.metadataAddress,
    treasuryMint: treasuryMint.address,
    escrowPaymentAccount: escrowPayment,
    sellerPaymentReceiptAccount,
    buyerReceiptTokenAccount,
    authority: authorityAddress,
    auctionHouse: auctionHouseAddress,
    auctionHouseFeeAccount: feeAccountAddress,
    auctionHouseTreasury: treasuryAccountAddress,
    buyerTradeState: bid.tradeStateAddress,
    sellerTradeState: listing.tradeStateAddress,
    freeTradeState,
    programAsSigner,
  };

  // Args.
  const args = {
    freeTradeStateBump: freeTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    programAsSignerBump: programAsSigner.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  // Execute Sale Instruction
  const partialSaleArgs: ExecutePartialSaleInstructionArgs = {
    ...args,
    partialOrderSize: bid.tokens.basisPoints,
    partialOrderPrice: bid.price.basisPoints,
  };

  let executeSaleInstruction = isPartialSale
    ? createExecutePartialSaleInstruction(accounts, partialSaleArgs)
    : createExecuteSaleInstruction(accounts, args);

  if (auctioneerAuthority) {
    const auctioneerAccounts: AuctioneerExecuteSaleInstructionAccounts = {
      ...accounts,
      auctioneerAuthority: auctioneerAuthority.publicKey,
      ahAuctioneerPda: metaplex.auctionHouse().pdas().auctioneer({
        auctionHouse: auctionHouse.address,
        auctioneerAuthority: auctioneerAuthority.publicKey,
        programs,
      }),
    };

    executeSaleInstruction = createAuctioneerExecuteSaleInstruction(
      auctioneerAccounts,
      args
    );
  }

  // Provide additional keys to pay royalties.
  asset.creators.forEach(({ address }) => {
    executeSaleInstruction.keys.push({
      pubkey: address,
      isWritable: true,
      isSigner: false,
    });

    // Provide ATA to receive SPL token royalty if is not native SOL sale.
    if (!isNative) {
      executeSaleInstruction.keys.push({
        pubkey: metaplex.tokens().pdas().associatedTokenAccount({
          mint: treasuryMint.address,
          owner: address,
          programs,
        }),
        isWritable: true,
        isSigner: false,
      });
    }
  });

  // Signers.
  const executeSaleSigners = [auctioneerAuthority].filter(isSigner);

  // Receipt.
  const shouldPrintReceipt =
    (params.printReceipt ?? true) &&
    Boolean(listing.receiptAddress && bid.receiptAddress && !isPartialSale);
  const bookkeeper = params.bookkeeper ?? metaplex.identity();
  const purchaseReceipt = metaplex.auctionHouse().pdas().purchaseReceipt({
    listingTradeState: listing.tradeStateAddress,
    bidTradeState: bid.tradeStateAddress,
    programs,
  });

  return (
    TransactionBuilder.make<ExecuteSaleBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        sellerTradeState: listing.tradeStateAddress,
        buyerTradeState: bid.tradeStateAddress,
        buyer: buyerAddress,
        seller: sellerAddress,
        metadata: asset.metadataAddress,
        bookkeeper: shouldPrintReceipt ? bookkeeper.publicKey : null,
        receipt: shouldPrintReceipt ? purchaseReceipt : null,
        price,
        tokens,
      })

      // Execute Sale.
      .add({
        instruction: executeSaleInstruction,
        signers: executeSaleSigners,
        key: params.instructionKey ?? 'executeSale',
      })

      // Print the Purchase Receipt.
      .when(shouldPrintReceipt, (builder) =>
        builder.add({
          instruction: createPrintPurchaseReceiptInstruction(
            {
              purchaseReceipt,
              listingReceipt: listing.receiptAddress as Pda,
              bidReceipt: bid.receiptAddress as Pda,
              bookkeeper: bookkeeper.publicKey,
              instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            { purchaseReceiptBump: purchaseReceipt.bump }
          ),
          signers: [bookkeeper],
          key: 'printPurchaseReceipt',
        })
      )
  );
};
