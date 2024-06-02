import { PROGRAM_ID } from '@metaplex-foundation/mpl-candy-machine';
import { CandyMachineV2GpaBuilder } from './gpaBuilders';
import { Metaplex } from '@/Metaplex';

/** @group Programs */
export const CandyMachineV2Program = {
  publicKey: PROGRAM_ID,

  accounts(metaplex: Metaplex) {
    return new CandyMachineV2GpaBuilder(metaplex, this.publicKey);
  },
};
