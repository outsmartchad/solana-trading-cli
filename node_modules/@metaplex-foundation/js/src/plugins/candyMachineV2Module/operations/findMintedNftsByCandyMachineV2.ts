import { PublicKey } from '@solana/web3.js';
import { Metadata, Nft } from '../../nftModule';
import { findCandyMachineV2CreatorPda } from '../pdas';
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

const Key = 'FindMintedNftsByCandyMachineV2Operation' as const;

/**
 * Find all minted NFTs from a given Candy Machine address.
 *
 * ```ts
 * const nfts = await metaplex
 *   .candyMachinesV2()
 *   .findMintedNfts({ candyMachine };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findMintedNftsByCandyMachineV2Operation =
  useOperation<FindMintedNftsByCandyMachineV2Operation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindMintedNftsByCandyMachineV2Operation = Operation<
  typeof Key,
  FindMintedNftsByCandyMachineV2Input,
  FindMintedNftsByCandyMachineV2Output
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindMintedNftsByCandyMachineV2Input = {
  /** The Candy Machine address. */
  candyMachine: PublicKey;

  /**
   * The Candy Machine version
   *
   * @defaultValue `2`
   */
  version?: 1 | 2;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindMintedNftsByCandyMachineV2Output = (Metadata | Nft)[];

/**
 * @group Operations
 * @category Handlers
 */
export const findMintedNftsByCandyMachineV2OperationHandler: OperationHandler<FindMintedNftsByCandyMachineV2Operation> =
  {
    handle: async (
      operation: FindMintedNftsByCandyMachineV2Operation,
      metaplex: Metaplex,
      scope: OperationScope
    ) => {
      const { candyMachine, version = 2 } = operation.input;
      const firstCreator =
        version === 2
          ? findCandyMachineV2CreatorPda(candyMachine)
          : candyMachine;

      const mintedNfts = await metaplex
        .nfts()
        .findAllByCreator({ creator: firstCreator, position: 1 }, scope);

      return mintedNfts as (Nft | Metadata)[];
    },
  };
