import type { PublicKey } from '@solana/web3.js';
import { AccountState } from '@solana/spl-token';
import { TokenAccount } from '../accounts';
import { associatedTokenProgram } from '../program';
import { Mint } from './Mint';
import { amount, Pda, SplTokenAmount, token } from '@/types';
import { assert, Option } from '@/utils';

/**
 * This model represents a token account.
 *
 * @group Models
 */
export type Token = {
  /** A model identifier to distinguish models in the SDK. */
  readonly model: 'token';

  /** The address of the token account. */
  readonly address: PublicKey | Pda;

  /** Whether or not this is an associated token account. */
  readonly isAssociatedToken: boolean;

  /** The address of the mint account. */
  readonly mintAddress: PublicKey;

  /** The address of the owner of this token account. */
  readonly ownerAddress: PublicKey;

  /** The amount of tokens held in this account. */
  readonly amount: SplTokenAmount;

  /**
   * The address of the authority that can close the account.
   * This field is optional and may be `null`.
   */
  readonly closeAuthorityAddress: Option<PublicKey>;

  /**
   * The address of the authority that can act on behalf of the owner
   * of the account. This field is optional and may be `null`.
   */
  readonly delegateAddress: Option<PublicKey>;

  /**
   * The amount of tokens that were delegated to the delegate authority.
   * This means the delegate authority cannot transfer more tokens
   * than this amount even if the token account has more tokens available.
   *
   * This field is only relevant if the account has a delegate authority.
   */
  readonly delegateAmount: SplTokenAmount;

  /**
   * The state of the token account.
   * It is mostly used to determine whether or not the account is frozen.
   *
   * It can be one of the following:
   * - `AccountState.Uninitialized`: The account has not been initialized.
   *   This should never happen in this model since the SDK would fail to
   *   parse this model if it were uninitialized.
   * - `AccountState.Initialized`: The account has been initialized and is not frozen.
   * - `AccountState.Frozen`: The account has been initialized and is frozen.
   */
  readonly state: AccountState;
};

/** @group Model Helpers */
export const isToken = (value: any): value is Token =>
  typeof value === 'object' && value.model === 'token';

/** @group Model Helpers */
export function assertToken(value: any): asserts value is Token {
  assert(isToken(value), `Expected Token model`);
}

/** @group Model Helpers */
export const toToken = (account: TokenAccount): Token => {
  const associatedTokenAddress = Pda.find(associatedTokenProgram.address, [
    account.data.owner.toBuffer(),
    account.owner.toBuffer(),
    account.data.mint.toBuffer(),
  ]);
  const isAssociatedToken = associatedTokenAddress.equals(account.publicKey);

  return {
    model: 'token',
    address: isAssociatedToken ? associatedTokenAddress : account.publicKey,
    isAssociatedToken,
    mintAddress: account.data.mint,
    ownerAddress: account.data.owner,
    amount: token(account.data.amount.toString()),
    closeAuthorityAddress: account.data.closeAuthorityOption
      ? account.data.closeAuthority
      : null,
    delegateAddress: account.data.delegateOption ? account.data.delegate : null,
    delegateAmount: token(account.data.delegatedAmount.toString()),
    state: account.data.state,
  };
};

/** @group Models */
export type TokenWithMint = Omit<Token, 'model' | 'mintAddress'> &
  Readonly<{
    model: 'tokenWithMint';
    mint: Mint;
  }>;

/** @group Model Helpers */
export const isTokenWithMint = (value: any): value is TokenWithMint =>
  typeof value === 'object' && value.model === 'tokenWithMint';

/** @group Model Helpers */
export function assertTokenWithMint(
  value: any
): asserts value is TokenWithMint {
  assert(isTokenWithMint(value), `Expected TokenWithMint model`);
}

/** @group Model Helpers */
export const toTokenWithMint = (
  tokenAccount: TokenAccount,
  mintModel: Mint
): TokenWithMint => {
  const token = toToken(tokenAccount);
  return {
    ...token,
    model: 'tokenWithMint',
    mint: mintModel,
    amount: amount(token.amount.basisPoints, mintModel.currency),
    delegateAmount: amount(
      token.delegateAmount.basisPoints,
      mintModel.currency
    ),
  };
};
