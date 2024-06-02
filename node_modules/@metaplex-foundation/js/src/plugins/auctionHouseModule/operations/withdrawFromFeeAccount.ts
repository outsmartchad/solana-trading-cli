import {
  createWithdrawFromFeeInstruction,
  WithdrawFromFeeInstructionAccounts,
} from '@metaplex-foundation/mpl-auction-house';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { AuctionHouse } from '../models';
import type { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SolAmount,
  SplTokenAmount,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'WithdrawFromFeeAccountOperation' as const;

/**
 * Transfers funds from Auction House Fee Wallet to the Fee Withdrawal Destination Wallet.
 * By default Fee Withdrawal Destination Wallet is set to `metaplex.identity()`.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .withdrawFromFeeAccount({ auctionHouse, amount };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const withdrawFromFeeAccountOperation =
  useOperation<WithdrawFromFeeAccountOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type WithdrawFromFeeAccountOperation = Operation<
  typeof Key,
  WithdrawFromFeeAccountInput,
  WithdrawFromFeeAccountOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type WithdrawFromFeeAccountInput = {
  /**
   * The Auction House from which to transfer funds from the fee wallet to the fee withdrawal destination wallet.
   * `feeWithdrawalDestinationAddress` is set on Auction House creation, but you can also change it via the `update` operation.
   * */
  auctionHouse: Pick<
    AuctionHouse,
    | 'address'
    | 'authorityAddress'
    | 'feeWithdrawalDestinationAddress'
    | 'feeAccountAddress'
  >;

  /**
   * The Auction House authority.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer;

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
export type WithdrawFromFeeAccountOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const withdrawFromFeeAccountOperationHandler: OperationHandler<WithdrawFromFeeAccountOperation> =
  {
    handle: async (
      operation: WithdrawFromFeeAccountOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) =>
      withdrawFromFeeAccountBuilder(
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
export type WithdrawFromFeeAccountBuilderParams = Omit<
  WithdrawFromFeeAccountInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type WithdrawFromFeeAccountBuilderContext = Omit<
  WithdrawFromFeeAccountOutput,
  'response'
>;

/**
 * Transfers funds from Auction House Fee Wallet to the Fee Withdrawal Destination Wallet.
 * By default Fee Withdrawal Destination Wallet is set to `metaplex.identity()`.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .withdrawFromFeeAccount({ auctionHouse, amount });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const withdrawFromFeeAccountBuilder = (
  metaplex: Metaplex,
  params: WithdrawFromFeeAccountBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<WithdrawFromFeeAccountBuilderContext> => {
  // Data.
  const { payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    auctionHouse,
    amount,
    instructionKey,
    authority = metaplex.identity(),
  } = params;

  // Accounts.
  const accounts: WithdrawFromFeeInstructionAccounts = {
    authority: auctionHouse.authorityAddress,
    feeWithdrawalDestination: auctionHouse.feeWithdrawalDestinationAddress,
    auctionHouse: auctionHouse.address,
    auctionHouseFeeAccount: auctionHouse.feeAccountAddress,
  };

  // Withdraw From Fee Instruction.
  const withdrawFromFeeInstruction = createWithdrawFromFeeInstruction(
    accounts,
    { amount: amount.basisPoints }
  );

  // Signers.
  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Withdraw From Fee.
      .add({
        instruction: withdrawFromFeeInstruction,
        signers: [authority],
        key: instructionKey ?? 'withdrawFromFeeAccount',
      })
  );
};
