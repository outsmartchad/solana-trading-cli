import { ProgramClient } from '../programModule';
import {
  approveTokenDelegateAuthorityOperation,
  approveTokenDelegateAuthorityOperationHandler,
  createMintOperation,
  createMintOperationHandler,
  createTokenOperation,
  createTokenOperationHandler,
  createTokenWithMintOperation,
  createTokenWithMintOperationHandler,
  findMintByAddressOperation,
  findMintByAddressOperationHandler,
  findTokenByAddressOperation,
  findTokenByAddressOperationHandler,
  findTokenWithMintByAddressOperation,
  findTokenWithMintByAddressOperationHandler,
  findTokenWithMintByMintOperation,
  findTokenWithMintByMintOperationHandler,
  freezeTokensOperation,
  freezeTokensOperationHandler,
  mintTokensOperation,
  mintTokensOperationHandler,
  revokeTokenDelegateAuthorityOperation,
  revokeTokenDelegateAuthorityOperationHandler,
  sendTokensOperation,
  sendTokensOperationHandler,
  thawTokensOperation,
  thawTokensOperationHandler,
} from './operations';
import { associatedTokenProgram, tokenProgram } from './program';
import { TokenClient } from './TokenClient';
import type { MetaplexPlugin, Program } from '@/types';
import type { Metaplex } from '@/Metaplex';
/**
 * @group Plugins
 */
/** @group Plugins */
export const tokenModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    // Token Program.
    metaplex.programs().register(tokenProgram);
    metaplex.programs().getToken = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(tokenProgram.name, programs);
    };

    // Associated Token Program.
    metaplex.programs().register(associatedTokenProgram);
    metaplex.programs().getAssociatedToken = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(associatedTokenProgram.name, programs);
    };

    // Operations.
    const op = metaplex.operations();
    op.register(
      approveTokenDelegateAuthorityOperation,
      approveTokenDelegateAuthorityOperationHandler
    );
    op.register(createMintOperation, createMintOperationHandler);
    op.register(createTokenOperation, createTokenOperationHandler);
    op.register(
      createTokenWithMintOperation,
      createTokenWithMintOperationHandler
    );
    op.register(findMintByAddressOperation, findMintByAddressOperationHandler);
    op.register(
      findTokenByAddressOperation,
      findTokenByAddressOperationHandler
    );
    op.register(
      findTokenWithMintByAddressOperation,
      findTokenWithMintByAddressOperationHandler
    );
    op.register(
      findTokenWithMintByMintOperation,
      findTokenWithMintByMintOperationHandler
    );
    op.register(freezeTokensOperation, freezeTokensOperationHandler);
    op.register(mintTokensOperation, mintTokensOperationHandler);
    op.register(
      revokeTokenDelegateAuthorityOperation,
      revokeTokenDelegateAuthorityOperationHandler
    );
    op.register(sendTokensOperation, sendTokensOperationHandler);
    op.register(thawTokensOperation, thawTokensOperationHandler);

    metaplex.tokens = function () {
      return new TokenClient(this);
    };
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    tokens(): TokenClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getToken(programs?: Program[]): Program;
    getAssociatedToken(programs?: Program[]): Program;
  }
}
