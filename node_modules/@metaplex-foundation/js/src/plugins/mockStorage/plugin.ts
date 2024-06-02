import { MockStorageDriver, MockStorageOptions } from './MockStorageDriver';
import { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';

export const mockStorage = (options?: MockStorageOptions): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    metaplex.storage().setDriver(new MockStorageDriver(options));
  },
});
