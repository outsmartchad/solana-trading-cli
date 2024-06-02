import {
  CancelInstructionAccounts,
  createAuctioneerCancelInstruction,
  createCancelBidReceiptInstruction,
  createCancelInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { AuctioneerAuthorityRequiredError } from '../errors';
import { AuctionHouse, Bid } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  isSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Pda,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import { NftWithToken, SftWithToken } from '@/plugins/nftModule';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'CancelBidOperation' as const;

/**
 * Cancels the user's bid in the given auction house.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .cancelBid({ auctionHouse, bid };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const cancelBidOperation = useOperation<CancelBidOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CancelBidOperation = Operation<
  typeof Key,
  CancelBidInput,
  CancelBidOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CancelBidInput = {
  /**
   * The Auction House in which to cancel Bid.
   * We only need a subset of the `AuctionHouse` model but we
   * need enough information regarding its settings to know how
   * to cancel bid.
   *
   * This includes, its address, authority address, its fee account address, etc.
   */
  auctionHouse: Pick<
    AuctionHouse,
    'authorityAddress' | 'address' | 'feeAccountAddress' | 'hasAuctioneer'
  >;

  /**
   * The Bid to cancel.
   * We only need a subset of the `Bid` model but we
   * need enough information regarding its settings to know how
   * to cancel it.
   *
   * This includes, its asset, buyer address, price, receipt address etc.
   */
  bid: Pick<
    Bid,
    | 'asset'
    | 'buyerAddress'
    | 'isPublic'
    | 'price'
    | 'receiptAddress'
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
export type CancelBidOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const cancelBidOperationHandler: OperationHandler<CancelBidOperation> = {
  handle: async (
    operation: CancelBidOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ) =>
    cancelBidBuilder(metaplex, operation.input, scope).sendAndConfirm(
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
export type CancelBidBuilderParams = Omit<CancelBidInput, 'confirmOptions'> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CancelBidBuilderContext = Omit<CancelBidOutput, 'response'>;

/**
 * Cancels the user's bid in the given auction house.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .cancelBid({ auctionHouse, bid });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const cancelBidBuilder = (
  metaplex: Metaplex,
  params: CancelBidBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<CancelBidBuilderContext> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { auctionHouse, auctioneerAuthority, bid } = params;

  // Data.
  const {
    asset,
    buyerAddress,
    tradeStateAddress,
    price,
    receiptAddress,
    tokens,
    isPublic,
  } = bid;
  const {
    authorityAddress,
    address: auctionHouseAddress,
    feeAccountAddress,
    hasAuctioneer,
  } = auctionHouse;

  if (hasAuctioneer && !auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }

  // Accounts.
  const tokenAccount = isPublic
    ? metaplex
        .tokens()
        .pdas()
        .associatedTokenAccount({
          mint: asset.mint.address,
          owner: toPublicKey(buyerAddress),
          programs,
        })
    : (asset as SftWithToken | NftWithToken).token.address;

  const accounts: CancelInstructionAccounts = {
    wallet: buyerAddress,
    tokenAccount,
    tokenMint: asset.address,
    authority: authorityAddress,
    auctionHouse: auctionHouseAddress,
    auctionHouseFeeAccount: feeAccountAddress,
    tradeState: tradeStateAddress,
  };

  // Args.
  const args = {
    buyerPrice: price.basisPoints,
    tokenSize: tokens.basisPoints,
  };

  // Cancel Bid Instruction.
  let cancelBidInstruction = createCancelInstruction(accounts, args);
  if (auctioneerAuthority) {
    cancelBidInstruction = createAuctioneerCancelInstruction(
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

      // Cancel Bid.
      .add({
        instruction: cancelBidInstruction,
        signers: cancelSigners,
        key: params.instructionKey ?? 'cancelBid',
      })

      // Cancel Bid Receipt.
      .when(Boolean(receiptAddress), (builder) =>
        builder.add({
          instruction: createCancelBidReceiptInstruction({
            receipt: receiptAddress as Pda,
            instruction: SYSVAR_INSTRUCTIONS_PUBKEY,
          }),
          signers: [],
          key: 'cancelBidReceipt',
        })
      )
  );
};
