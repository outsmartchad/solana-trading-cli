import type { PublicKey } from '@solana/web3.js';
import { toMintAccount } from '../accounts';
import { Mint, toMint } from '../models/Mint';
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

const Key = 'FindMintByAddressOperation' as const;

/**
 * Finds a mint account by its address.
 *
 * ```ts
 * const mint = await metaplex.tokens().findMintByAddress({ address });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findMintByAddressOperation =
  useOperation<FindMintByAddressOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindMintByAddressOperation = Operation<
  typeof Key,
  FindMintByAddressInput,
  Mint
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindMintByAddressInput = {
  /** The address of the mint account. */
  address: PublicKey;
};

/**
 * @group Operations
 * @category Handlers
 */
export const findMintByAddressOperationHandler: OperationHandler<FindMintByAddressOperation> =
  {
    handle: async (
      operation: FindMintByAddressOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { commitment } = scope;
      const { address } = operation.input;

      const account = toMintAccount(
        await metaplex.rpc().getAccount(address, commitment)
      );

      return toMint(account);
    },
  };
