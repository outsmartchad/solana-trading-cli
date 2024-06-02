import {
  createWithdrawFromTreasuryInstruction,
  WithdrawFromTreasuryInstructionAccounts,
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

const Key = 'WithdrawFromTreasuryAccountOperation' as const;

/**
 * Transfers funds from Auction House Treasury Wallet to the Treasury Withdrawal Destination Wallet set on an Auction House creation.
 * By default Treasury Withdrawal Destination Wallet is set to `metaplex.identity()`.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .withdrawFromTreasuryAccount({ auctionHouse, amount };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const withdrawFromTreasuryAccountOperation =
  useOperation<WithdrawFromTreasuryAccountOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type WithdrawFromTreasuryAccountOperation = Operation<
  typeof Key,
  WithdrawFromTreasuryAccountInput,
  WithdrawFromTreasuryAccountOutput
>;

/**
 * @group Operations
 * @category Inputs
 */

export type WithdrawFromTreasuryAccountInput = {
  /**
   * The Auction House from which to transfer funds from the treasury wallet to the treasury withdrawal destination wallet.
   * `treasuryWithdrawalDestinationAddress` is set on Auction House creation, but you can also change it via the `update` operation.
   */
  auctionHouse: Pick<
    AuctionHouse,
    | 'treasuryMint'
    | 'authorityAddress'
    | 'treasuryWithdrawalDestinationAddress'
    | 'address'
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
export type WithdrawFromTreasuryAccountOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const withdrawFromTreasuryAccountOperationHandler: OperationHandler<WithdrawFromTreasuryAccountOperation> =
  {
    handle: async (
      operation: WithdrawFromTreasuryAccountOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) =>
      withdrawFromTreasuryAccountBuilder(
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
export type WithdrawFromTreasuryAccountBuilderParams = Omit<
  WithdrawFromTreasuryAccountInput,
  'confirmOptions'
> & {
  instructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type WithdrawFromTreasuryAccountBuilderContext = Omit<
  WithdrawFromTreasuryAccountOutput,
  'response'
>;

/**
 * Transfers funds from Auction House Treasury Wallet to the Treasury Withdrawal Destination Wallet set on an Auction House creation.
 * By default Treasury Withdrawal Destination Wallet is set to `metaplex.identity()`.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .withdrawFromTreasuryAccount({ auctionHouse, amount });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const withdrawFromTreasuryAccountBuilder = (
  metaplex: Metaplex,
  params: WithdrawFromTreasuryAccountBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<WithdrawFromTreasuryAccountBuilderContext> => {
  // Data.
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    auctionHouse,
    amount,
    instructionKey,
    authority = metaplex.identity(),
  } = params;

  // Accounts.
  const auctionHouseTreasury = metaplex.auctionHouse().pdas().treasury({
    auctionHouse: auctionHouse.address,
    programs,
  });

  const accounts: WithdrawFromTreasuryInstructionAccounts = {
    treasuryMint: auctionHouse.treasuryMint.address,
    authority: auctionHouse.authorityAddress,
    treasuryWithdrawalDestination:
      auctionHouse.treasuryWithdrawalDestinationAddress,
    auctionHouseTreasury,
    auctionHouse: auctionHouse.address,
  };

  // Withdraw From Treasury Instruction.
  const withdrawFromTreasuryInstruction = createWithdrawFromTreasuryInstruction(
    accounts,
    { amount: amount.basisPoints }
  );

  // Signers.
  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Withdraw From Treasury.
      .add({
        instruction: withdrawFromTreasuryInstruction,
        signers: [authority],
        key: instructionKey ?? 'withdrawFromTreasuryAccount',
      })
  );
};
