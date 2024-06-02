import {
  AuthorityScope,
  createDelegateAuctioneerInstruction,
  createUpdateAuctioneerInstruction,
  createUpdateAuctionHouseInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { PublicKey } from '@solana/web3.js';
import isEqual from 'lodash.isequal';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { AUCTIONEER_ALL_SCOPES } from '../constants';
import { TreasuryDestinationOwnerRequiredError } from '../errors';
import {
  assertAuctioneerAuctionHouse,
  AuctionHouse,
} from '../models/AuctionHouse';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';
import { NoInstructionsToSendError } from '@/errors';

// -----------------
// Operation
// -----------------

const Key = 'UpdateAuctionHouseOperation' as const;

/**
 * Updates an existing Auction House.
 *
 * ```ts
 * await metaplex
 *   .autionHouse()
 *   .update({
 *     auctionHouse,
 *     canChangeSalePrice: true, // Updates the canChangeSalePrice only.
 *   };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const updateAuctionHouseOperation =
  useOperation<UpdateAuctionHouseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type UpdateAuctionHouseOperation = Operation<
  typeof Key,
  UpdateAuctionHouseInput,
  UpdateAuctionHouseOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type UpdateAuctionHouseInput = {
  /**
   * The Auction House model.
   * We need the full model in order to compare the current data with
   * the provided data to update. For instance, if you only want to
   * update the `feeWithdrawalDestination`, we need to send an instruction that updates
   * the data whilst keeping all other properties the same.
   */
  auctionHouse: AuctionHouse;

  /**
   * The Auction House authority.
   *
   * @defaultValue `auctionHouse.authority`
   */
  authority?: Signer;

  /**
   * The share of the sale the auction house takes on all NFTs as a fee.
   *
   * @defaultValue `auctionHouse.requiresSignOff`
   */
  sellerFeeBasisPoints?: number | null;

  /**
   * This allows the centralised authority to gate which NFT can be listed, bought and sold.
   *
   * @defaultValue `auctionHouse.requiresSignOff`
   */
  requiresSignOff?: boolean | null;

  /**
   * Is intended to be used with the Auction House that requires sign off.
   * If the seller intentionally lists their NFT for a price of 0, a new FreeSellerTradeState is made.
   * The Auction House can then change the price to match a matching Bid that is greater than 0.
   *
   * @defaultValue `auctionHouse.canChangeSalePrice`
   */
  canChangeSalePrice?: boolean | null;

  /**
   * The new Auction House authority if you want to change it.
   *
   * @defaultValue `auctionHouse.authority`
   */
  newAuthority?: PublicKey;

  /**
   * The account that is marked as a destination of withdrawal from the fee account.
   *
   * @defaultValue `auctionHouse.feeWithdrawalDestination`
   */
  feeWithdrawalDestination?: PublicKey;

  /**
   * The account that is marked as the owner of treasury withdrawal destination.
   *
   * @defaultValue `auctionHouse.treasuryWithdrawalDestinationAddress`
   */
  treasuryWithdrawalDestinationOwner?: PublicKey;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House is going to have Auctioneer enabled.
   *
   * Provide it if you want to delegate Auctioneer on the Auction House that doesn't have Auctioneer enabled.
   *
   * @defaultValue `auctionHouse.auctioneerAuthority`
   */
  auctioneerAuthority?: PublicKey;

  /**
   * The list of scopes available to the user in the Auction House.
   * For example Bid, List, Execute Sale.
   *
   * Only takes place when Auction House has Auctioneer enabled.
   *
   * @defaultValue `auctionHouse.scopes`
   */
  auctioneerScopes?: AuthorityScope[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type UpdateAuctionHouseOutput = {
  /** The updated Auction House model. */
  auctionHouse: AuctionHouse;

  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const updateAuctionHouseOperationHandler: OperationHandler<UpdateAuctionHouseOperation> =
  {
    async handle(
      operation: UpdateAuctionHouseOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) {
      const { auctionHouse, auctioneerAuthority } = operation.input;
      const builder = updateAuctionHouseBuilder(
        metaplex,
        operation.input,
        scope
      );

      if (builder.isEmpty()) {
        throw new NoInstructionsToSendError(Key);
      }

      const output = await builder.sendAndConfirm(
        metaplex,
        scope.confirmOptions
      );

      const currentAuctioneerAuthority = auctionHouse.hasAuctioneer
        ? auctionHouse.auctioneer.authority
        : undefined;
      const updatedAuctionHouse = await metaplex.auctionHouse().findByAddress(
        {
          address: auctionHouse.address,
          auctioneerAuthority:
            auctioneerAuthority ?? currentAuctioneerAuthority,
        },
        scope
      );

      return { ...output, auctionHouse: updatedAuctionHouse };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type UpdateAuctionHouseBuilderParams = Omit<
  UpdateAuctionHouseInput,
  'confirmOptions'
> & {
  instructionKey?: string;
  delegateAuctioneerInstructionKey?: string;
  updateAuctioneerInstructionKey?: string;
};

/**
 * Updates an existing Auction House.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .auctionHouse()
 *   .builders()
 *   .updateAuctionHouse({ auctionHouse, canChangeSalePrice: true })
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const updateAuctionHouseBuilder = (
  metaplex: Metaplex,
  params: UpdateAuctionHouseBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const authority = params.authority ?? metaplex.identity();
  const { auctionHouse } = params;

  let treasuryWithdrawalDestinationOwner: PublicKey;
  let treasuryWithdrawalDestination: PublicKey;
  if (auctionHouse.isNative) {
    treasuryWithdrawalDestinationOwner =
      params.treasuryWithdrawalDestinationOwner ??
      auctionHouse.treasuryWithdrawalDestinationAddress;
    treasuryWithdrawalDestination = treasuryWithdrawalDestinationOwner;
  } else if (params.treasuryWithdrawalDestinationOwner) {
    treasuryWithdrawalDestinationOwner =
      params.treasuryWithdrawalDestinationOwner;
    treasuryWithdrawalDestination = metaplex
      .tokens()
      .pdas()
      .associatedTokenAccount({
        mint: auctionHouse.treasuryMint.address,
        owner: treasuryWithdrawalDestinationOwner,
        programs,
      });
  } else {
    throw new TreasuryDestinationOwnerRequiredError();
  }

  const originalData = {
    authority: auctionHouse.authorityAddress,
    feeWithdrawalDestination: auctionHouse.feeWithdrawalDestinationAddress,
    treasuryWithdrawalDestination:
      auctionHouse.treasuryWithdrawalDestinationAddress,
    sellerFeeBasisPoints: auctionHouse.sellerFeeBasisPoints,
    requiresSignOff: auctionHouse.requiresSignOff,
    canChangeSalePrice: auctionHouse.canChangeSalePrice,
  };
  const updatedData = {
    authority: params.newAuthority ?? originalData.authority,
    feeWithdrawalDestination:
      params.feeWithdrawalDestination ?? originalData.feeWithdrawalDestination,
    treasuryWithdrawalDestination,
    sellerFeeBasisPoints:
      params.sellerFeeBasisPoints ?? originalData.sellerFeeBasisPoints,
    requiresSignOff: params.requiresSignOff ?? originalData.requiresSignOff,
    canChangeSalePrice:
      params.canChangeSalePrice ?? originalData.canChangeSalePrice,
  };

  const shouldSendUpdateInstruction = !isEqual(originalData, updatedData);
  const shouldAddAuctioneerAuthority =
    !auctionHouse.hasAuctioneer && !!params.auctioneerAuthority;
  const shouldUpdateAuctioneerAuthority =
    auctionHouse.hasAuctioneer &&
    !!params.auctioneerAuthority &&
    !params.auctioneerAuthority.equals(auctionHouse.auctioneer.authority);
  const shouldUpdateAuctioneerScopes =
    auctionHouse.hasAuctioneer &&
    !!params.auctioneerScopes &&
    !isEqual(params.auctioneerScopes.sort(), auctionHouse.scopes.sort());
  const shouldDelegateAuctioneer = shouldAddAuctioneerAuthority;
  const shouldUpdateAuctioneer =
    shouldUpdateAuctioneerAuthority || shouldUpdateAuctioneerScopes;

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the Auction House data.
      .when(shouldSendUpdateInstruction, (builder) =>
        builder.add({
          instruction: createUpdateAuctionHouseInstruction(
            {
              treasuryMint: auctionHouse.treasuryMint.address,
              payer: payer.publicKey,
              authority: authority.publicKey,
              newAuthority: updatedData.authority,
              feeWithdrawalDestination: updatedData.feeWithdrawalDestination,
              treasuryWithdrawalDestination,
              treasuryWithdrawalDestinationOwner,
              auctionHouse: auctionHouse.address,
            },
            {
              sellerFeeBasisPoints: params.sellerFeeBasisPoints ?? null,
              requiresSignOff: params.requiresSignOff ?? null,
              canChangeSalePrice: params.canChangeSalePrice ?? null,
            }
          ),
          signers: [payer, authority],
          key: params.instructionKey ?? 'updateAuctionHouse',
        })
      )

      // Attach a new Auctioneer instance to the Auction House.
      .when(shouldDelegateAuctioneer, (builder) => {
        const auctioneerAuthority = params.auctioneerAuthority as PublicKey;
        const defaultScopes = auctionHouse.hasAuctioneer
          ? auctionHouse.scopes
          : AUCTIONEER_ALL_SCOPES;
        return builder.add({
          instruction: createDelegateAuctioneerInstruction(
            {
              auctionHouse: auctionHouse.address,
              authority: authority.publicKey,
              auctioneerAuthority,
              ahAuctioneerPda: metaplex.auctionHouse().pdas().auctioneer({
                auctionHouse: auctionHouse.address,
                auctioneerAuthority,
                programs,
              }),
            },
            { scopes: params.auctioneerScopes ?? defaultScopes }
          ),
          signers: [authority],
          key: params.delegateAuctioneerInstructionKey ?? 'delegateAuctioneer',
        });
      })

      // Update the Auctioneer authority and/or scopes of the Auction House.
      .when(shouldUpdateAuctioneer, (builder) => {
        assertAuctioneerAuctionHouse(auctionHouse);
        const auctioneerAuthority =
          params.auctioneerAuthority ?? auctionHouse.auctioneer.authority;
        return builder.add({
          instruction: createUpdateAuctioneerInstruction(
            {
              auctionHouse: auctionHouse.address,
              authority: authority.publicKey,
              auctioneerAuthority,
              ahAuctioneerPda: metaplex.auctionHouse().pdas().auctioneer({
                auctionHouse: auctionHouse.address,
                auctioneerAuthority,
                programs,
              }),
            },
            {
              scopes: params.auctioneerScopes ?? auctionHouse.scopes,
            }
          ),
          signers: [authority],
          key: params.updateAuctioneerInstructionKey ?? 'updateAuctioneer',
        });
      })
  );
};
