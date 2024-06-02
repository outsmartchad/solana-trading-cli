import { PublicKey } from '@solana/web3.js';
import {
  toMint,
  toMintAccount,
  toToken,
  toTokenAccount,
} from '../../tokenModule';
import {
  parseOriginalOrPrintEditionAccount,
  toMetadataAccount,
} from '../accounts';
import {
  JsonMetadata,
  Nft,
  NftWithToken,
  Sft,
  SftWithToken,
  toMetadata,
  toNft,
  toNftEdition,
  toNftWithToken,
  toSft,
  toSftWithToken,
} from '../models';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Metaplex } from '@/Metaplex';

// -----------------
// Operation
// -----------------

const Key = 'FindNftByMintOperation' as const;

/**
 * Finds an NFT or an SFT by its mint address.
 *
 * ```ts
 * const nft = await metaplex
 *   .nfts()
 *   .findByMint({ mintAddress };
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findNftByMintOperation = useOperation<FindNftByMintOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindNftByMintOperation = Operation<
  typeof Key,
  FindNftByMintInput,
  FindNftByMintOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindNftByMintInput = {
  /** The address of the mint account. */
  mintAddress: PublicKey;

  /**
   * The explicit token account to fetch with the NFT or SFT.
   *
   * If provided, and if that address is valid, the NFT or SFT returned
   * will be of the type `NftWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenOwner` parameter to fetch the
   * associated token account.
   *
   * @defaultValue Defaults to not fetching the token account.
   */
  tokenAddress?: PublicKey;

  /**
   * The associated token account to fetch with the NFT or SFT.
   *
   * If provided, and if that account exists, the NFT or SFT returned
   * will be of the type `NftWithToken` or `SftWithToken` respectively.
   *
   * Alternatively, you may use the `tokenAddress` parameter to fetch the
   * token account at an explicit address.
   *
   * @defaultValue Defaults to not fetching the associated token account.
   */
  tokenOwner?: PublicKey;

  /**
   * Whether or not we should fetch the JSON Metadata for the NFT or SFT.
   *
   * @defaultValue `true`
   */
  loadJsonMetadata?: boolean;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindNftByMintOutput = Nft | Sft | NftWithToken | SftWithToken;

/**
 * @group Operations
 * @category Handlers
 */
export const findNftByMintOperationHandler: OperationHandler<FindNftByMintOperation> =
  {
    handle: async (
      operation: FindNftByMintOperation,
      metaplex: Metaplex,
      scope: OperationScope
    ): Promise<FindNftByMintOutput> => {
      const { programs, commitment } = scope;
      const {
        mintAddress,
        tokenAddress,
        tokenOwner,
        loadJsonMetadata = true,
      } = operation.input;

      const associatedTokenAddress = tokenOwner
        ? metaplex.tokens().pdas().associatedTokenAccount({
            mint: mintAddress,
            owner: tokenOwner,
            programs,
          })
        : undefined;
      const nftPdas = metaplex.nfts().pdas();
      const accountAddresses = [
        mintAddress,
        nftPdas.metadata({ mint: mintAddress, programs }),
        nftPdas.masterEdition({ mint: mintAddress, programs }),
        tokenAddress ?? associatedTokenAddress,
      ].filter((address): address is PublicKey => !!address);

      const accounts = await metaplex
        .rpc()
        .getMultipleAccounts(accountAddresses, commitment);
      scope.throwIfCanceled();

      const mint = toMint(toMintAccount(accounts[0]));
      let metadata = toMetadata(toMetadataAccount(accounts[1]));
      const editionAccount = parseOriginalOrPrintEditionAccount(accounts[2]);
      const token = accounts[3] ? toToken(toTokenAccount(accounts[3])) : null;

      if (loadJsonMetadata) {
        try {
          const json = await metaplex
            .storage()
            .downloadJson<JsonMetadata>(metadata.uri, scope);
          metadata = { ...metadata, jsonLoaded: true, json };
        } catch (error) {
          metadata = { ...metadata, jsonLoaded: true, json: null };
        }
      }

      const isNft =
        editionAccount.exists &&
        mint.mintAuthorityAddress &&
        mint.mintAuthorityAddress.equals(editionAccount.publicKey);

      if (isNft) {
        const edition = toNftEdition(editionAccount);
        return token
          ? toNftWithToken(metadata, mint, edition, token)
          : toNft(metadata, mint, edition);
      }

      return token
        ? toSftWithToken(metadata, mint, token)
        : toSft(metadata, mint);
    },
  };
