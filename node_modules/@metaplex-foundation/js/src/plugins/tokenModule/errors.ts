import { PublicKey } from '@solana/web3.js';
import { MetaplexError } from '@/errors';

/** @group Errors */
export class TokenError extends MetaplexError {
  readonly name: string = 'TokenError';
  constructor(message: string, cause?: Error) {
    super(message, 'plugin', 'Token', cause);
  }
}

/** @group Errors */
export class MintAuthorityMustBeSignerToMintInitialSupplyError extends TokenError {
  readonly name: string = 'MintAuthorityMustBeSignerToMintInitialSupplyError';
  constructor() {
    const message =
      'You are trying to create a Mint and a Token account and to send an initial ' +
      'supply of token to the newly created Token account. The issue is, you have provided ' +
      "a Mint Authority as a Public Key which means we don't have the rights to send this transaction. " +
      'Please provide the Mint Authority as a Signer when using the "createTokenWithMint" operation ' +
      ', so we can send the initial supply. Alternative, remove the initial supply from the operation for it to succeed.';
    super(message);
  }
}

/** @group Errors */
export class TokenAndMintDoNotMatchError extends TokenError {
  constructor(token: PublicKey, tokenMint: PublicKey, mint: PublicKey) {
    const message =
      `The provided Token and Mint accounts do not match. That is, the mint address [${tokenMint}] ` +
      `stored in the Token account [${token}] do not match the address of the Mint account [${mint}]. ` +
      'Please provide a Token account that belongs to the provided Mint account.';
    super(message);
  }
}
