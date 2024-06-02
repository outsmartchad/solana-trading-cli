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

const Key = 'FindNftsByUpdateAuthorityOperation' as const;

/**
 * Finds multiple NFTs and SFTs by a given update authority.
 *
 * ```ts
 * const nfts = await metaplex
 *   .nfts()
 *   .findAllByUpdateAuthority({ updateAuthority };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByUpdateAuthorityOperation =
  useOperation<FindNftsByUpdateAuthorityOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByUpdateAuthorityOperation = Operation<
  typeof Key,
  FindNftsByUpdateAuthorityInput,
  FindNftsByUpdateAuthorityOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByUpdateAuthorityInput = {
  /** The address of the update authority. */
  updateAuthority: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByUpdateAuthorityOutput = (Metadata | Nft | Sft)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByUpdateAuthorityOperationHandler: OperationHandler<FindNftsByUpdateAuthorityOperation> =
  {
    handle: async (
      operation: FindNftsByUpdateAuthorityOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftsByUpdateAuthorityOutput> => {
      const { updateAuthority } = operation.input;

      const gpaBuilder = new MetadataV1GpaBuilder(
        metaplex,
        metaplex.programs().getTokenMetadata(scope.programs).address
      );

      const nfts = await gpaBuilder.whereUpdateAuthority(updateAuthority).get();
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
