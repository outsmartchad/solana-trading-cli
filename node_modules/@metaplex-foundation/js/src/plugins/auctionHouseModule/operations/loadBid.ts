import { assertNftOrSftWithToken } from '../../nftModule';
import { Bid, LazyBid } from '../models/Bid';
import type { Metaplex } from '@/Metaplex';
import {
  amount,
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { assert } from '@/utils';

// -----------------
// Operation
// -----------------

const Key = 'LoadBidOperation' as const;

/**
 * Transforms a `LazyBid` model into a `Bid` model.
 *
 * ```ts
 * const bid = await metaplex
 *   .auctionHouse()
 *   .loadBid({ lazyBid };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const loadBidOperation = useOperation<LoadBidOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LoadBidOperation = Operation<typeof Key, LoadBidInput, Bid>;

/**
 * @group Operations
 * @category Inputs
 */
export type LoadBidInput = {
  /** The `LazyBid` model to transform into the `Bid`.  */
  lazyBid: LazyBid;

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
export const loadBidOperationHandler: OperationHandler<LoadBidOperation> = {
  handle: async (
    operation: LoadBidOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ) => {
    const { lazyBid, loadJsonMetadata = true } = operation.input;

    const bid: Omit<Bid, 'asset' | 'tokens'> = {
      ...lazyBid,
      model: 'bid',
      lazy: false,
    };

    if (lazyBid.tokenAddress) {
      const asset = await metaplex
        .nfts()
        .findByToken({ token: lazyBid.tokenAddress, loadJsonMetadata }, scope);
      scope.throwIfCanceled();

      assertNftOrSftWithToken(asset);
      assert(
        asset.metadataAddress.equals(lazyBid.metadataAddress),
        `Asset metadata address must be ${lazyBid.metadataAddress}`
      );

      return {
        ...bid,
        isPublic: false,
        asset,
        tokens: amount(lazyBid.tokens, asset.mint.currency),
      };
    }
    const asset = await metaplex
      .nfts()
      .findByMetadata(
        { metadata: lazyBid.metadataAddress, loadJsonMetadata },
        scope
      );
    scope.throwIfCanceled();

    return {
      ...bid,
      isPublic: true,
      asset,
      tokens: amount(lazyBid.tokens, asset.mint.currency),
    };
  },
};
