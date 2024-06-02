import { DerivedIdentityClient } from './DerivedIdentityClient';
import type { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';

/** @group Plugins */
export const derivedIdentity = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    const derivedIdentityClient = new DerivedIdentityClient(metaplex);
    metaplex.derivedIdentity = () => derivedIdentityClient;
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    derivedIdentity(): DerivedIdentityClient;
  }
}
