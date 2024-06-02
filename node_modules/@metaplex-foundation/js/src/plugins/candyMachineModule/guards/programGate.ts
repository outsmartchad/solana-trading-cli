import { programGateBeet } from '@metaplex-foundation/mpl-candy-guard';
import * as beet from '@metaplex-foundation/beet';
import { MaximumOfFiveAdditionalProgramsError } from '../errors';
import { CandyGuardManifest } from './core';
import { PublicKey } from '@/types';

/**
 * The programGate guard restricts the programs that can be invoked within
 * the mint transaction. It allows the necessary programs for the mint
 * instruction to work and any other program specified in the configuration.
 *
 * This object defines the settings that should be
 * provided when creating and/or updating a Candy
 * Machine if you wish to enable this guard.
 */
export type ProgramGateGuardSettings = {
  /**
   * An array of additional programs that can be invoked in a mint transaction.
   *
   * These programs are in addition to the mandatory programs that
   * are required for the mint instruction to work. Providing an empty
   * array is equivalent to only authorising the mandatory programs.
   *
   * The mandatory programs are:
   * - Candy Machine
   * - System Program
   * - SPL Token
   * - SPL ASsociated Token Account
   */
  additional: PublicKey[];
};

const MAXIMUM_SIZE = 5;
const SETTINGS_BYTES = 4 + MAXIMUM_SIZE * 32;

/** @internal */
export const programGateGuardManifest: CandyGuardManifest<ProgramGateGuardSettings> =
  {
    name: 'programGate',
    settingsBytes: SETTINGS_BYTES,
    settingsSerializer: {
      description: programGateBeet.description,
      serialize: (value: ProgramGateGuardSettings) => {
        // Maximum of 5 additional programs allowed.
        if (value.additional.length >= MAXIMUM_SIZE) {
          throw new MaximumOfFiveAdditionalProgramsError();
        }

        // Create buffer with beet.
        const fixedBeet = programGateBeet.toFixedFromValue(value);
        const writer = new beet.BeetWriter(fixedBeet.byteSize);
        writer.write(fixedBeet, value);

        // Create 164 byte buffer and fill with previous buffer.
        // This allows for < 5 additional programs.
        const bufferFullSize = Buffer.alloc(SETTINGS_BYTES);
        bufferFullSize.fill(writer.buffer);

        return bufferFullSize;
      },
      deserialize: (buffer: Buffer, offset?: number) => {
        const fixedBeet = programGateBeet.toFixedFromData(buffer, offset ?? 0);
        const reader = new beet.BeetReader(buffer, offset ?? 0);
        const value = reader.read(fixedBeet);
        return [value, reader.offset];
      },
    },
  };
