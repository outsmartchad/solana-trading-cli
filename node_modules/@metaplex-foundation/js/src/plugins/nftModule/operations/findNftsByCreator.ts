import { PublicKey } from '@solana/web3.js';
import { toMetadataAccount } from '../accounts';
import { MetadataV1GpaBuilder } from '../gpaBuilders';
import { Metadata, Nft, Sft, toMetadata } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindNftsByCreatorOperation' as const;

/**
 * Finds multiple NFTs and SFTs by their creator at a given position.
 *
 * ```ts
 * // Find all by first creator.
 * const nfts = await metaplex
 *   .nfts()
 *   .findAllByCreator({ creator };
 *
 * // Find all by second creator.
 * const nfts = await metaplex
 *   .nfts()
 *   .findAllByCreator({ creator, position: 2 };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByCreatorOperation =
  useOperation<FindNftsByCreatorOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByCreatorOperation = Operation<
  typeof Key,
  FindNftsByCreatorInput,
  FindNftsByCreatorOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByCreatorInput = {
  /** The address of the creator. */
  creator: PublicKey;

  /**
   * The position in which the provided creator should be located at.
   * E.g. `1` for searching the first creator, `2` for searching the
   * second creator, etc.
   *
   * @defaultValue `1`
   */
  position?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByCreatorOutput = (Metadata | Nft | Sft)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByCreatorOperationHandler: OperationHandler<FindNftsByCreatorOperation> =
  {
    handle: async (
      operation: FindNftsByCreatorOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftsByCreatorOutput> => {
      const { programs } = scope;
      const { creator, position = 1 } = operation.input;

      const gpaBuilder = new MetadataV1GpaBuilder(
        metaplex,
        metaplex.programs().getTokenMetadata(programs).address
      );

      const nfts = await gpaBuilder.whereCreator(position, creator).get();
      scope.throwIfCanceled();

      return nfts
        .map<Metadata | null>((account) => {
          if (account == null) {
            return null;
          }

          try {
            return toMetadata(toMetadataAccount(account));
          } catch (error) {
            return null;
          }
        })
        .filter((nft): nft is Metadata => nft !== null);
    },
  };
