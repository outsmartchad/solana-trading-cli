import {
  AuthorityScope,
  createCreateAuctionHouseInstruction,
  createDelegateAuctioneerInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { PublicKey } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { WRAPPED_SOL_MINT } from '../../tokenModule';
import { AUCTIONEER_ALL_SCOPES } from '../constants';
import { AuctionHouse } from '../models/AuctionHouse';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  isSigner,
  makeConfirmOptionsFinalizedOnMainnet,
  Operation,
  OperationHandler,
  OperationScope,
  Pda,
  Signer,
  toPublicKey,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';
import { ExpectedSignerError } from '@/errors';

// -----------------
// Operation
// -----------------

const Key = 'CreateAuctionHouseOperation' as const;

/**
 * Creates an Auction House.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .create({ sellerFeeBasisPoints: 500 }); // 5% fee
 * ```
 *
 * Provide `auctioneerAuthority` in case you want to enable Auctioneer.
 *
 * ```ts
 * await metaplex
 *   .auctionHouse()
 *   .create({ sellerFeeBasisPoints: 500, auctioneerAuthority: mx.identity().publicKey };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createAuctionHouseOperation =
  useOperation<CreateAuctionHouseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateAuctionHouseOperation = Operation<
  typeof Key,
  CreateAuctionHouseInput,
  CreateAuctionHouseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateAuctionHouseInput = {
  /** The share of the sale the auction house takes on all NFTs as a fee. */
  sellerFeeBasisPoints: number;

  /**
   * This allows the centralised authority to gate which NFT can be listed, bought and sold.
   *
   * @defaultValue `canChangeSalePrice`
   */
  requiresSignOff?: boolean;

  /**
   * Is intended to be used with the Auction House that requires sign off.
   * If the seller intentionally lists their NFT for a price of 0, a new FreeSellerTradeState is made.
   * The Auction House can then change the price to match a matching Bid that is greater than 0.
   *
   * @defaultValue `false`
   */
  canChangeSalePrice?: boolean;

  /**
   * The list of scopes available to the user in the Auctioneer.
   * For example Bid, List, Execute Sale.
   *
   * Only takes place when Auction House has Auctioneer enabled.
   *
   * @defaultValue `All scopes available`
   */
  auctioneerScopes?: AuthorityScope[];

  /**
   * The address of the Auction House treasury mint.
   * The token you accept as the purchase currency.
   *
   * @defaultValue `WRAPPED_SOL_MINT`
   */
  treasuryMint?: PublicKey;

  /**
   * The Authority wallet of the Auction House.
   * It is used to sign off listings and bids in case `requiresSignOff` is true.
   *
   * @defaultValue `metaplex.identity()`
   */
  authority?: PublicKey | Signer;

  /**
   * The account that is marked as a destination of withdrawal from the fee account.
   *
   * @defaultValue `metaplex.identity()`
   */
  feeWithdrawalDestination?: PublicKey;

  /**
   * The account that is marked as the owner of treasury withdrawal destination.
   *
   * @defaultValue `metaplex.identity()`
   */
  treasuryWithdrawalDestinationOwner?: PublicKey;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House is going to have Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateAuctionHouseOutput = {
  /** The address of the Auction House. */
  auctionHouseAddress: Pda;

  /** The account that used to pay the fees for selling and buying. */
  auctionHouseFeeAccountAddress: Pda;

  /** The account that receives the AuctionHouse fees. */
  auctionHouseTreasuryAddress: Pda;

  /** The account that is marked as a destination of withdrawal from the treasury account. */
  treasuryWithdrawalDestinationAddress: PublicKey;

  /** Auction House model. */
  auctionHouse: AuctionHouse;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createAuctionHouseOperationHandler: OperationHandler<CreateAuctionHouseOperation> =
  {
    async handle(
      operation: CreateAuctionHouseOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<CreateAuctionHouseOutput> {
      const builder = createAuctionHouseBuilder(
        metaplex,
        operation.input,
        scope
      );

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        metaplex,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(metaplex, confirmOptions);
      scope.throwIfCanceled();

      const auctionHouse = await metaplex.auctionHouse().findByAddress(
        {
          address: output.auctionHouseAddress,
          auctioneerAuthority: operation.input.auctioneerAuthority,
        },
        scope
      );

      return { ...output, auctionHouse };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateAuctionHouseBuilderParams = Omit<
  CreateAuctionHouseInput,
  'confirmOptions'
> & {
  instructionKey?: string;
  delegateAuctioneerInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateAuctionHouseBuilderContext = Omit<
  CreateAuctionHouseOutput,
  'response' | 'auctionHouse'
>;

/**
 * Creates an Auction House.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .createAuctionHouse({ sellerFeeBasisPoints: 500 }) // 5% fee
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createAuctionHouseBuilder = (
  metaplex: Metaplex,
  params: CreateAuctionHouseBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder<CreateAuctionHouseBuilderContext> => {
  // Data.
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const canChangeSalePrice = params.canChangeSalePrice ?? false;
  const requiresSignOff = params.requiresSignOff ?? canChangeSalePrice;

  // Accounts.
  const authority = params.authority ?? metaplex.identity();
  const treasuryMint = params.treasuryMint ?? WRAPPED_SOL_MINT;
  const treasuryWithdrawalDestinationOwner =
    params.treasuryWithdrawalDestinationOwner ?? metaplex.identity().publicKey;
  const feeWithdrawalDestination =
    params.feeWithdrawalDestination ?? metaplex.identity().publicKey;

  // Auctioneer delegate instruction needs to be signed by authority
  if (params.auctioneerAuthority && !isSigner(authority)) {
    throw new ExpectedSignerError(
      'authority',
      'PublicKey',
      'You are trying to delegate to an Auctioneer authority which ' +
        'requires the Auction House authority to sign a transaction. ' +
        'But you provided the Auction House authority as a Public Key.'
    );
  }

  // PDAs.
  const auctionHouse = metaplex
    .auctionHouse()
    .pdas()
    .auctionHouse({
      creator: toPublicKey(authority),
      treasuryMint,
      programs,
    });
  const auctionHouseFeeAccount = metaplex.auctionHouse().pdas().fee({
    auctionHouse,
    programs,
  });
  const auctionHouseTreasury = metaplex.auctionHouse().pdas().treasury({
    auctionHouse,
    programs,
  });
  const treasuryWithdrawalDestination = treasuryMint.equals(WRAPPED_SOL_MINT)
    ? treasuryWithdrawalDestinationOwner
    : metaplex.tokens().pdas().associatedTokenAccount({
        mint: treasuryMint,
        owner: treasuryWithdrawalDestinationOwner,
        programs,
      });

  return (
    TransactionBuilder.make<CreateAuctionHouseBuilderContext>()
      .setFeePayer(payer)
      .setContext({
        auctionHouseAddress: auctionHouse,
        auctionHouseFeeAccountAddress: auctionHouseFeeAccount,
        auctionHouseTreasuryAddress: auctionHouseTreasury,
        treasuryWithdrawalDestinationAddress: treasuryWithdrawalDestination,
      })

      // Create and initialize the Auction House account.
      .add({
        instruction: createCreateAuctionHouseInstruction(
          {
            treasuryMint,
            payer: payer.publicKey,
            authority: toPublicKey(authority),
            feeWithdrawalDestination,
            treasuryWithdrawalDestination,
            treasuryWithdrawalDestinationOwner,
            auctionHouse,
            auctionHouseFeeAccount,
            auctionHouseTreasury,
          },
          {
            bump: auctionHouse.bump,
            feePayerBump: auctionHouseFeeAccount.bump,
            treasuryBump: auctionHouseTreasury.bump,
            sellerFeeBasisPoints: params.sellerFeeBasisPoints,
            requiresSignOff,
            canChangeSalePrice,
          }
        ),
        signers: [payer],
        key: params.instructionKey ?? 'createAuctionHouse',
      })

      // Delegate to the Auctioneer authority when provided.
      .when(Boolean(params.auctioneerAuthority), (builder) => {
        const auctioneerAuthority = params.auctioneerAuthority as PublicKey;
        return builder.add({
          instruction: createDelegateAuctioneerInstruction(
            {
              auctionHouse,
              authority: toPublicKey(authority as Signer),
              auctioneerAuthority,
              ahAuctioneerPda: metaplex.auctionHouse().pdas().auctioneer({
                auctionHouse,
                auctioneerAuthority,
                programs,
              }),
            },
            { scopes: params.auctioneerScopes ?? AUCTIONEER_ALL_SCOPES }
          ),
          signers: [authority as Signer],
          key: params.delegateAuctioneerInstructionKey ?? 'delegateAuctioneer',
        });
      })
  );
};
