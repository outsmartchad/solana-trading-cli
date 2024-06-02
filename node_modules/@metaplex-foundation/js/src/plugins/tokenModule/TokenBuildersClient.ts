import {
  approveTokenDelegateAuthorityBuilder,
  ApproveTokenDelegateAuthorityBuilderParams,
  createMintBuilder,
  CreateMintBuilderParams,
  createTokenBuilder,
  CreateTokenBuilderParams,
  createTokenIfMissingBuilder,
  CreateTokenIfMissingBuilderParams,
  createTokenWithMintBuilder,
  CreateTokenWithMintBuilderParams,
  freezeTokensBuilder,
  FreezeTokensBuilderParams,
  mintTokensBuilder,
  MintTokensBuilderParams,
  revokeTokenDelegateAuthorityBuilder,
  RevokeTokenDelegateAuthorityBuilderParams,
  sendTokensBuilder,
  SendTokensBuilderParams,
  thawTokensBuilder,
  ThawTokensBuilderParams,
} from './operations';
import type { Metaplex } from '@/Metaplex';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the Token module.
 *
 * @see {@link TokenClient}
 * @group Module Builders
 * */
export class TokenBuildersClient {
  constructor(protected readonly metaplex: Metaplex) {}

  // -----------------
  // Create
  // -----------------

  /** {@inheritDoc createMintBuilder} */
  createMint(
    input: CreateMintBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createMintBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createTokenBuilder} */
  createToken(
    input: CreateTokenBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createTokenIfMissingBuilder} @internal */
  createTokenIfMissing(
    input: CreateTokenIfMissingBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenIfMissingBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc createTokenWithMintBuilder} */
  createTokenWithMint(
    input: CreateTokenWithMintBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return createTokenWithMintBuilder(this.metaplex, input, options);
  }

  // -----------------
  // Update
  // -----------------

  /** {@inheritDoc mintTokensBuilder} */
  mint(input: MintTokensBuilderParams, options?: TransactionBuilderOptions) {
    return mintTokensBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc sendTokensBuilder} */
  send(input: SendTokensBuilderParams, options?: TransactionBuilderOptions) {
    return sendTokensBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc freezeTokensBuilder} */
  freeze(
    input: FreezeTokensBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return freezeTokensBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc thawTokensBuilder} */
  thaw(input: ThawTokensBuilderParams, options?: TransactionBuilderOptions) {
    return thawTokensBuilder(this.metaplex, input, options);
  }

  // -----------------
  // Delegate
  // -----------------

  /** {@inheritDoc approveTokenDelegateAuthorityBuilder} */
  approveDelegateAuthority(
    input: ApproveTokenDelegateAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return approveTokenDelegateAuthorityBuilder(this.metaplex, input, options);
  }

  /** {@inheritDoc revokeTokenDelegateAuthorityBuilder} */
  revokeDelegateAuthority(
    input: RevokeTokenDelegateAuthorityBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return revokeTokenDelegateAuthorityBuilder(this.metaplex, input, options);
  }
}
