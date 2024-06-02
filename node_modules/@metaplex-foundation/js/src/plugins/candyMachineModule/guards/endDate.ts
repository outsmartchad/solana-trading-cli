import { EndDate, endDateBeet } from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';
import {
  createSerializerFromBeet,
  DateTime,
  mapSerializer,
  toDateTime,
} from '@/types';

/**
 * The endDate guard is used to specify a date to end the mint.
 * Any transaction received after the end date will fail.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type EndDateGuardSettings = {
  /** The date after which minting is no longer possible. */
  date: DateTime;
};

/** @internal */
export const endDateGuardManifest: CandyGuardManifest<EndDateGuardSettings> = {
  name: 'endDate',
  settingsBytes: 8,
  settingsSerializer: mapSerializer<EndDate, EndDateGuardSettings>(
    createSerializerFromBeet(endDateBeet),
    (settings) => ({ date: toDateTime(settings.date) }),
    (settings) => settings
  ),
};
