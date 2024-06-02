import {
  RedeemedAmount,
  redeemedAmountBeet,
} from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  BigNumber,
  createSerializerFromBeet,
  mapSerializer,
  toBigNumber,
} from '@/types';

/**
 * The redeemedAmount guard forbids minting when the
 * number of minted NFTs for the entire Candy Machine
 * reaches the configured maximum amount.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type RedeemedAmountGuardSettings = {
  /** The maximum amount of NFTs that can be minted using that guard. */
  maximum: BigNumber;
};

/** @internal */
export const redeemedAmountGuardManifest: CandyGuardManifest<RedeemedAmountGuardSettings> =
  {
    name: 'redeemedAmount',
    settingsBytes: 8,
    settingsSerializer: mapSerializer<
      RedeemedAmount,
      RedeemedAmountGuardSettings
    >(
      createSerializerFromBeet(redeemedAmountBeet),
      (settings) => ({ maximum: toBigNumber(settings.maximum) }),
      (settings) => settings
    ),
  };
