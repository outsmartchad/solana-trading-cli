import type { PublicKey } from '@solana/web3.js';
import { toAuctioneerAccount, toAuctionHouseAccount } from '../accounts';
import { AuctioneerAuthorityRequiredError } from '../errors';
import { AuctionHouse, toAuctionHouse } from '../models/AuctionHouse';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import type { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindAuctionHouseByAddressOperation' as const;

/**
 * Finds an Auction House by its address.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findByAddress({ address };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findAuctionHouseByAddressOperation =
  useOperation<FindAuctionHouseByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindAuctionHouseByAddressOperation = Operation<
  typeof Key,
  FindAuctionHouseByAddressInput,
  AuctionHouse
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindAuctionHouseByAddressInput = {
  /** The address of the Auction House. */
  address: PublicKey;

  /**
   * The Auctioneer authority key.
   * It is required when Auction House has Auctioneer enabled.
   *
   * @defaultValue No default value.
   */
  auctioneerAuthority?: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findAuctionHouseByAddressOperationHandler: OperationHandler<FindAuctionHouseByAddressOperation> =
  {
    handle: async (
      operation: FindAuctionHouseByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { programs, commitment } = scope;
      const { address, auctioneerAuthority } = operation.input;
      const auctioneerPda = auctioneerAuthority
        ? metaplex.auctionHouse().pdas().auctioneer({
            auctionHouse: address,
            auctioneerAuthority,
            programs,
          })
        : undefined;
      const accountsToFetch = [address, auctioneerPda].filter(
        (account): account is PublicKey => !!account
      );

      const accounts = await metaplex
        .rpc()
        .getMultipleAccounts(accountsToFetch, commitment);
      scope.throwIfCanceled();

      const auctionHouseAccount = toAuctionHouseAccount(accounts[0]);
      const mintModel = await metaplex
        .tokens()
        .findMintByAddress(
          { address: auctionHouseAccount.data.treasuryMint },
          scope
        );
      scope.throwIfCanceled();

      if (!auctionHouseAccount.data.hasAuctioneer) {
        return toAuctionHouse(auctionHouseAccount, mintModel);
      }

      if (!accounts[1] || !accounts[1].exists) {
        throw new AuctioneerAuthorityRequiredError();
      }

      const auctioneerAccount = toAuctioneerAccount(accounts[1]);
      return toAuctionHouse(auctionHouseAccount, mintModel, auctioneerAccount);
    },
  };
