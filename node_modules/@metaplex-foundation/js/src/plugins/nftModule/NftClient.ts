import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';
import { toMintAddress } from './helpers';
import { Nft, NftWithToken, Sft, SftWithToken } from './models';
import { NftBuildersClient } from './NftBuildersClient';
import { NftPdasClient } from './NftPdasClient';
import {
  ApproveNftCollectionAuthorityInput,
  approveNftCollectionAuthorityOperation,
  ApproveNftDelegateInput,
  approveNftDelegateOperation,
  ApproveNftUseAuthorityInput,
  approveNftUseAuthorityOperation,
  CreateCompressedNftInput,
  createCompressedNftOperation,
  CreateNftInput,
  createNftOperation,
  CreateSftInput,
  createSftOperation,
  DeleteNftInput,
  deleteNftOperation,
  FindNftByMetadataInput,
  findNftByMetadataOperation,
  FindNftByMintInput,
  findNftByMintOperation,
  FindNftByTokenInput,
  findNftByTokenOperation,
  FindNftsByCreatorInput,
  findNftsByCreatorOperation,
  FindNftsByMintListInput,
  findNftsByMintListOperation,
  FindNftsByOwnerInput,
  findNftsByOwnerOperation,
  FindNftsByUpdateAuthorityInput,
  findNftsByUpdateAuthorityOperation,
  FreezeDelegatedNftInput,
  freezeDelegatedNftOperation,
  LoadMetadataInput,
  loadMetadataOperation,
  LockNftInput,
  lockNftOperation,
  MigrateToSizedCollectionNftInput,
  migrateToSizedCollectionNftOperation,
  MintNftInput,
  mintNftOperation,
  PrintNewEditionInput,
  printNewEditionOperation,
  RevokeNftCollectionAuthorityInput,
  revokeNftCollectionAuthorityOperation,
  RevokeNftDelegateInput,
  revokeNftDelegateOperation,
  RevokeNftUseAuthorityInput,
  revokeNftUseAuthorityOperation,
  ThawDelegatedNftInput,
  thawDelegatedNftOperation,
  TransferNftInput,
  transferNftOperation,
  UnlockNftInput,
  unlockNftOperation,
  UnverifyNftCollectionInput,
  unverifyNftCollectionOperation,
  UnverifyNftCreatorInput,
  unverifyNftCreatorOperation,
  UpdateNftInput,
  updateNftOperation,
  UploadMetadataInput,
  uploadMetadataOperation,
  UseNftInput,
  useNftOperation,
  VerifyNftCollectionInput,
  verifyNftCollectionOperation,
  VerifyNftCreatorInput,
  verifyNftCreatorOperation,
} from './operations';
import {
  FindNftByAssetIdInput,
  findNftByAssetIdOperation,
} from './operations/findNftByAssetId';
import { OperationOptions } from '@/types';
import type { Metaplex } from '@/Metaplex';

/**
 * This is a client for the NFT module.
 *
 * It enables us to interact with the Token Metadata program in order to
 * manage NFTs and SFTs.
 *
 * You may access this client via the `nfts()` method of your `Metaplex` instance.
 *
 * ```ts
 * const nftClient = metaplex.nfts();
 * ```
 *
 * @example
 * You can upload some custom JSON metadata and use its URI to create
 * a new NFT like so. The owner and update authority of this NFT will,
 * by default, be the current identity of the metaplex instance.
 *
 * ```ts
 * const { uri } = await metaplex
 *   .nfts()
 *   .uploadMetadata({
 *     name: "My off-chain name",
 *     description: "My off-chain description",
 *     image: "https://arweave.net/123",
 *   };
 *
 * const { nft } = await metaplex
 *   .nfts()
 *   .create({
 *     uri,
 *     name: 'My on-chain NFT',
 *     sellerFeeBasisPoints: 250, // 2.5%
 *   };
 * ```
 *
 * @group Modules
 */
