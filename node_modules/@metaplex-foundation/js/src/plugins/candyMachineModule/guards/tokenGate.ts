import { TokenGate, tokenGateBeet } from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  createSerializerFromBeet,
  mapSerializer,
  PublicKey,
  SplTokenAmount,
  token,
} from '@/types';

/**
 * The tokenGate guard restricts minting to token holders
 * of a specified mint account. The `amount` determines
 * how many tokens are required.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type TokenGateGuardSettings = {
  /** The mint address of the required tokens. */
  mint: PublicKey;

  /** The amount of tokens required to mint an NFT. */
  amount: SplTokenAmount;
};

/** @internal */
export const tokenGateGuardManifest: CandyGuardManifest<TokenGateGuardSettings> =
  {
    name: 'tokenGate',
    settingsBytes: 40,
    settingsSerializer: mapSerializer<TokenGate, TokenGateGuardSettings>(
      createSerializerFromBeet(tokenGateBeet),
      (settings) => ({ ...settings, amount: token(settings.amount) }),
      (settings) => ({ ...settings, amount: settings.amount.basisPoints })
    ),
    mintSettingsParser: ({ metaplex, settings, payer, programs }) => {
      const tokenAccount = metaplex.tokens().pdas().associatedTokenAccount({
        mint: settings.mint,
        owner: payer.publicKey,
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
        ],
      };
    },
  };
