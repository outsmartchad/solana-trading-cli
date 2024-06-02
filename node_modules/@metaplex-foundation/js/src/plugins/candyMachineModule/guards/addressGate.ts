import { addressGateBeet } from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import { createSerializerFromBeet, PublicKey } from '@/types';

/**
 * The addressGate guard restricts the mint to a single
 * address which must match the minting wallet's address.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type AddressGateGuardSettings = {
  /** The only address that is allowed to mint from the Candy Machine. */
  address: PublicKey;
};

/** @internal */
export const addressGateGuardManifest: CandyGuardManifest<AddressGateGuardSettings> =
  {
    name: 'addressGate',
    settingsBytes: 32,
    settingsSerializer: createSerializerFromBeet(addressGateBeet),
  };
