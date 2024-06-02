import type { PublicKey } from '@solana/web3.js';
import { toTokenAccount } from '../accounts';
import { Token, toToken } from '../models/Token';
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

const Key = 'FindTokenByAddressOperation' as const;

/**
 * Finds a token account by its address.
 *
 * ```ts
 * const token = await metaplex.tokens().findTokenByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findTokenByAddressOperation =
  useOperation<FindTokenByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindTokenByAddressOperation = Operation<
  typeof Key,
  FindTokenByAddressInput,
  Token
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindTokenByAddressInput = {
  /** The address of the token account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findTokenByAddressOperationHandler: OperationHandler<FindTokenByAddressOperation> =
  {
    handle: async (
      operation: FindTokenByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<Token> => {
      const { commitment } = scope;
      const { address } = operation.input;

      const account = toTokenAccount(
        await metaplex.rpc().getAccount(address, commitment)
      );

      return toToken(account);
    },
  };
