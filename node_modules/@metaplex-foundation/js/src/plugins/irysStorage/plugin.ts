import { IrysOptions, IrysStorageDriver } from './IrysStorageDriver';
import { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';

export const irysStorage = (options: IrysOptions = {}): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    metaplex.storage().setDriver(new IrysStorageDriver(metaplex, options));
  },
});
