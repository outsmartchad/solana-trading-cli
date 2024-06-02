import {
  createAuctioneerWithdrawInstruction,
  createWithdrawInstruction,
  WithdrawInstructionAccounts,
} from '@metaplex-foundation/mpl-auction-house';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  AuctioneerAuthorityRequiredError,
  WithdrawFromBuyerAccountRequiresSignerError,
} from '../errors';
import { AuctionHouse } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  isSigner,
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SolAmount,
  SplTokenAmount,
  toPublicKey,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'WithdrawFromBuyerAccountOperation' as const;

/**
 * Withdraws funds from the user's buyer escrow account for the given auction house.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .withdrawFromBuyerAccount({ auctionHouse, buyer, amount };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const withdrawFromBuyerAccountOperation =
  useOperation<WithdrawFromBuyerAccountOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type WithdrawFromBuyerAccountOperation = Operation<
  typeof Key,
  WithdrawFromBuyerAccountInput,
  WithdrawFromBuyerAccountOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type WithdrawFromBuyerAccountInput = {
  /** The Auction House from which escrow buyer withdraws funds. */
  auctionHouse: Pick<
    AuctionHouse,
    | 'address'
    | 'authorityAddress'
    | 'hasAuctioneer'
    | 'treasuryMint'
    | 'feeAccountAddress'
  >;

  /**
   * The buyer who withdraws funds.
   *
   * There must be one and only one signer; Authority or Seller must sign.
   *
   * @defaultValue `metaplex.identity()`
   */
  buyer?: PublicKey | Signer;

  /**
   * The Authority key.
   * It is required when the buyer is not a signer.
   * There must be one and only one signer; Authority or Buyer must sign.
   *
   * @defaultValue Defaults to not being used.
   */
  authority?: Signer;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: Signer;

  /**
   * Amount of funds to withdraw.
   * This can either be in SOL or in the SPL token used by the Auction House as a currency.
   */
  amount: SolAmount | SplTokenAmount;
};

/**
 * @group Operations
 * @category Outputs
 */
export type WithdrawFromBuyerAccountOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const withdrawFromBuyerAccountOperationHandler: OperationHandler<WithdrawFromBuyerAccountOperation> =
  {
    handle: async (
      operation: WithdrawFromBuyerAccountOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) =>
      withdrawFromBuyerAccountBuilder(
        metaplex,
        operation.input,
        scope
      ).sendAndConfirm(metaplex, scope.confirmOptions),
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type WithdrawFromBuyerAccountBuilderParams = Omit<
  WithdrawFromBuyerAccountInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type WithdrawFromBuyerAccountBuilderContext = Omit<
  WithdrawFromBuyerAccountOutput,
  'response'
>;

/**
 * Withdraws funds from the user's buyer escrow account to the given auction house.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .withdrawFromBuyerAccountBuilder({ auctionHouse, buyer, amount });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const withdrawFromBuyerAccountBuilder = (
  metaplex: Metaplex,
  params: WithdrawFromBuyerAccountBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<WithdrawFromBuyerAccountBuilderContext> => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { auctionHouse, auctioneerAuthority, amount } = params;

  if (auctionHouse.hasAuctioneer && !params.auctioneerAuthority) {
    throw new AuctioneerAuthorityRequiredError();
  }

  const amountBasisPoint = amount.basisPoints;
  const buyer = params.buyer ?? (metaplex.identity() as Signer);
  const authority = params.authority ?? auctionHouse.authorityAddress;

  if (!isSigner(buyer) && !isSigner(authority)) {
    throw new WithdrawFromBuyerAccountRequiresSignerError();
  }

  const escrowPayment = metaplex
    .auctionHouse()
    .pdas()
    .buyerEscrow({
      auctionHouse: auctionHouse.address,
      buyer: toPublicKey(buyer),
      programs,
    });

  // Accounts,
  const accounts: WithdrawInstructionAccounts = {
    wallet: toPublicKey(buyer),
    receiptAccount: toPublicKey(buyer),
    escrowPaymentAccount: escrowPayment,
    treasuryMint: auctionHouse.treasuryMint.address,
    authority: toPublicKey(authority),
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
  };

  // Args.
  const args = {
    escrowPaymentBump: escrowPayment.bump,
    amount: amountBasisPoint,
  };

  // Withdraw Instruction.
  let withdrawInstruction = createWithdrawInstruction(accounts, args);
  if (auctioneerAuthority) {
    const ahAuctioneerPda = metaplex.auctionHouse().pdas().auctioneer({
      auctionHouse: auctionHouse.address,
      auctioneerAuthority: auctioneerAuthority.publicKey,
      programs,
    });

    const accountsWithAuctioneer = {
      ...accounts,
      auctioneerAuthority: auctioneerAuthority.publicKey,
      ahAuctioneerPda,
    };

    withdrawInstruction = createAuctioneerWithdrawInstruction(
      accountsWithAuctioneer,
      args
    );
  }

  // Signers.
  const signer = isSigner(buyer) ? buyer : (authority as Signer);
  const withdrawSigners = [signer, params.auctioneerAuthority].filter(isSigner);

  // Update the account to be a signer since it's not covered properly by MPL due to its dynamic nature.
  const signerKeyIndex = withdrawInstruction.keys.findIndex((key) =>
    key.pubkey.equals(signer.publicKey)
  );
  withdrawInstruction.keys[signerKeyIndex].isSigner = true;

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Withdraw.
      .add({
        instruction: withdrawInstruction,
        signers: withdrawSigners,
        key: params.instructionKey ?? 'withdrawFromBuyerAccount',
      })
  );
};
