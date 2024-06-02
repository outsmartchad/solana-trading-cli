import { createTransferInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  getSignerFromTokenMetadataAuthority,
  parseTokenMetadataAuthorization,
  TokenMetadataAuthorityHolder,
  TokenMetadataAuthorityTokenDelegate,
  TokenMetadataAuthorizationDetails,
} from '../Authorization';
import { isNonFungible, isProgrammable, Sft } from '../models';
import {
  TransferCompressedNftBuilderParams,
  prepareTransferCompressedNftBuilder,
  transferCompressedNftBuilder,
} from './transferCompressedNft';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
  SplTokenAmount,
  token,
  useOperation,
  TransferNftCompressionParam,
} from '@/types';
import { Metaplex } from '@/Metaplex';

const TOKEN_AUTH_RULES_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'
);

// -----------------
// Operation
// -----------------

const Key = 'TransferNftOperation' as const;

/**
 * Transfers an NFT or SFT from one account to another.
 *
 * ```ts
 * await metaplex.nfts().transfer({
 *   nftOrSft,
 *   toOwner,
 *   amount: token(5),
 * });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const transferNftOperation = useOperation<TransferNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type TransferNftOperation = Operation<
  typeof Key,
  TransferNftInput,
  TransferNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type TransferNftInput = {
  /**
   * The NFT or SFT to transfer.
   * We only need its address and token standard.
   */
  nftOrSft: Pick<Sft, 'address' | 'tokenStandard'>;

  /**
   * An authority allowed to transfer the asset.
   *
   * Note that Metadata authorities are
   * not supported for this instruction.
   *
   * If a `Signer` is provided directly,
   * it will be used as an Holder authority.
   *
   * @see {@link TokenMetadataAuthority}
   * @defaultValue `metaplex.identity()`
   */
  authority?:
    | Signer
    | TokenMetadataAuthorityTokenDelegate
    | TokenMetadataAuthorityHolder;

  /**
   * The authorization rules and data to use for the transfer.
   *
   * @see {@link TokenMetadataAuthorizationDetails}
   * @defaultValue Defaults to not using auth rules.
   */
  authorizationDetails?: TokenMetadataAuthorizationDetails;

  /**
   * The wallet to get the tokens from.
   *
   * @defaultValue The public key of the provided authority.
   */
  fromOwner?: PublicKey;

  /**
   * The token account to be debited.
   *
   * @defaultValue Defaults to the associated token account of `fromOwner`.
   */
  fromToken?: PublicKey;

  /**
   * The wallet to send the tokens to.
   */
  toOwner: PublicKey;

  /**
   * The token account to be credited.
   *
   * @defaultValue Defaults to the associated token account of `toOwner`.
   */
  toToken?: PublicKey;

  /**
   * The amount of tokens to transfer.
   *
   * @defaultValue `token(1)`
   */
  amount?: SplTokenAmount;

  /**
   * The compression data needed for transfer.
   */
  compression?: TransferNftCompressionParam;
};

/**
 * @group Operations
 * @category Outputs
 */
export type TransferNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const transferNftOperationHandler: OperationHandler<TransferNftOperation> =
  {
    handle: async (
      operation: TransferNftOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<TransferNftOutput> => {
      // handle the case of transferring compressed nfts
      if (
        !!operation.input.compression ||
        // @ts-ignore
        !!operation.input.nftOrSft?.compression?.compressed
      ) {
        operation.input = await prepareTransferCompressedNftBuilder(
          metaplex,
          operation.input as TransferCompressedNftBuilderParams
        );
        return transferCompressedNftBuilder(
          metaplex,
          operation.input as TransferCompressedNftBuilderParams,
          scope
        ).sendAndConfirm(metaplex, scope.confirmOptions);
      }

      return transferNftBuilder(
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
export type TransferNftBuilderParams = Omit<
  TransferNftInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that uses the NFT. */
  instructionKey?: string;
};

/**
 * Transfers an NFT or SFT from one account to another.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .transfer({
 *     nftOrSft,
 *     toOwner,
 *     amount: token(5),
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const transferNftBuilder = (
  metaplex: Metaplex,
  params: TransferNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    nftOrSft,
    authority = metaplex.identity(),
    toOwner,
    amount = token(1),
    authorizationDetails,
  } = params;

  // From owner.
  const fromOwner =
    params.fromOwner ??
    getSignerFromTokenMetadataAuthority(authority).publicKey;

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
  const edition = metaplex.nfts().pdas().masterEdition({
    mint: nftOrSft.address,
    programs,
  });
  const fromToken =
    params.fromToken ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: nftOrSft.address,
      owner: fromOwner,
      programs,
    });
  const toToken =
    params.toToken ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: nftOrSft.address,
      owner: toOwner,
      programs,
    });
  const ownerTokenRecord = metaplex.nfts().pdas().tokenRecord({
    mint: nftOrSft.address,
    token: fromToken,
    programs,
  });
  const destinationTokenRecord = metaplex.nfts().pdas().tokenRecord({
    mint: nftOrSft.address,
    token: toToken,
    programs,
  });

  // Auth.
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: nftOrSft.address,
    authority:
      '__kind' in authority
        ? authority
        : { __kind: 'holder', owner: authority, token: fromToken },
    authorizationDetails,
    programs,
  });

  return (
    TransactionBuilder.make()
      .setFeePayer(payer)

      // Update the metadata account.
      .add({
        instruction: createTransferInstruction(
          {
            token: fromToken,
            tokenOwner: fromOwner,
            destination: toToken,
            destinationOwner: toOwner,
            mint: nftOrSft.address,
            metadata,
            edition: isNonFungible(nftOrSft) ? edition : undefined,
            ownerTokenRecord: isProgrammable(nftOrSft)
              ? ownerTokenRecord
              : undefined,
            destinationTokenRecord: isProgrammable(nftOrSft)
              ? destinationTokenRecord
              : undefined,
            authority: auth.accounts.authority,
            payer: payer.publicKey,
            systemProgram: systemProgram.address,
            sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            splTokenProgram: tokenProgram.address,
            splAtaProgram: ataProgram.address,
            authorizationRules: auth.accounts.authorizationRules,
            authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
          },
          {
            transferArgs: {
              __kind: 'V1',
              amount: amount.basisPoints,
              ...auth.data,
            },
          },
          tokenMetadataProgram.address
        ),
        signers: [payer, ...auth.signers],
        key: params.instructionKey ?? 'transferNft',
      })
  );
};
