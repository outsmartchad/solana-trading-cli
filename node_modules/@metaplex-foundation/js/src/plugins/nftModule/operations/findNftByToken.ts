import { PublicKey } from '@solana/web3.js';
import { toTokenAccount } from '../../tokenModule';
import { NftWithToken, SftWithToken } from '../models';
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

const Key = 'FindNftByTokenOperation' as const;

/**
 * Finds an NFT or an SFT by its token address.
 *
 * ```ts
 * const nft = await metaplex
 *   .nfts()
 *   .findByToken({ token };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftByTokenOperation =
  useOperation<FindNftByTokenOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftByTokenOperation = Operation<
  typeof Key,
  FindNftByTokenInput,
  FindNftByTokenOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftByTokenInput = {
  /** The address of the token account. */
  token: PublicKey;

  /**
   * Whether or not we should fetch the JSON Metadata for the NFT or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftByTokenOutput = NftWithToken | SftWithToken;

/**
 * @group Operations
 * @category Handlers
 */
export const findNftByTokenOperationHandler: OperationHandler<FindNftByTokenOperation> =
  {
    handle: async (
      operation: FindNftByTokenOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftByTokenOutput> => {
      const token = toTokenAccount(
        await metaplex.rpc().getAccount(operation.input.token)
      );
      scope.throwIfCanceled();

      const asset = await metaplex.nfts().findByMint(
        {
          ...operation.input,
          mintAddress: token.data.mint,
          tokenAddress: operation.input.token,
        },
        scope
      );

      return asset as FindNftByTokenOutput;
    },
  };
