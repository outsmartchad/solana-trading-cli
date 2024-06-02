import type { PublicKey } from '@solana/web3.js';
import { MintAccount } from '../accounts';
import { WRAPPED_SOL_MINT } from '../constants';
import { amount, SplTokenCurrency, SplTokenAmount } from '@/types';
import { assert, Option } from '@/utils';

/**
 * This model represents a mint account.
 *
 * @group Models
 */
export type Mint = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'mint';

  /** The address of the mint account. */
  readonly address: PublicKey;

  /**
   * The address of the authority that is allowed
   * to mint new tokens to token accounts.
   *
   * When `null`, no authority is ever allowed to mint new tokens.
   */
  readonly mintAuthorityAddress: Option<PublicKey>;

  /**
   * The address of the authority that is allowed
   * to freeze token accounts.
   *
   * When `null`, no authority is ever allowed to freeze token accounts.
   */
  readonly freezeAuthorityAddress: Option<PublicKey>;

  /**
   * The number of decimal points used to define token amounts.
   */
  readonly decimals: number;

  /**
   * The current supply of tokens across all token accounts.
   */
  readonly supply: SplTokenAmount;

  /**
   * Helper boolean to determine whether this mint account is the
   * mint account that wraps SOL as an SPL token.
   */
  readonly isWrappedSol: boolean;

  /**
   * A currency object that can be used to create amounts
   * representing the tokens of this mint account.
   *
   * For instance, here's how you can transform an amount of token
   * in basis points into an `Amount` object.
   *
   * ```ts
   * const tokenBasisPoints = 1000;
   * const tokensAsAmount = amount(tokenBasisPoints, mint.currency);
   * ```
   */
  readonly currency: SplTokenCurrency;
};

/** @group Model Helpers */
export const isMint = (value: any): value is Mint =>
  typeof value === 'object' && value.model === 'mint';

/** @group Model Helpers */
export function assertMint(value: any): asserts value is Mint {
  assert(isMint(value), `Expected Mint model`);
}

/** @group Model Helpers */
export const toMint = (account: MintAccount): Mint => {
  const isWrappedSol = account.publicKey.equals(WRAPPED_SOL_MINT);
  const currency: SplTokenCurrency = {
    symbol: isWrappedSol ? 'SOL' : 'Token',
    decimals: account.data.decimals,
    namespace: 'spl-token',
  };

  return {
    model: 'mint',
    address: account.publicKey,
    mintAuthorityAddress: account.data.mintAuthorityOption
      ? account.data.mintAuthority
      : null,
    freezeAuthorityAddress: account.data.freezeAuthorityOption
      ? account.data.freezeAuthority
      : null,
    decimals: account.data.decimals,
    supply: amount(account.data.supply.toString(), currency),
    isWrappedSol,
    currency,
  };
};
