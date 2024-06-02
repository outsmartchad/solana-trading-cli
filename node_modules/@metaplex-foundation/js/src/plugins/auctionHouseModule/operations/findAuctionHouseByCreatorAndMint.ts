import type { PublicKey } from '@solana/web3.js';
import { AuctionHouse } from '../models/AuctionHouse';
import type { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'FindAuctionHouseByCreatorAndMintOperation' as const;

/**
 * Finds an Auction House by its creator and treasury mint.
 *
 * ```ts
 * const nft = await metaplex
 *   .auctionHouse()
 *   .findByCreatorAndMint({ creator, treasuryMint };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findAuctionHouseByCreatorAndMintOperation =
  useOperation<FindAuctionHouseByCreatorAndMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindAuctionHouseByCreatorAndMintOperation = Operation<
  typeof Key,
  FindAuctionHouseByCreatorAndMintInput,
  AuctionHouse
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindAuctionHouseByCreatorAndMintInput = {
  /** The address of the Auction House creator. */
  creator: PublicKey;

  /**
   * The address of the Auction House treasury mint.
   * By default Auction House uses the `WRAPPED_SOL_MINT` treasury mint.
   */
  treasuryMint: PublicKey;

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
export const findAuctionHouseByCreatorAndMintOperationHandler: OperationHandler<FindAuctionHouseByCreatorAndMintOperation> =
  {
    handle: async (
      operation: FindAuctionHouseByCreatorAndMintOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { creator, treasuryMint } = operation.input;

      return metaplex.auctionHouse().findByAddress(
        {
          address: metaplex.auctionHouse().pdas().auctionHouse({
            creator,
            treasuryMint,
            programs: scope.programs,
          }),
          ...operation.input,
        },
        scope
      );
    },
  };
