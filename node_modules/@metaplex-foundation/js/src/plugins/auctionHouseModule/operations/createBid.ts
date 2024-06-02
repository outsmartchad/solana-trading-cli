import {
  BuyInstructionAccounts,
  createAuctioneerBuyInstruction,
  createAuctioneerPublicBuyInstruction,
  createBuyInstruction,
  createPrintBidReceiptInstruction,
  createPublicBuyInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { AuctioneerAuthorityRequiredError } from '../errors';
import { AuctionHouse, Bid, LazyBid } from '../models';
import { Option, TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  amount,
  isSigner,
  lamports,
  makeConfirmOptionsFinalizedOnMainnet,
  now,
  Operation,
  OperationHandler,
  OperationScope,
  Pda,
  Signer,
  SolAmount,
  SplTokenAmount,
  token,
  toPublicKey,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'CreateBidOperation' as const;

/**
 * Creates a bid on a given asset.
 *
 * You can post a public bid on a non-listed NFT by skipping seller and tokenAccount properties.
 * Public bids are specific to the token itself and not to any specific auction.
 * This means that a bid can stay active beyond the end of an auction
 * and be resolved if it meets the criteria for subsequent auctions of that token.
 *
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .bid({ auctionHouse, mintAccount, seller };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createBidOperation = useOperation<CreateBidOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateBidOperation = Operation<
  typeof Key,
  CreateBidInput,
  CreateBidOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateBidInput = {
  /** The Auction House in which to create a Bid. */
  auctionHouse: AuctionHouse;

  /**
   * Creator of a bid.
   *
   * @defaultValue `metaplex.identity()`
   */
  buyer?: Signer;

  /**
   * The Auction House authority.
   * If this is Signer the transaction fee
   * will be paid from the Auction House Fee Account
   *
   * @defaultValue `auctionHouse.authority`
   */
  authority?: PublicKey | Signer;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: Signer;

  /**
   * The mint account to create a bid for.
   * This is used to find the metadata.
   */
  mintAccount: PublicKey;

  /**
   * The account address that holds the asset a bid created is for.
   * If this or tokenAccount isn't provided, then the bid will be public.
   *
   * @defaultValue No default value.
   */
  seller?: Option<PublicKey>;

  /**
   * The token account address that's associated to the asset a bid created is for.
   * If this or seller isn't provided, then the bid will be public.
   *
   * @defaultValue No default value.
   */
  tokenAccount?: Option<PublicKey>;

  /**
   * The buyer's price.
   *
   * @defaultValue 0 SOLs or tokens.
   */
  price?: SolAmount | SplTokenAmount;

  /**
   * The number of tokens to bid for.
   * For an NFT bid it must be 1 token.
   *
   * When a Fungible Asset is put on sale.
   * The buyer can then create a buy order of said assets that is
   * less than the token_size of the sell order.
   *
   * @defaultValue 1 token.
   */
  tokens?: SplTokenAmount;

  /**
   * Prints the bid receipt.
   * The receipt holds information about the bid,
   * So it's important to print it if you want to use the `Bid` model
   *
   * The receipt printing is skipped for the Auctioneer Auction House
   * Since it currently doesn't support it.
   *
   * @defaultValue `true`
   */
  printReceipt?: boolean;

  /**
   * The address of the bookkeeper wallet responsible for the receipt.
   *
   * @defaultValue `metaplex.identity()`
   */
  bookkeeper?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateBidOutput = {
  /** Buyer trade state account PDA encoding the bid order. */
  buyerTradeState: Pda;

  /** The asset's token account address in case the bid is private. */
  tokenAccount: Option<PublicKey>;

  /** The asset's metadata PDA. */
  metadata: Pda;

  /** The potential buyer of the asset. */
  buyer: PublicKey;

  /** The PDA of the receipt account in case it was printed. */
  receipt: Option<Pda>;

  /** The address of the bookkeeper wallet responsible for the receipt. */
  bookkeeper: Option<PublicKey>;

  /** The buyer's price. */
  price: SolAmount | SplTokenAmount;

  /** The number of tokens to bid for. */
  tokens: SplTokenAmount;

  /** A model that keeps information about the Bid. */
  bid: Bid;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createBidOperationHandler: OperationHandler<CreateBidOperation> = {
  async handle(
    operation: CreateBidOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<CreateBidOutput> {
    const { auctionHouse } = operation.input;

    const builder = await createBidBuilder(metaplex, operation.input, scope);
    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
      metaplex,
      scope.confirmOptions
    );
    const output = await builder.sendAndConfirm(metaplex, confirmOptions);
    scope.throwIfCanceled();

    if (output.receipt) {
      const bid = await metaplex
        .auctionHouse()
        .findBidByReceipt(
          { auctionHouse, receiptAddress: output.receipt },
          scope
        );

      return { bid, ...output };
    }

    scope.throwIfCanceled();
    const lazyBid: LazyBid = {
      model: 'bid',
      lazy: true,
      auctionHouse,
      tradeStateAddress: output.buyerTradeState,
      bookkeeperAddress: output.bookkeeper,
      tokenAddress: output.tokenAccount,
      buyerAddress: output.buyer,
      metadataAddress: output.metadata,
      receiptAddress: output.receipt,
      purchaseReceiptAddress: null,
      isPublic: Boolean(output.tokenAccount),
      price: output.price,
      tokens: output.tokens.basisPoints,
      createdAt: now(),
      canceledAt: null,
    };

    return {
      bid: await metaplex.auctionHouse().loadBid({ lazyBid }, scope),
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
export type CreateBidBuilderParams = Omit<CreateBidInput, 'confirmOptions'> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateBidBuilderContext = Omit<CreateBidOutput, 'response' | 'bid'>;

/**
 * Creates a bid on a given asset.
 *
 * You can post a public bid on a non-listed NFT by skipping seller and tokenAccount properties.
 * Public bids are specific to the token itself and not to any specific auction.
 * This means that a bid can stay active beyond the end of an auction
 * and be resolved if it meets the criteria for subsequent auctions of that token.
 *
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .createBid({ auctionHouse, mintAccount, seller })
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createBidBuilder = async (
  metaplex: Metaplex,
  params: CreateBidBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<CreateBidBuilderContext>> => {
  // Data.
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { auctionHouse } = params;
  const tokens = params.tokens ?? token(1);
  const priceBasisPoint = params.price?.basisPoints ?? 0;
  const price = auctionHouse.isNative
    ? lamports(priceBasisPoint)
    : amount(priceBasisPoint, auctionHouse.treasuryMint.currency);

  if (auctionHouse.hasAuctioneer && !params.auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }

  // Accounts.
  const buyer = params.buyer ?? (metaplex.identity() as Signer);
  const authority = params.authority ?? auctionHouse.authorityAddress;
  const metadata = metaplex.nfts().pdas().metadata({
    mint: params.mintAccount,
    programs,
  });
  const paymentAccount = auctionHouse.isNative
    ? toPublicKey(buyer)
    : metaplex
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: auctionHouse.treasuryMint.address,
          owner: toPublicKey(buyer),
          programs,
        });
  const escrowPayment = metaplex
    .auctionHouse()
    .pdas()
    .buyerEscrow({
      auctionHouse: auctionHouse.address,
      buyer: toPublicKey(buyer),
      programs,
    });
  const tokenAccount =
    params.tokenAccount ??
    (params.seller
      ? metaplex.tokens().pdas().associatedTokenAccount({
          mint: params.mintAccount,
          owner: params.seller,
          programs,
        })
      : null);
  const buyerTokenAccount = metaplex
    .tokens()
    .pdas()
    .associatedTokenAccount({
      mint: params.mintAccount,
      owner: toPublicKey(buyer),
      programs,
    });

  const buyerTradeState = metaplex
    .auctionHouse()
    .pdas()
    .tradeState({
      auctionHouse: auctionHouse.address,
      wallet: toPublicKey(buyer),
      treasuryMint: auctionHouse.treasuryMint.address,
      tokenMint: params.mintAccount,
      price: price.basisPoints,
      tokenSize: tokens.basisPoints,
      tokenAccount,
      programs,
    });

  const accounts: Omit<BuyInstructionAccounts, 'tokenAccount'> = {
    wallet: toPublicKey(buyer),
    paymentAccount,
    transferAuthority: toPublicKey(buyer),
    treasuryMint: auctionHouse.treasuryMint.address,
    metadata,
    escrowPaymentAccount: escrowPayment,
    authority: toPublicKey(authority),
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
    buyerTradeState,
  };

  // Args.
  const args = {
    tradeStateBump: buyerTradeState.bump,
    escrowPaymentBump: escrowPayment.bump,
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  // Sell Instruction.
  let buyInstruction = tokenAccount
    ? createBuyInstruction({ ...accounts, tokenAccount }, args)
    : createPublicBuyInstruction(
        { ...accounts, tokenAccount: buyerTokenAccount },
        args
      );

  if (params.auctioneerAuthority) {
    const ahAuctioneerPda = metaplex.auctionHouse().pdas().auctioneer({
      auctionHouse: auctionHouse.address,
      auctioneerAuthority: params.auctioneerAuthority.publicKey,
      programs,
    });

    const accountsWithAuctioneer = {
      ...accounts,
      auctioneerAuthority: params.auctioneerAuthority.publicKey,
      ahAuctioneerPda,
    };

    buyInstruction = tokenAccount
      ? createAuctioneerBuyInstruction(
          { ...accountsWithAuctioneer, tokenAccount },
          args
        )
      : createAuctioneerPublicBuyInstruction(
          {
            ...accountsWithAuctioneer,
            tokenAccount: buyerTokenAccount,
          },
          args
        );
  }

  // Signers.
  const buySigners = [buyer, authority, params.auctioneerAuthority].filter(
    isSigner
  );

  // Update the accounts to be signers since it's not covered properly by MPL due to its dynamic nature.
  buySigners.forEach((signer) => {
    const signerKeyIndex = buyInstruction.keys.findIndex(({ pubkey }) =>
      pubkey.equals(signer.publicKey)
    );

    buyInstruction.keys[signerKeyIndex].isSigner = true;
  });

  // Receipt.
  // Since createPrintBidReceiptInstruction can't deserialize createAuctioneerBuyInstruction due to a bug
  // Don't print Auctioneer Bid receipt for the time being.
  const shouldPrintReceipt =
    (params.printReceipt ?? true) && !params.auctioneerAuthority;
  const bookkeeper = params.bookkeeper ?? metaplex.identity();
  const receipt = metaplex.auctionHouse().pdas().bidReceipt({
    tradeState: buyerTradeState,
    programs,
  });

  const builder = TransactionBuilder.make<CreateBidBuilderContext>()
    .setFeePayer(payer)
    .setContext({
      buyerTradeState,
      tokenAccount,
      metadata,
      buyer: toPublicKey(buyer),
      receipt: shouldPrintReceipt ? receipt : null,
      bookkeeper: shouldPrintReceipt ? bookkeeper.publicKey : null,
      price,
      tokens,
    });

  // Create a TA for public bid if it doesn't exist
  if (!tokenAccount) {
    const account = await metaplex.rpc().getAccount(buyerTokenAccount);
    if (!account.exists) {
      builder.add(
        await metaplex
          .tokens()
          .builders()
          .createToken({
            mint: params.mintAccount,
            owner: toPublicKey(buyer),
          })
      );
    }
  }

  return (
    builder
      // Create bid.
      .add({
        instruction: buyInstruction,
        signers: buySigners,
        key: 'buy',
      })

      // Print the Bid Receipt.
      .when(shouldPrintReceipt, (builder) =>
        builder.add({
          instruction: createPrintBidReceiptInstruction(
            {
              receipt,
              bookkeeper: bookkeeper.publicKey,
              instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            { receiptBump: receipt.bump }
          ),
          signers: [bookkeeper],
          key: 'printBidReceipt',
        })
      )
  );
};
