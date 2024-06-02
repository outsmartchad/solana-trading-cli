import { nftPaymentBeet } from '@metaplex-foundation/mpl-candy-guard';
import { GuardMintSettingsMissingError } from '../errors';
import { CandyGuardManifest } from './core';
import { createSerializerFromBeet, PublicKey } from '@/types';

/**
 * The nftPayment guard allows minting by charging the
 * payer an NFT from a specified NFT collection.
 * The NFT will be transfered to a predefined destination.
 *
 * This means the mint address of the NFT to transfer must be
 * passed when minting. This guard alone does not limit how many
 * times a holder can mint. A holder can mint as many times
 * as they have NFTs from the required collection to pay with.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 *
 * @see {@link NftPaymentGuardMintSettings} for more
 * information on the mint settings of this guard.
 */
export type NftPaymentGuardSettings = {
  /** The mint address of the required NFT Collection. */
  requiredCollection: PublicKey;

  /** The address of the account to send the NFTs to. */
  destination: PublicKey;
};

/**
 * The settings for the nftPayment guard that could
 * be provided when minting from the Candy Machine.
 *
 * @see {@link NftPaymentGuardSettings} for more
 * information on the nftPayment guard itself.
 */
export type NftPaymentGuardMintSettings = {
  /**
   * The mint address of the NFT to pay with.
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
export const nftPaymentGuardManifest: CandyGuardManifest<
  NftPaymentGuardSettings,
  NftPaymentGuardMintSettings
> = {
  name: 'nftPayment',
  settingsBytes: 64,
  settingsSerializer: createSerializerFromBeet(nftPaymentBeet),
  mintSettingsParser: ({
    metaplex,
    settings,
    mintSettings,
    payer,
    programs,
  }) => {
    if (!mintSettings) {
      throw new GuardMintSettingsMissingError('nftPayment');
    }

    const associatedTokenProgram = metaplex
      .programs()
      .getAssociatedToken(programs);

    const nftTokenAccount =
      mintSettings.tokenAccount ??
      metaplex.tokens().pdas().associatedTokenAccount({
        mint: mintSettings.mint,
        owner: payer.publicKey,
        programs,
      });

    const nftMetadata = metaplex.nfts().pdas().metadata({
      mint: mintSettings.mint,
      programs,
    });

    const destinationAta = metaplex.tokens().pdas().associatedTokenAccount({
      mint: mintSettings.mint,
      owner: settings.destination,
      programs,
    });

    return {
      arguments: Buffer.from([]),
      remainingAccounts: [
        {
          isSigner: false,
          address: nftTokenAccount,
          isWritable: true,
        },
        {
          isSigner: false,
          address: nftMetadata,
          isWritable: true,
        },
        {
          isSigner: false,
          address: mintSettings.mint,
          isWritable: false,
        },
        {
          isSigner: false,
          address: settings.destination,
          isWritable: false,
        },
        {
          isSigner: false,
          address: destinationAta,
          isWritable: true,
        },
        {
          isSigner: false,
          address: associatedTokenProgram.address,
          isWritable: false,
        },
      ],
    };
  },
};
