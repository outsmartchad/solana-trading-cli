import {
  CancelInstructionAccounts,
  createAuctioneerCancelInstruction,
  createCancelInstruction,
  createCancelListingReceiptInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { AUCTIONEER_PRICE } from '../constants';
import { AuctioneerAuthorityRequiredError } from '../errors';
import { AuctionHouse, Listing } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  isSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Pda,
  Signer,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'CancelListingOperation' as const;

/**
 * Cancels the user's listing in the given auction house.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .cancelListing({ auctionHouse, listing };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelListingOperation = useOperation<CancelListingOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelListingOperation = Operation<
  typeof Key,
  CancelListingInput,
  CancelListingOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelListingInput = {
  /** The Auction House in which to cancel Bid. */
  auctionHouse: Pick<
    AuctionHouse,
    'address' | 'authorityAddress' | 'feeAccountAddress' | 'hasAuctioneer'
  >;

  /**
   * The Listing to cancel.
   * We only need a subset of the `Listing` model but we
   * need enough information regarding its settings to know how
   * to cancel it.
   *
   * This includes, its asset, seller address, price, receipt address etc.
   */
  listing: Pick<
    Listing,
    | 'asset'
    | 'price'
    | 'receiptAddress'
    | 'sellerAddress'
    | 'tokens'
    | 'tradeStateAddress'
  >;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: Signer;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CancelListingOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelListingOperationHandler: OperationHandler<CancelListingOperation> =
  {
    handle: async (
      operation: CancelListingOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) =>
      cancelListingBuilder(metaplex, operation.input, scope).sendAndConfirm(
        metaplex,
        scope.confirmOptions
      ),
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CancelListingBuilderParams = Omit<
  CancelListingInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CancelListingBuilderContext = Omit<CancelListingOutput, 'response'>;

/**
 * Cancels the user's listing in the given auction house.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .cancelListing({ auctionHouse, listing });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelListingBuilder = (
  metaplex: Metaplex,
  params: CancelListingBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<CancelListingBuilderContext> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { auctionHouse, auctioneerAuthority, listing } = params;

  // Data.
  const {
    asset,
    sellerAddress,
    receiptAddress,
    tradeStateAddress,
    price,
    tokens,
  } = listing;
  const {
    address: auctionHouseAddress,
    authorityAddress,
    feeAccountAddress,
    hasAuctioneer,
  } = auctionHouse;

  if (hasAuctioneer && !auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }

  const buyerPrice = hasAuctioneer ? AUCTIONEER_PRICE : price.basisPoints;

  const accounts: CancelInstructionAccounts = {
    wallet: sellerAddress,
    tokenAccount: asset.token.address,
    tokenMint: asset.address,
    authority: authorityAddress,
    auctionHouse: auctionHouseAddress,
    auctionHouseFeeAccount: feeAccountAddress,
    tradeState: tradeStateAddress,
  };

  // Args.
  const args = {
    buyerPrice,
    tokenSize: tokens.basisPoints,
  };

  // Cancel Listing Instruction.
  let cancelListingInstruction = createCancelInstruction(accounts, args);
  if (auctioneerAuthority) {
    cancelListingInstruction = createAuctioneerCancelInstruction(
      {
        ...accounts,
        auctioneerAuthority: auctioneerAuthority.publicKey,
        ahAuctioneerPda: metaplex.auctionHouse().pdas().auctioneer({
          auctionHouse: auctionHouseAddress,
          auctioneerAuthority: auctioneerAuthority.publicKey,
          programs,
        }),
      },
      args
    );
  }

  // Signers.
  const cancelSigners = [auctioneerAuthority].filter(isSigner);

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Cancel Listing.
      .add({
        instruction: cancelListingInstruction,
        signers: cancelSigners,
        key: params.instructionKey ?? 'cancelListing',
      })

      // Cancel Listing Receipt.
      .when(Boolean(receiptAddress), (builder) =>
        builder.add({
          instruction: createCancelListingReceiptInstruction({
            receipt: receiptAddress as Pda,
            instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
          }),
          signers: [],
          key: 'cancelListingReceipt',
        })
      )
  );
};
