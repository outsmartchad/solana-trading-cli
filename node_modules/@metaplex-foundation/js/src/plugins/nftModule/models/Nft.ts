import type { PublicKey } from '@solana/web3.js';
import type { Mint, Token } from '../../tokenModule';
import type { Metadata } from './Metadata';
import type { NftEdition } from './NftEdition';
import { isSftWithToken, SftWithToken, toSft, toSftWithToken } from './Sft';
import { assert } from '@/utils';
import type { Pda } from '@/types';

/**
 * This model captures all the relevant information about an NFT
 * in the Solana blockchain. That includes the NFT's metadata account,
 * its mint account, its edition account and its off-chain JSON metadata.
 *
 * @group Models
 */
export type Nft = Omit<Metadata, 'model' | 'address' | 'mintAddress'> & {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'nft';

  /** The mint address of the NFT. */
  readonly address: PublicKey;

  /** The metadata address of the NFT. */
  readonly metadataAddress: Pda;

  /** The mint account of the NFT. */
  readonly mint: Mint;

  /**
   * Defines whether the NFT is an original edition or a
   * printed edition and provides additional information accordingly.
   */
  readonly edition: NftEdition;
};

/** @group Model Helpers */
export const isNft = (value: any): value is Nft =>
  typeof value === 'object' && value.model === 'nft';

/** @group Model Helpers */
export function assertNft(value: any): asserts value is Nft {
  assert(isNft(value), `Expected Nft model`);
}

/** @group Model Helpers */
export const toNft = (
  metadata: Metadata,
  mint: Mint,
  edition: NftEdition
): Nft => ({
  ...toSft(metadata, mint),
  model: 'nft',
  edition,
});

/** @group Models */
export type NftWithToken = Nft & { token: Token };

/** @group Model Helpers */
export const isNftWithToken = (value: any): value is NftWithToken =>
  isNft(value) && 'token' in value;

/** @group Model Helpers */
export function assertNftWithToken(value: any): asserts value is NftWithToken {
  assert(isNftWithToken(value), `Expected Nft model with token`);
}

/** @group Model Helpers */
export function assertNftOrSftWithToken(
  value: any
): asserts value is NftWithToken | SftWithToken {
  assert(
    isNftWithToken(value) || isSftWithToken(value),
    `Expected Nft or Sft model with token`
  );
}

/** @group Model Helpers */
export const toNftWithToken = (
  metadata: Metadata,
  mint: Mint,
  edition: NftEdition,
  token: Token
): NftWithToken => ({
  ...toSftWithToken(metadata, mint, token),
  model: 'nft',
  edition,
});
