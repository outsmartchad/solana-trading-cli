import { CandyMachinesV2Client } from './CandyMachinesV2Client';
import {
  createCandyMachineV2Operation,
  createCandyMachineV2OperationHandler,
  deleteCandyMachineV2Operation,
  deleteCandyMachineV2OperationHandler,
  findCandyMachineV2ByAddressOperation,
  findCandyMachineV2ByAddressOperationHandler,
  findCandyMachinesV2ByPublicKeyFieldOperation,
  findCandyMachinesV2ByPublicKeyFieldOperationHandler,
  findMintedNftsByCandyMachineV2Operation,
  findMintedNftsByCandyMachineV2OperationHandler,
  insertItemsToCandyMachineV2Operation,
  InsertItemsToCandyMachineV2OperationHandler,
  mintCandyMachineV2Operation,
  mintCandyMachineV2OperationHandler,
  updateCandyMachineV2Operation,
  updateCandyMachineV2OperationHandler,
} from './operations';
import type { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';

/** @group Plugins */
export const candyMachineV2Module = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    const op = metaplex.operations();
    op.register(
      createCandyMachineV2Operation,
      createCandyMachineV2OperationHandler
    );
    op.register(
      deleteCandyMachineV2Operation,
      deleteCandyMachineV2OperationHandler
    );
    op.register(
      findCandyMachineV2ByAddressOperation,
      findCandyMachineV2ByAddressOperationHandler
    );
    op.register(
      findCandyMachinesV2ByPublicKeyFieldOperation,
      findCandyMachinesV2ByPublicKeyFieldOperationHandler
    );
    op.register(
      findMintedNftsByCandyMachineV2Operation,
      findMintedNftsByCandyMachineV2OperationHandler
    );
    op.register(
      insertItemsToCandyMachineV2Operation,
      InsertItemsToCandyMachineV2OperationHandler
    );
    op.register(
      mintCandyMachineV2Operation,
      mintCandyMachineV2OperationHandler
    );
    op.register(
      updateCandyMachineV2Operation,
      updateCandyMachineV2OperationHandler
    );

    metaplex.candyMachinesV2 = function () {
      return new CandyMachinesV2Client(this);
    };
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    candyMachinesV2(): CandyMachinesV2Client;
  }
}
