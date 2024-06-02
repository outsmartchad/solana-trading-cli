import { createMintInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  parseTokenMetadataAuthorization,
  TokenMetadataAuthorityMetadata,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import { isNonFungible, Sft } from '../models';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  token,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

const TOKEN_AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'
);

// -----------------
// Operation
// -----------------

const Key = 'MintNftOperation' as const;

/**
 * Mint token(s) for an NFT or SFT.
 *
 * ```ts
 * await metaplex.nfts().mint({
 *   nftOrSft,
 *   toOwner,
 *   amount: token(5),
 * });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const mintNftOperation = useOperation<MintNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type MintNftOperation = Operation<
  typeof Key,
  MintNftInput,
  MintNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type MintNftInput = {
  /**
   * The NFT or SFT to mint from.
   * We only need its address and token standard.
   */
  nftOrSft: Pick<Sft, 'address' | 'tokenStandard'>;

  /**
   * An authority allowed to mint the asset.
   *
   * This must be the update authority for Non-Fungible assets
   * and the mint authority for Semi-Fungible assets.
   *
   * Note that Delegate and Holder authorities
   * are not supported for this instruction.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority?: Signer | TokenMetadataAuthorityMetadata;

  /**
   * The authorization rules and data to use for the mint.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;

  /**
   * The owner of the destination token account.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  toOwner?: PublicKey;

  /**
   * The address of the destination token account.
   *
   * This may be a regular token account or an associated token account.
   * If the token account does not exist, then it will be created but
   * only if it is an associated token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `nftOrSft.address` and `toOwner` parameters.
   */
  toToken?: PublicKey;

  /**
   * The amount of tokens to mint.
   *
   * @defaultValue `token(1)`
   */
  amount?: SplTokenAmount;
};

/**
 * @group Operations
 * @category Outputs
 */
export type MintNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const mintNftOperationHandler: OperationHandler<MintNftOperation> = {
  handle: async (
    operation: MintNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<MintNftOutput> => {
    return mintNftBuilder(metaplex, operation.input, scope).sendAndConfirm(
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
export type MintNftBuilderParams = Omit<MintNftInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Mint token(s) for an NFT or SFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .mint({
 *     nftOrSft,
 *     toOwner,
 *     amount: token(5),
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const mintNftBuilder = (
  metaplex: Metaplex,
  params: MintNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    nftOrSft,
    authority = metaplex.identity(),
    authorizationDetails,
    toOwner = metaplex.identity().publicKey,
    amount = token(1),
  } = params;

  // Auth.
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: nftOrSft.address,
    authority:
      '__kind' in authority
        ? authority
        : { __kind: 'metadata', updateAuthority: authority },
    authorizationDetails,
    programs,
  });

  // Programs.
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);
  const ataProgram = metaplex.programs().getAssociatedToken(programs);
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

  // Destination token account.
  const toToken =
    params.toToken ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: nftOrSft.address,
      owner: toOwner,
      programs,
    });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createMintInstruction(
          {
            token: toToken,
            tokenOwner: toOwner,
            metadata,
            masterEdition: isNonFungible(nftOrSft) ? masterEdition : undefined,
            tokenRecord: metaplex.nfts().pdas().tokenRecord({
              mint: nftOrSft.address,
              token: toToken,
              programs,
            }),
            mint: nftOrSft.address,
            authority: auth.accounts.authority,
            // delegateRecord, // TODO: add when program supports Authority delegate.
            payer: payer.publicKey,
            systemProgram: systemProgram.address,
            sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            splTokenProgram: tokenProgram.address,
            splAtaProgram: ataProgram.address,
            authorizationRules: auth.accounts.authorizationRules,
            authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
          },
          {
            mintArgs: {
              __kind: 'V1',
              amount: amount.basisPoints,
              ...auth.data,
            },
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, ...auth.signers],
        key: params.instructionKey ?? 'mintNft',
      })
  );
};
