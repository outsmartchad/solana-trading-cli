import { assertNftOrSftWithToken } from '../../nftModule';
import { LazyPurchase, Purchase } from '../models/Purchase';
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

const Key = 'LoadPurchaseOperation' as const;

/**
 * Transforms a `LazyPurchase` model into a `Purchase` model.
 *
 * ```ts
 * const purchase = await metaplex
 *   .auctionHouse()
 *   .loadPurchase({ lazyPurchase };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const loadPurchaseOperation = useOperation<LoadPurchaseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LoadPurchaseOperation = Operation<
  typeof Key,
  LoadPurchaseInput,
  Purchase
>;

/**
 * @group Operations
 * @category Inputs
 */
export type LoadPurchaseInput = {
  /** The `LazyPurchase` model to transform into the `Purchase`.  */
  lazyPurchase: LazyPurchase;

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
export const loadPurchaseOperationHandler: OperationHandler<LoadPurchaseOperation> =
  {
    handle: async (
      operation: LoadPurchaseOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { lazyPurchase, loadJsonMetadata = true } = operation.input;
      const asset = await metaplex.nfts().findByMetadata(
        {
          metadata: lazyPurchase.metadataAddress,
          tokenOwner: lazyPurchase.buyerAddress,
          loadJsonMetadata,
        },
        scope
      );
      assertNftOrSftWithToken(asset);

      return {
        ...lazyPurchase,
        lazy: false,
        isPublic: false,
        asset,
        tokens: amount(lazyPurchase.tokens, asset.mint.currency),
      };
    },
  };