export class NftClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /**
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = metaplex.nfts().builders();
   * ```
   */
  builders() {
    return new NftBuildersClient(this.metaplex);
  }

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = metaplex.nfts().pdas();
   * ```
   */
  pdas() {
    return new NftPdasClient(this.metaplex);
  }

  // -----------------
  // Queries
  // -----------------

  /** {@inheritDoc findNftByMintOperation} */
  findByMint(input: FindNftByMintInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftByMintOperation(input), options);
  }

  /** {@inheritDoc findNftByMetadataOperation} */
  findByMetadata(input: FindNftByMetadataInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftByMetadataOperation(input), options);
  }

  /** {@inheritDoc findNftByTokenOperation} */
  findByToken(input: FindNftByTokenInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftByTokenOperation(input), options);
  }

  /** {@inheritDoc findNftsByCreatorOperation} */
  findAllByCreator(input: FindNftsByCreatorInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftsByCreatorOperation(input), options);
  }

  /** {@inheritDoc findNftsByMintListOperation} */
  findAllByMintList(
    input: FindNftsByMintListInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findNftsByMintListOperation(input), options);
  }

  /** {@inheritDoc findNftsByOwnerOperation} */
  findAllByOwner(input: FindNftsByOwnerInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftsByOwnerOperation(input), options);
  }

  /** {@inheritDoc findNftsByUpdateAuthorityOperation} */
  findAllByUpdateAuthority(
    input: FindNftsByUpdateAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(findNftsByUpdateAuthorityOperation(input), options);
  }

  /** {@inheritDoc findNftByAssetIdOperation} */
  findByAssetId(input: FindNftByAssetIdInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(findNftByAssetIdOperation(input), options);
  }

  /** {@inheritDoc loadMetadataOperation} */
  load(input: LoadMetadataInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(loadMetadataOperation(input), options);
  }

  /**
   * Helper method that refetches a given model
   * and returns an instance of the same type.
   *
   * ```ts
   * nft = await metaplex.nfts().refresh(nft);
   * sft = await metaplex.nfts().refresh(sft);
   * nftWithToken = await metaplex.nfts().refresh(nftWithToken);
   * ```
   */
  refresh<
    T extends Nft | Sft | NftWithToken | SftWithToken | Metadata | PublicKey
  >(
    model: T,
    input?: Omit<
      FindNftByMintInput,
      'mintAddress' | 'tokenAddress' | 'tokenOwner'
    >,
    options?: OperationOptions
  ): Promise<T extends Metadata | PublicKey ? Nft | Sft : T> {
    return this.findByMint(
      {
        mintAddress: toMintAddress(model),
        tokenAddress: 'token' in model ? model.token.address : undefined,
        ...input,
      },
      options
    ) as Promise<T extends Metadata | PublicKey ? Nft | Sft : T>;
  }

  // -----------------
  // Create, Update and Delete
  // -----------------

  /** {@inheritDoc createNftOperation} */
  create(input: CreateNftInput, options?: OperationOptions) {
    if (input?.tree)
      return this.metaplex
        .operations()
        .execute(
          createCompressedNftOperation(input as CreateCompressedNftInput),
          options
        );
    return this.metaplex
      .operations()
      .execute(createNftOperation(input), options);
  }

  /** {@inheritDoc createSftOperation} */
  createSft(input: CreateSftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(createSftOperation(input), options);
  }

  /** {@inheritDoc printNewEditionOperation} */
  printNewEdition(input: PrintNewEditionInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(printNewEditionOperation(input), options);
  }

  /** {@inheritDoc uploadMetadataOperation} */
  uploadMetadata(input: UploadMetadataInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(uploadMetadataOperation(input), options);
  }

  /** {@inheritDoc updateNftOperation} */
  update(input: UpdateNftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(updateNftOperation(input), options);
  }

  /** {@inheritDoc deleteNftOperation} */
  delete(input: DeleteNftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(deleteNftOperation(input), options);
  }

  // -----------------
  // Delegates
  // -----------------

  /** {@inheritDoc approveNftDelegateOperation} */
  delegate(input: ApproveNftDelegateInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(approveNftDelegateOperation(input), options);
  }

  /** {@inheritDoc revokeNftDelegateOperation} */
  revoke(input: RevokeNftDelegateInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(revokeNftDelegateOperation(input), options);
  }

  // -----------------
  // Use
  // -----------------

  /** {@inheritDoc useNftOperation} */
  use(input: UseNftInput, options?: OperationOptions) {
    return this.metaplex.operations().execute(useNftOperation(input), options);
  }

  /** {@inheritDoc approveNftUseAuthorityOperation} */
  approveUseAuthority(
    input: ApproveNftUseAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(approveNftUseAuthorityOperation(input), options);
  }

  /** {@inheritDoc revokeNftUseAuthorityOperation} */
  revokeUseAuthority(
    input: RevokeNftUseAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(revokeNftUseAuthorityOperation(input), options);
  }

  // -----------------
  // Creators
  // -----------------

  /** {@inheritDoc verifyNftCreatorOperation} */
  verifyCreator(input: VerifyNftCreatorInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(verifyNftCreatorOperation(input), options);
  }

  /** {@inheritDoc unverifyNftCreatorOperation} */
  unverifyCreator(input: UnverifyNftCreatorInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(unverifyNftCreatorOperation(input), options);
  }

  // -----------------
  // Collections
  // -----------------

  /** {@inheritDoc verifyNftCollectionOperation} */
  verifyCollection(
    input: VerifyNftCollectionInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(verifyNftCollectionOperation(input), options);
  }

  /** {@inheritDoc unverifyNftCollectionOperation} */
  unverifyCollection(
    input: UnverifyNftCollectionInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(unverifyNftCollectionOperation(input), options);
  }

  /** {@inheritDoc approveNftCollectionAuthorityOperation} */
  approveCollectionAuthority(
    input: ApproveNftCollectionAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(approveNftCollectionAuthorityOperation(input), options);
  }

  /** {@inheritDoc revokeNftCollectionAuthorityOperation} */
  revokeCollectionAuthority(
    input: RevokeNftCollectionAuthorityInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(revokeNftCollectionAuthorityOperation(input), options);
  }

  /** {@inheritDoc migrateToSizedCollectionNftOperation} */
  migrateToSizedCollection(
    input: MigrateToSizedCollectionNftInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(migrateToSizedCollectionNftOperation(input), options);
  }

  // -----------------
  // Programmables
  // -----------------

  /** {@inheritDoc lockNftOperation} */
  lock(input: LockNftInput, options?: OperationOptions) {
    return this.metaplex.operations().execute(lockNftOperation(input), options);
  }

  /** {@inheritDoc unlockNftOperation} */
  unlock(input: UnlockNftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(unlockNftOperation(input), options);
  }

  // -----------------
  // Tokens
  // -----------------

  /** {@inheritDoc mintNftOperation} */
  mint(input: MintNftInput, options?: OperationOptions) {
    return this.metaplex.operations().execute(mintNftOperation(input), options);
  }

  /** {@inheritDoc transferNftOperation} */
  transfer(input: TransferNftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(transferNftOperation(input), options);
  }

  /** {@inheritDoc freezeDelegatedNftOperation} */
  freezeDelegatedNft(
    input: FreezeDelegatedNftInput,
    options?: OperationOptions
  ) {
    return this.metaplex
      .operations()
      .execute(freezeDelegatedNftOperation(input), options);
  }

  /** {@inheritDoc thawDelegatedNftOperation} */
  thawDelegatedNft(input: ThawDelegatedNftInput, options?: OperationOptions) {
    return this.metaplex
      .operations()
      .execute(thawDelegatedNftOperation(input), options);
  }
}
