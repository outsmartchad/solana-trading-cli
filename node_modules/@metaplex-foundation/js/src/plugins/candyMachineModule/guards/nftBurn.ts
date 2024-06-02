import { nftBurnBeet } from '@metaplex-foundation/mpl-candy-guard';
import { GuardMintSettingsMissingError } from '../errors';
import { CandyGuardManifest } from './core';
import { createSerializerFromBeet, PublicKey } from '@/types';

/**
 * The nftBurn guard restricts the mint to holders of a predefined
 * NFT Collection and burns the holder's NFT when minting.
 *
 * This means the mint address of the NFT to burn must be
 * passed when minting. This guard alone does not limit how many
 * times a holder can mint. A holder can mint as many times
 * as they have NFTs from the required collection to burn.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 *
 * @see {@link NftBurnGuardMintSettings} for more
 * information on the mint settings of this guard.
 */
export type NftBurnGuardSettings = {
  /** The mint address of the required NFT Collection. */
  requiredCollection: PublicKey;
};

/**
 * The settings for the nftBurn guard that could
 * be provided when minting from the Candy Machine.
 *
 * @see {@link NftBurnGuardSettings} for more
 * information on the nftBurn guard itself.
 */
export type NftBurnGuardMintSettings = {
  /**
   * The mint address of the NFT to burn.
   * This must be part of the required collection and must
   * belong to the payer.
   */
  mint: PublicKey;

  /**
   * The token account linking the NFT with its owner.
   *
   * @defaultValue
   * Defaults to the associated token address using the
   * mint address of the NFT and the payer's address.
   */
  tokenAccount?: PublicKey;
};

/** @internal */
export const nftBurnGuardManifest: CandyGuardManifest<
  NftBurnGuardSettings,
  NftBurnGuardMintSettings
> = {
  name: 'nftBurn',
  settingsBytes: 32,
  settingsSerializer: createSerializerFromBeet(nftBurnBeet),
  mintSettingsParser: ({
    metaplex,
    settings,
    mintSettings,
    payer,
    programs,
  }) => {
    if (!mintSettings) {
      throw new GuardMintSettingsMissingError('nftBurn');
    }

    const tokenAccount =
      mintSettings.tokenAccount ??
      metaplex.tokens().pdas().associatedTokenAccount({
        mint: mintSettings.mint,
        owner: payer.publicKey,
        programs,
      });

    const tokenMetadata = metaplex.nfts().pdas().metadata({
      mint: mintSettings.mint,
      programs,
    });

    const tokenEdition = metaplex.nfts().pdas().masterEdition({
      mint: mintSettings.mint,
      programs,
    });

    const mintCollectionMetadata = metaplex.nfts().pdas().metadata({
      mint: settings.requiredCollection,
      programs,
    });

    return {
      arguments: Buffer.from([]),
      remainingAccounts: [
        {
          isSigner: false,
          address: tokenAccount,
          isWritable: true,
        },
        {
          isSigner: false,
          address: tokenMetadata,
          isWritable: true,
        },
        {
          isSigner: false,
          address: tokenEdition,
          isWritable: true,
        },
        {
          isSigner: false,
          address: mintSettings.mint,
          isWritable: true,
        },
        {
          isSigner: false,
          address: mintCollectionMetadata,
          isWritable: true,
        },
      ],
    };
  },
};
