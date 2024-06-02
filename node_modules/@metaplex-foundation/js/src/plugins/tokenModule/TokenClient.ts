import {
  ApproveTokenDelegateAuthorityInput,
  approveTokenDelegateAuthorityOperation,
  CreateMintInput,
  createMintOperation,
  CreateTokenInput,
  createTokenOperation,
  CreateTokenWithMintInput,
  createTokenWithMintOperation,
  FindMintByAddressInput,
  findMintByAddressOperation,
  FindTokenByAddressInput,
  findTokenByAddressOperation,
  FindTokenWithMintByAddressInput,
  findTokenWithMintByAddressOperation,
  FindTokenWithMintByMintInput,
  findTokenWithMintByMintOperation,
  FreezeTokensInput,
  freezeTokensOperation,
  MintTokensInput,
  mintTokensOperation,
  RevokeTokenDelegateAuthorityInput,
  revokeTokenDelegateAuthorityOperation,
  SendTokensInput,
  sendTokensOperation,
  ThawTokensInput,
  thawTokensOperation,
} from './operations';
import { TokenBuildersClient } from './TokenBuildersClient';
import { TokenPdasClient } from './TokenPdasClient';
import type { Metaplex } from '@/Metaplex';
import { OperationOptions } from '@/types';

/**
 * This is a client for the Token module.
 *
 * It enables us to interact with the SPL Token program in order to
 * create, send, freeze, thaw, and mint tokens.
 *
 * You may access this client via the `tokens()` method of your `Metaplex` instance.
 *
 * ```ts
 * const tokenClient = metaplex.tokens();
 * ```
 *
 * @example
 * You can create a new mint account with an associated token account like so.
 * The owner of this token account will, by default, be the current identity
 * of the metaplex instance.
 *
 * ```ts
 * const { token } = await metaplex.tokens().createTokenWithMint();
 * ```
 *
 * @group Modules
 */
export class TokenClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = metaplex.tokens().builders();
   * ```
   */
  builders() {
    return new TokenBuildersClient(this.metaplex);
  }

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = metaplex.tokens().pdas();
   * ```
   */
  pdas() {
    return new TokenPdasClient(this.metaplex);
  }

  // -----------------
  // Queries
  // -----------------

  /** {@inheritDoc findMintByAddressOperation} */
  findMintByAddress(input: FindMintByAddressInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findMintByAddressOperation(input), options);
  }

  /** {@inheritDoc findTokenByAddressOperation} */
  findTokenByAddress(
    input: FindTokenByAddressInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findTokenByAddressOperation(input), options);
  }

  /** {@inheritDoc findTokenWithMintByAddressOperation} */
  findTokenWithMintByAddress(
    input: FindTokenWithMintByAddressInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findTokenWithMintByAddressOperation(input), options);
  }

  /** {@inheritDoc findTokenWithMintByMintOperation} */
  findTokenWithMintByMint(
    input: FindTokenWithMintByMintInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findTokenWithMintByMintOperation(input), options);
  }

  // -----------------
  // Create
  // -----------------

  /** {@inheritDoc createMintOperation} */
  createMint(input: CreateMintInput = {}, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createMintOperation(input), options);
  }

  /**
   * Create a new Token account from the provided input
   * and returns the newly created `Token` model.
   */
  /** {@inheritDoc createTokenOperation} */
  createToken(input: CreateTokenInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createTokenOperation(input), options);
  }

  /** {@inheritDoc createTokenWithMintOperation} */
  createTokenWithMint(
    input: CreateTokenWithMintInput = {},
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(createTokenWithMintOperation(input), options);
  }

  // -----------------
  // Update
  // -----------------

  /** {@inheritDoc mintTokensOperation} */
  mint(input: MintTokensInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(mintTokensOperation(input), options);
  }

  /** {@inheritDoc sendTokensOperation} */
  send(input: SendTokensInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(sendTokensOperation(input), options);
  }

  /** {@inheritDoc freezeTokensOperation} */
  freeze(input: FreezeTokensInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(freezeTokensOperation(input), options);
  }

  /** {@inheritDoc thawTokensOperation} */
  thaw(input: ThawTokensInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(thawTokensOperation(input), options);
  }

  // -----------------
  // Delegate
  // -----------------

  /** {@inheritDoc approveTokenDelegateAuthorityOperation} */
  approveDelegateAuthority(
    input: ApproveTokenDelegateAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(approveTokenDelegateAuthorityOperation(input), options);
  }

  /** {@inheritDoc revokeTokenDelegateAuthorityOperation} */
  revokeDelegateAuthority(
    input: RevokeTokenDelegateAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(revokeTokenDelegateAuthorityOperation(input), options);
  }
}
