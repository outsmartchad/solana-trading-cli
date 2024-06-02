import { StartDate, startDateBeet } from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  createSerializerFromBeet,
  DateTime,
  mapSerializer,
  toDateTime,
} from '@/types';

/**
 * The startDate guard determines the start date of the mint.
 * Before this date, minting is not allowed.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type StartDateGuardSettings = {
  /** The date before which minting is not yet possible. */
  date: DateTime;
};

/** @internal */
export const startDateGuardManifest: CandyGuardManifest<StartDateGuardSettings> =
  {
    name: 'startDate',
    settingsBytes: 8,
    settingsSerializer: mapSerializer<StartDate, StartDateGuardSettings>(
      createSerializerFromBeet(startDateBeet),
      (settings) => ({ date: toDateTime(settings.date) }),
      (settings) => settings
    ),
  };
