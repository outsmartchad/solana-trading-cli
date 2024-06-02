import { OperationClient } from './OperationClient';
import type { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';

/** @group Plugins */
export const operationModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    const operationClient = new OperationClient(metaplex);
    metaplex.operations = () => operationClient;
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    operations(): OperationClient;
  }
}
