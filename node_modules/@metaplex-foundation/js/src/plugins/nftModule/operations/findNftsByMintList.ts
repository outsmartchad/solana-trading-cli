import { PublicKey } from '@solana/web3.js';
import { toMetadataAccount } from '../accounts';
import { Metadata, Nft, Sft, toMetadata } from '../models';
import { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { GmaBuilder } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'FindNftsByMintListOperation' as const;

/**
 * Finds multiple NFTs and SFTs by a given list of mint addresses.
 *
 * ```ts
 * const nfts = await metaplex
 *   .nfts()
 *   .findAllByMintList({ mints: [...] };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftsByMintListOperation =
  useOperation<FindNftsByMintListOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftsByMintListOperation = Operation<
  typeof Key,
  FindNftsByMintListInput,
  FindNftsByMintListOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftsByMintListInput = {
  /** The addresses of all mint accounts we want to fetch. */
  mints: PublicKey[];
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftsByMintListOutput = (Metadata | Nft | Sft | null)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findNftsByMintListOperationHandler: OperationHandler<FindNftsByMintListOperation> =
  {
    handle: async (
      operation: FindNftsByMintListOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftsByMintListOutput> => {
      const { commitment, programs } = scope;
      const { mints } = operation.input;
      const nftPdas = metaplex.nfts().pdas();
      const metadataPdas = mints.map((mint) =>
        nftPdas.metadata({ mint, programs })
      );
      const metadataInfos = await GmaBuilder.make(metaplex, metadataPdas, {
        commitment,
      }).get();
      scope.throwIfCanceled();

      return metadataInfos.map<Metadata | null>((account) => {
        if (!account.exists) {
          return null;
        }

        try {
          return toMetadata(toMetadataAccount(account));
        } catch (error) {
          return null;
        }
      });
    },
  };
