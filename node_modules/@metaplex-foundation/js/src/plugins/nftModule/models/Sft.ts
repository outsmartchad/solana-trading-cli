import type { PublicKey } from '@solana/web3.js';
import type { Mint, Token } from '../../tokenModule';
import type { Metadata } from './Metadata';
import { assert } from '@/utils';
import { amount, Pda } from '@/types';

/** @group Models */
export type Sft = Omit<Metadata, 'model' | 'address' | 'mintAddress'> &
  Readonly<{
    model: 'sft';

    /** The mint address of the SFT. */
    address: PublicKey;

    /** The metadata address of the SFT. */
    metadataAddress: Pda;

    /** The mint account of the SFT. */
    mint: Mint;
  }>;

/** @group Model Helpers */
export const isSft = (value: any): value is Sft =>
  typeof value === 'object' && value.model === 'sft';

/** @group Model Helpers */
export function assertSft(value: any): asserts value is Sft {
  assert(isSft(value), `Expected Sft model`);
}

/** @group Model Helpers */
export const toSft = (metadata: Metadata, mint: Mint): Sft => {
  const { address, mintAddress, ...shared } = metadata;
  assert(
    mintAddress.equals(mint.address),
    'The provided mint does not match the mint address in the metadata'
  );

  const currency = {
    ...mint.currency,
    symbol: metadata.symbol || 'Token',
  };

  return {
    ...shared,
    model: 'sft',
    address: mintAddress,
    metadataAddress: address,
    mint: {
      ...mint,
      currency,
      supply: amount(mint.supply.basisPoints, currency),
    },
  };
};

/** @group Models */
export type SftWithToken = Sft & { token: Token };

/** @group Model Helpers */
export const isSftWithToken = (value: any): value is SftWithToken =>
  isSft(value) && 'token' in value;

/** @group Model Helpers */
export function assertSftWithToken(value: any): asserts value is SftWithToken {
  assert(isSftWithToken(value), `Expected Sft model with token`);
}

/** @group Model Helpers */
export const toSftWithToken = (
  metadata: Metadata,
  mint: Mint,
  token: Token
): SftWithToken => {
  const sft = toSft(metadata, mint);
  const { currency } = sft.mint;
  return {
    ...sft,
    token: {
      ...token,
      amount: amount(token.amount.basisPoints, currency),
      delegateAmount: amount(token.delegateAmount.basisPoints, currency),
    },
  };
};
