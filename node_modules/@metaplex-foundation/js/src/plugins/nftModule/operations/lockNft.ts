import { createLockInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { isNonFungible, Sft } from '../models';
import {
  parseTokenMetadataAuthorization,
  TokenMetadataAuthorityTokenDelegate,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import { Metaplex } from '@/Metaplex';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const TOKEN_AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'
);

// -----------------
// Operation
// -----------------

const Key = 'LockNftOperation' as const;

/**
 * Lock a programmable NFT.
 *
 * ```ts
 * await metaplex.nfts().lock({ nftOrSft, authority });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const lockNftOperation = useOperation<LockNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LockNftOperation = Operation<
  typeof Key,
  LockNftInput,
  LockNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type LockNftInput = {
  /**
   * The NFT or SFT to lock.
   * We only need its address and token standard.
   *
   * Note that locking only works for programmable assets.
   */
  nftOrSft: Pick<Sft, 'address' | 'tokenStandard'>;

  /**
   * An authority allowed to lock the asset.
   *
   * This must be a token delegate.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority: TokenMetadataAuthorityTokenDelegate;

  /**
   * The authorization rules and data to use for the operation.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;
};

/**
 * @group Operations
 * @category Outputs
 */
export type LockNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const lockNftOperationHandler: OperationHandler<LockNftOperation> = {
  handle: async (
    operation: LockNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<LockNftOutput> => {
    return lockNftBuilder(metaplex, operation.input, scope).sendAndConfirm(
      metaplex,
      scope.confirmOptions
    );
  },
};

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type LockNftBuilderParams = Omit<LockNftInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Lock a programmable NFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .lock({ nftOrSft, authority });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const lockNftBuilder = (
  metaplex: Metaplex,
  params: LockNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const { nftOrSft } = params;

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const systemProgram = metaplex.programs().getSystem(programs);

  // Auth.
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: nftOrSft.address,
    authority: params.authority,
    authorizationDetails: params.authorizationDetails,
    programs,
  });

  // PDAs.
  const metadata = metaplex.nfts().pdas().metadata({
    mint: nftOrSft.address,
    programs,
  });
  const edition = metaplex.nfts().pdas().masterEdition({
    mint: nftOrSft.address,
    programs,
  });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createLockInstruction(
          {
            authority: auth.accounts.authority,
            tokenOwner: auth.accounts.approver,
            token: auth.accounts.token as PublicKey,
            mint: nftOrSft.address,
            metadata,
            edition: isNonFungible(nftOrSft) ? edition : undefined,
            tokenRecord: auth.accounts.delegateRecord,
            payer: payer.publicKey,
            systemProgram: systemProgram.address,
            sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            splTokenProgram: tokenProgram.address,
            authorizationRules: auth.accounts.authorizationRules,
            authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
          },
          { lockArgs: { __kind: 'V1', ...auth.data } },
          tokenMetadataProgram.address
        ),
        signers: [payer, ...auth.signers],
        key: params.instructionKey ?? 'lockNft',
      })
  );
};
