import type { Metaplex } from '@/Metaplex';

export type MetaplexPlugin = {
  install(metaplex: Metaplex): void;
};
