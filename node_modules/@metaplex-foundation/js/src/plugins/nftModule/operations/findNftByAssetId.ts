import { PublicKey } from '@solana/web3.js';
import { Nft, toNft } from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
  ReadApiAsset,
} from '@/types';
import { Metaplex } from '@/Metaplex';
import {
  toMetadataFromReadApiAsset,
  toMintFromReadApiAsset,
  toNftEditionFromReadApiAsset,
} from '@/utils/readApiConnection';

// -----------------
// Operation
// -----------------

const Key = 'FindNftByAssetIdOperation' as const;

/**
 * Finds an NFT or an SFT by its mint address.
 *
 * ```ts
 * const nft = await metaplex
 *   .nfts()
 *   .findByAssetId({ assetId };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftByAssetIdOperation =
  useOperation<FindNftByAssetIdOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftByAssetIdOperation = Operation<
  typeof Key,
  FindNftByAssetIdInput,
  FindNftByAssetIdOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftByAssetIdInput = {
  /** The id of an asset. */
  assetId: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftByAssetIdOutput = Nft;

/**
 * @group Operations
 * @category Handlers
 */
export const findNftByAssetIdOperationHandler: OperationHandler<FindNftByAssetIdOperation> =
  {
    handle: async (
      operation: FindNftByAssetIdOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftByAssetIdOutput> => {
      const { assetId } = operation.input;

      // Retrieve asset from RPC
      // Massage into the NFT model

      const asset = await metaplex.rpc().getAsset(assetId);
      scope.throwIfCanceled();

      const metadata = toMetadataFromReadApiAsset(asset as ReadApiAsset);
      const mint = toMintFromReadApiAsset(asset as ReadApiAsset);
      const nftEdition = toNftEditionFromReadApiAsset(asset as ReadApiAsset);

      return toNft(metadata, mint, nftEdition);
    },
  };
