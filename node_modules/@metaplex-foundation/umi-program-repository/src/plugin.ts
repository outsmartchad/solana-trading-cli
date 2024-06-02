import { UmiPlugin } from '@metaplex-foundation/umi';
import { createDefaultProgramRepository } from './createDefaultProgramRepository';

export const defaultProgramRepository = (): UmiPlugin => ({
  install(umi) {
    umi.programs = createDefaultProgramRepository(umi);
  },
});
