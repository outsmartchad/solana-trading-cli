import { assertNftOrSftWithToken } from '../../nftModule';
import { LazyListing, Listing } from '../models/Listing';
import type { Metaplex } from '@/Metaplex';
import {
  amount,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';

// -----------------
// Operation
// -----------------

const Key = 'LoadListingOperation' as const;

/**
 * Transforms a `LazyListing` model into a `Listing` model.
 *
 * ```ts
 * const listing = await metaplex
 *   .auctionHouse()
 *   .loadListing({ lazyListing };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const loadListingOperation = useOperation<LoadListingOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LoadListingOperation = Operation<
  typeof Key,
  LoadListingInput,
  Listing
>;

/**
 * @group Operations
 * @category Inputs
 */
export type LoadListingInput = {
  /** The `LazyListing` model to transform into the `Listing`.  */
  lazyListing: LazyListing;

  /**
   * Whether or not we should fetch the JSON Metadata for the NFT or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Handlers
 */
export const loadListingOperationHandler: OperationHandler<LoadListingOperation> =
  {
    handle: async (
      operation: LoadListingOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { lazyListing, loadJsonMetadata = true } = operation.input;
      const asset = await metaplex.nfts().findByMetadata(
        {
          metadata: lazyListing.metadataAddress,
          tokenOwner: lazyListing.sellerAddress,
          loadJsonMetadata,
        },
        scope
      );
      assertNftOrSftWithToken(asset);

      return {
        ...lazyListing,
        model: 'listing',
        lazy: false,
        asset,
        tokens: amount(lazyListing.tokens, asset.mint.currency),
      };
    },
  };
