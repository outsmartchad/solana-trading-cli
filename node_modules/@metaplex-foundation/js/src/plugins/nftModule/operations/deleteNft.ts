import { createBurnInstruction } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  TokenMetadataAuthorityHolder,
  TokenMetadataAuthorityTokenDelegate,
  getSignerFromTokenMetadataAuthority,
  parseTokenMetadataAuthorization,
} from '../Authorization';
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

// -----------------
// Operation
// -----------------

const Key = 'DeleteNftOperation' as const;

/**
 * Deletes an existing NFT.
 *
 * ```ts
 * await metaplex
 *   .nfts()
 *   .delete({ mintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const deleteNftOperation = useOperation<DeleteNftOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type DeleteNftOperation = Operation<
  typeof Key,
  DeleteNftInput,
  DeleteNftOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type DeleteNftInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * An authority allowed to burn the asset.
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
   * Alias of `authority` for backwards compatibility.
   *
   * @deprecated Use `authority` instead.
   * @see {@link DeleteNftInput.authority}
   */
  owner?: Signer;

  /**
   * The mint of the parent edition when the asset is a printed edition.
   *
   * @defaultValue Defaults to not providing a parent edition to the program.
   */
  parentEditionMint?: PublicKey;

  /**
   * The token account of the parent edition when the asset is a printed edition.
   *
   * @defaultValue Defaults to not providing a parent edition to the program.
   */
  parentEditionToken?: PublicKey;

  /**
   * The edition marker of the asset if it is a printed edition.
   *
   * @defaultValue Defaults to not providing the edition marker to the program.
   */
  editionMarker?: PublicKey;

  /**
   * The explicit token account linking the provided mint and owner
   * accounts, if that account is not their associated token account.
   *
   * @defaultValue Defaults to using the associated token account
   * from the `mintAddress` and `owner` parameters.
   */
  ownerTokenAccount?: PublicKey;

  /**
   * The address of the Sized Collection NFT associated with the
   * NFT to delete, if any. This is required as the collection NFT
   * will need to decrement its size.
   *
   * @defaultValue Defaults to assuming the NFT is not associated with a
   * Size Collection NFT.
   */
  collection?: PublicKey;

  /**
   * The amount of tokens to burn.
   *
   * @defaultValue `token(1)`
   */
  amount?: SplTokenAmount;
};

/**
 * @group Operations
 * @category Outputs
 */
export type DeleteNftOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;
};

/**
 * @group Operations
 * @category Handlers
 */
export const deleteNftOperationHandler: OperationHandler<DeleteNftOperation> = {
  handle: async (
    operation: DeleteNftOperation,
    metaplex: Metaplex,
    scope: OperationScope
  ): Promise<DeleteNftOutput> => {
    return deleteNftBuilder(metaplex, operation.input, scope).sendAndConfirm(
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
export type DeleteNftBuilderParams = Omit<DeleteNftInput, 'confirmOptions'> & {
  /** A key to distinguish the instruction that burns the NFT. */
  instructionKey?: string;
};

/**
 * Deletes an existing NFT.
 *
 * ```ts
 * const transactionBuilder = metaplex
 *   .nfts()
 *   .builders()
 *   .delete({ mintAddress });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const deleteNftBuilder = (
  metaplex: Metaplex,
  params: DeleteNftBuilderParams,
  options: TransactionBuilderOptions = {}
): TransactionBuilder => {
  const { programs, payer = metaplex.rpc().getDefaultFeePayer() } = options;
  const {
    mintAddress,
    ownerTokenAccount,
    collection,
    parentEditionMint,
    parentEditionToken,
    editionMarker,
    amount = token(1),
  } = params;

  const authority =
    params.authority ?? params.owner ?? (metaplex.identity() as Signer);

  const systemProgram = metaplex.programs().getSystem(programs);
  const tokenProgram = metaplex.programs().getToken(programs);
  const tokenMetadataProgram = metaplex.programs().getTokenMetadata(programs);

  const owner = getSignerFromTokenMetadataAuthority(authority).publicKey;
  const metadata = metaplex.nfts().pdas().metadata({
    mint: mintAddress,
    programs,
  });
  const edition = metaplex.nfts().pdas().masterEdition({
    mint: mintAddress,
    programs,
  });
  const tokenAddress =
    ownerTokenAccount ??
    metaplex.tokens().pdas().associatedTokenAccount({
      mint: mintAddress,
      owner,
      programs,
    });

  // Auth.
  const auth = parseTokenMetadataAuthorization(metaplex, {
    mint: mintAddress,
    authority:
      '__kind' in authority
        ? authority
        : { __kind: 'holder', owner: authority, token: tokenAddress },
    programs,
  });

  return TransactionBuilder.make()
    .setFeePayer(payer)
    .add({
      instruction: createBurnInstruction(
        {
          authority: auth.accounts.authority,
          collectionMetadata: collection
            ? metaplex.nfts().pdas().metadata({ mint: collection, programs })
            : undefined,
          metadata,
          edition,
          mint: mintAddress,
          token: auth.accounts.token!,
          masterEdition: parentEditionMint
            ? metaplex.nfts().pdas().metadata({
                mint: parentEditionMint,
                programs,
              })
            : undefined,
          masterEditionMint: parentEditionMint,
          masterEditionToken: parentEditionToken,
          editionMarker,
          tokenRecord: auth.accounts.delegateRecord,
          systemProgram: systemProgram.address,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          splTokenProgram: tokenProgram.address,
        },
        { burnArgs: { __kind: 'V1', amount: amount.basisPoints } },
        tokenMetadataProgram.address
      ),
      signers: auth.signers,
      key: params.instructionKey ?? 'deleteNft',
    });
};
