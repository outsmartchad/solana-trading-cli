import { nftGateBeet } from '@metaplex-foundation/mpl-candy-guard';
import { GuardMintSettingsMissingError } from '../errors';
import { CandyGuardManifest } from './core';
import { createSerializerFromBeet, PublicKey } from '@/types';

/**
 * The nftGate guard restricts minting to holders
 * of a specified NFT collection.
 *
 * This means the mint address of an NFT from this
 * collection must be passed when minting.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 *
 * @see {@link NftGateGuardMintSettings} for more
 * information on the mint settings of this guard.
 */
export type NftGateGuardSettings = {
  /** The mint address of the required NFT Collection. */
  requiredCollection: PublicKey;
};

/**
 * The settings for the nftGate guard that could
 * be provided when minting from the Candy Machine.
 *
 * @see {@link NftGateGuardSettings} for more
 * information on the nftGate guard itself.
 */
export type NftGateGuardMintSettings = {
  /**
   * The mint address of an NFT from the required
   * collection that belongs to the payer.
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
export const nftGateGuardManifest: CandyGuardManifest<
  NftGateGuardSettings,
  NftGateGuardMintSettings
> = {
  name: 'nftGate',
  settingsBytes: 32,
  settingsSerializer: createSerializerFromBeet(nftGateBeet),
  mintSettingsParser: ({ metaplex, mintSettings, payer, programs }) => {
    if (!mintSettings) {
      throw new GuardMintSettingsMissingError('nftGate');
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

    return {
      arguments: Buffer.from([]),
      remainingAccounts: [
        {
          isSigner: false,
          address: tokenAccount,
          isWritable: false,
        },
        {
          isSigner: false,
          address: tokenMetadata,
          isWritable: false,
        },
      ],
    };
  },
};
