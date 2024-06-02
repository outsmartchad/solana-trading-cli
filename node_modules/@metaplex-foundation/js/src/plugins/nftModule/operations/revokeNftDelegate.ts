import {
  createRevokeInstruction,
  RevokeArgs,
} from '@metaplex-foundation/mpl-token-metadata';
import { SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  parseTokenMetadataAuthorization,
  TokenMetadataAuthority,
  TokenMetadataAuthorityHolder,
  TokenMetadataAuthorityMetadata,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import {
  DelegateInput,
  parseTokenMetadataDelegateInput,
} from '../DelegateInput';
import { isNonFungible, Sft } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  Signer,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

const TOKEN_AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'
);

// -----------------
// Operation
// -----------------

const Key = 'RevokeNftDelegateOperation' as const;

/**
 * Revoke an existing delegate authority for an NFT or SFT.
 *
 * ```ts
 * await metaplex.nfts().revoke({ sftOrNft, delegate });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const revokeNftDelegateOperation =
  useOperation<RevokeNftDelegateOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RevokeNftDelegateOperation = Operation<
  typeof Key,
  RevokeNftDelegateInput,
  RevokeNftDelegateOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RevokeNftDelegateInput = {
  /**
   * The NFT or SFT for which we want to revoke a delegate.
   * We only need its address and token standard.
   */
  nftOrSft: Pick<Sft, 'address' | 'tokenStandard'>;

  /**
   * An authority allowed to revoke a new delegate authority.
   *
   * Note that Delegate authorities are not supported for this
   * instruction as delegates cannot revoke other delegates.
   *
   * If a `Signer` is provided directly, it will be either
   * used as the update authority or as the token holder
   * based on the delegate type, i.g. `delegate.type`.
   *
   * If a `{ __kind: 'self'; delegate: Signer }` is
   * provided, it will assume the delegate
   * authority is trying to revoke itself.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority?:
    | Signer
    | { __kind: 'self'; delegate: Signer }
    | TokenMetadataAuthorityMetadata
    | TokenMetadataAuthorityHolder;

  /**
   * The authorization rules and data to use
   * when revoking the delegate authority.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;

  /**
   * The role, address and approver of the delegate to revoke.
   */
  delegate: DelegateInput;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RevokeNftDelegateOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const revokeNftDelegateOperationHandler: OperationHandler<RevokeNftDelegateOperation> =
  {
    handle: async (
      operation: RevokeNftDelegateOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<RevokeNftDelegateOutput> => {
      return revokeNftDelegateBuilder(
        metaplex,
        operation.input,
        scope
      ).sendAndConfirm(metaplex, scope.confirmOptions);
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RevokeNftDelegateBuilderParams = Omit<
  RevokeNftDelegateInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Revoke an existing delegate authority for an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .revoke({ sftOrNft, delegate });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const revokeNftDelegateBuilder = (
  metaplex: Metaplex,
  params: RevokeNftDelegateBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    nftOrSft,
    authority = metaplex.identity(),
    authorizationDetails,
  } = params;

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const systemProgram = metaplex.programs().getSystem(programs);

  // PDAs.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: nftOrSft.address,
    programs,
  });
  const masterEdition = metaplex.nfts().pdas().masterEdition({
    mint: nftOrSft.address,
    programs,
  });

  // Delegate to revoke.
  const { delegateRecord, delegate, tokenAccount, isTokenDelegate } =
    parseTokenMetadataDelegateInput(
      metaplex,
      nftOrSft.address,
      params.delegate,
      programs
    );

  // Auth.
  let tokenMetadataAuthority: TokenMetadataAuthority;
  if (!('__kind' in authority)) {
    tokenMetadataAuthority =
      'owner' in params.delegate
        ? {
            __kind: 'holder',
            owner: authority,
            token: metaplex.tokens().pdas().associatedTokenAccount({
              mint: nftOrSft.address,
              owner: authority.publicKey,
              programs,
            }),
          }
        : { __kind: 'metadata', updateAuthority: authority };
  } else if (authority.__kind === 'self') {
    tokenMetadataAuthority = {
      ...params.delegate,
      __kind: 'owner' in params.delegate ? 'tokenDelegate' : 'metadataDelegate',
      delegate: authority.delegate,
    } as TokenMetadataAuthority;
  } else {
    tokenMetadataAuthority = authority;
  }
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: nftOrSft.address,
    authority: tokenMetadataAuthority,
    authorizationDetails,
    programs,
  });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createRevokeInstruction(
          {
            delegateRecord,
            delegate,
            metadata,
            masterEdition: isNonFungible(nftOrSft) ? masterEdition : undefined,
            tokenRecord: isTokenDelegate ? delegateRecord : undefined,
            mint: nftOrSft.address,
            token: tokenAccount,
            authority: auth.accounts.authority,
            payer: payer.publicKey,
            systemProgram: systemProgram.address,
            sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            splTokenProgram: tokenProgram.address,
            authorizationRules: auth.accounts.authorizationRules,
            authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
          },
          {
            revokeArgs: RevokeArgs[params.delegate.type],
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, ...auth.signers],
        key: params.instructionKey ?? 'revokeNftDelegate',
      })
  );
};
