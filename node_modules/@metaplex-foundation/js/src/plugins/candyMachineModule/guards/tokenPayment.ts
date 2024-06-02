import { Buffer } from 'buffer';
import {
  TokenPayment,
  tokenPaymentBeet,
} from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  createSerializerFromBeet,
  mapSerializer,
  PublicKey,
  SplTokenAmount,
  token,
} from '@/types';

/**
 * The tokenPayment guard allows minting by charging the
 * payer a specific amount of tokens from a certain mint acount.
 * The tokens will be transfered to a predefined destination.
 *
 * This guard alone does not limit how many times a holder
 * can mint. A holder can mint as many times as they have
 * the required amount of tokens to pay with.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type TokenPaymentGuardSettings = {
  /** The mint address of the required tokens. */
  mint: PublicKey;

  /** The amount of tokens required to mint an NFT. */
  amount: SplTokenAmount;

  /** The associated token address to send the tokens to. */
  destinationAta: PublicKey;
};

/** @internal */
export const tokenPaymentGuardManifest: CandyGuardManifest<TokenPaymentGuardSettings> =
  {
    name: 'tokenPayment',
    settingsBytes: 72,
    settingsSerializer: mapSerializer<TokenPayment, TokenPaymentGuardSettings>(
      createSerializerFromBeet(tokenPaymentBeet),
      (settings) => ({
        mint: settings.mint,
        amount: token(settings.amount),
        destinationAta: settings.destinationAta,
      }),
      (settings) => ({
        mint: settings.mint,
        amount: settings.amount.basisPoints,
        destinationAta: settings.destinationAta,
      })
    ),
    mintSettingsParser: ({ metaplex, settings, payer, programs }) => {
      const tokenAddress = metaplex.tokens().pdas().associatedTokenAccount({
        mint: settings.mint,
        owner: payer.publicKey,
        programs,
      });

      return {
        arguments: Buffer.from([]),
        remainingAccounts: [
          {
            isSigner: false,
            address: tokenAddress,
            isWritable: true,
          },
          {
            isSigner: false,
            address: settings.destinationAta,
            isWritable: true,
          },
        ],
      };
    },
  };
