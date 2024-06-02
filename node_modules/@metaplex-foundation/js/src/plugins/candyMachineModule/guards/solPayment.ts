import { Buffer } from 'buffer';
import {
  SolPayment,
  solPaymentBeet,
} from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  createSerializerFromBeet,
  lamports,
  mapSerializer,
  PublicKey,
  SolAmount,
} from '@/types';

/**
 * The solPayment guard is used to charge an
 * amount in SOL for the minted NFT.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type SolPaymentGuardSettings = {
  /** The amount in SOL to charge for. */
  amount: SolAmount;

  /** The configured destination address to send the funds to. */
  destination: PublicKey;
};

/** @internal */
export const solPaymentGuardManifest: CandyGuardManifest<SolPaymentGuardSettings> =
  {
    name: 'solPayment',
    settingsBytes: 40,
    settingsSerializer: mapSerializer<SolPayment, SolPaymentGuardSettings>(
      createSerializerFromBeet(solPaymentBeet),
      (settings) => ({ ...settings, amount: lamports(settings.lamports) }),
      (settings) => ({ ...settings, lamports: settings.amount.basisPoints })
    ),
    mintSettingsParser: ({ settings }) => {
      return {
        arguments: Buffer.from([]),
        remainingAccounts: [
          {
            isSigner: false,
            address: settings.destination,
            isWritable: true,
          },
        ],
      };
    },
  };
