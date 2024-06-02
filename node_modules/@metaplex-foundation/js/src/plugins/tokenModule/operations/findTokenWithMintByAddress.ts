import type { PublicKey } from '@solana/web3.js';
import { toMintAccount, toTokenAccount } from '../accounts';
import { toMint } from '../models/Mint';
import { TokenWithMint, toTokenWithMint } from '../models/Token';
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

const Key = 'FindTokenWithMintByAddressOperation' as const;

/**
 * Finds a token account and its associated mint account
 * by providing the token address.
 *
 * ```ts
 * const tokenWithMint = await metaplex.tokens().findTokenWithMintByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findTokenWithMintByAddressOperation =
  useOperation<FindTokenWithMintByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindTokenWithMintByAddressOperation = Operation<
  typeof Key,
  FindTokenWithMintByAddressInput,
  TokenWithMint
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindTokenWithMintByAddressInput = {
  /** The address of the token account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findTokenWithMintByAddressOperationHandler: OperationHandler<FindTokenWithMintByAddressOperation> =
  {
    handle: async (
      operation: FindTokenWithMintByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<TokenWithMint> => {
      const { commitment } = scope;
      const { address } = operation.input;

      const tokenAccount = toTokenAccount(
        await metaplex.rpc().getAccount(address, commitment)
      );

      const mintAccount = toMintAccount(
        await metaplex.rpc().getAccount(tokenAccount.data.mint, commitment)
      );

      return toTokenWithMint(tokenAccount, toMint(mintAccount));
    },
  };
