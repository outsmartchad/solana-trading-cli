import { ProgramClient } from '../programModule';
import { CandyMachineClient } from './CandyMachineClient';
import {
  addressGateGuardManifest,
  allowListGuardManifest,
  botTaxGuardManifest,
  endDateGuardManifest,
  gatekeeperGuardManifest,
  mintLimitGuardManifest,
  nftBurnGuardManifest,
  nftGateGuardManifest,
  nftPaymentGuardManifest,
  programGateGuardManifest,
  redeemedAmountGuardManifest,
  solPaymentGuardManifest,
  startDateGuardManifest,
  thirdPartySignerGuardManifest,
  tokenBurnGuardManifest,
  tokenGateGuardManifest,
  tokenPaymentGuardManifest,
} from './guards';
import {
  CallCandyGuardRouteOperation,
  callCandyGuardRouteOperation,
  callCandyGuardRouteOperationHandler,
  createCandyGuardOperation,
  createCandyGuardOperationHandler,
  createCandyMachineOperation,
  createCandyMachineOperationHandler,
  deleteCandyGuardOperation,
  deleteCandyGuardOperationHandler,
  deleteCandyMachineOperation,
  deleteCandyMachineOperationHandler,
  findCandyGuardByAddressOperation,
  findCandyGuardByAddressOperationHandler,
  findCandyGuardsByAuthorityOperation,
  findCandyGuardsByAuthorityOperationHandler,
  findCandyMachineByAddressOperation,
  findCandyMachineByAddressOperationHandler,
  insertCandyMachineItemsOperation,
  insertCandyMachineItemsOperationHandler,
  mintFromCandyMachineOperation,
  mintFromCandyMachineOperationHandler,
  unwrapCandyGuardOperation,
  unwrapCandyGuardOperationHandler,
  updateCandyGuardOperation,
  updateCandyGuardOperationHandler,
  updateCandyMachineOperation,
  updateCandyMachineOperationHandler,
  wrapCandyGuardOperation,
  wrapCandyGuardOperationHandler,
} from './operations';
import {
  CandyGuardProgram,
  candyMachineProgram,
  defaultCandyGuardProgram,
  gatewayProgram,
} from './programs';
import {
  updateCandyGuardAuthorityOperation,
  updateCandyGuardAuthorityOperationHandler,
} from './operations/updateCandyGuardAuthority';
import { freezeSolPaymentGuardManifest } from './guards/freezeSolPayment';
import { freezeTokenPaymentGuardManifest } from './guards/freezeTokenPayment';
import { MetaplexPlugin, OperationConstructor, Program } from '@/types';
import type { Metaplex } from '@/Metaplex';

/** @group Plugins */
export const candyMachineModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    // Client.
    const client = new CandyMachineClient(metaplex);
    metaplex.candyMachines = () => client;

    // Candy Machine Program.
    metaplex.programs().register(candyMachineProgram);
    metaplex.programs().getCandyMachine = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(candyMachineProgram.name, programs);
    };

    // Candy Guard Program.
    metaplex.programs().register(defaultCandyGuardProgram);
    metaplex.programs().getCandyGuard = function <T extends CandyGuardProgram>(
      this: ProgramClient,
      programs?: Program[]
    ): T {
      return this.get(defaultCandyGuardProgram.name, programs);
    };

    // Gateway Program.
    metaplex.programs().register(gatewayProgram);
    metaplex.programs().getGateway = function (
      this: ProgramClient,
      programs?: Program[]
    ) {
      return this.get(gatewayProgram.name, programs);
    };

    // Default Guards.
    client.guards().register(botTaxGuardManifest);
    client.guards().register(solPaymentGuardManifest);
    client.guards().register(tokenPaymentGuardManifest);
    client.guards().register(startDateGuardManifest);
    client.guards().register(thirdPartySignerGuardManifest);
    client.guards().register(tokenGateGuardManifest);
    client.guards().register(gatekeeperGuardManifest);
    client.guards().register(endDateGuardManifest);
    client.guards().register(allowListGuardManifest);
    client.guards().register(mintLimitGuardManifest);
    client.guards().register(nftPaymentGuardManifest);
    client.guards().register(redeemedAmountGuardManifest);
    client.guards().register(addressGateGuardManifest);
    client.guards().register(nftGateGuardManifest);
    client.guards().register(nftBurnGuardManifest);
    client.guards().register(tokenBurnGuardManifest);
    client.guards().register(freezeSolPaymentGuardManifest);
    client.guards().register(freezeTokenPaymentGuardManifest);
    client.guards().register(programGateGuardManifest);

    // Operations.
    const op = metaplex.operations();
    op.register(
      callCandyGuardRouteOperation as OperationConstructor<
        CallCandyGuardRouteOperation<any>
      >,
      callCandyGuardRouteOperationHandler
    );
    op.register(createCandyGuardOperation, createCandyGuardOperationHandler);
    op.register(
      createCandyMachineOperation,
      createCandyMachineOperationHandler
    );
    op.register(deleteCandyGuardOperation, deleteCandyGuardOperationHandler);
    op.register(
      deleteCandyMachineOperation,
      deleteCandyMachineOperationHandler
    );
    op.register(
      findCandyGuardByAddressOperation,
      findCandyGuardByAddressOperationHandler
    );
    op.register(
      findCandyGuardsByAuthorityOperation,
      findCandyGuardsByAuthorityOperationHandler
    );
    op.register(
      findCandyMachineByAddressOperation,
      findCandyMachineByAddressOperationHandler
    );
    op.register(
      insertCandyMachineItemsOperation,
      insertCandyMachineItemsOperationHandler
    );
    op.register(
      mintFromCandyMachineOperation,
      mintFromCandyMachineOperationHandler
    );
    op.register(unwrapCandyGuardOperation, unwrapCandyGuardOperationHandler);
    op.register(
      updateCandyGuardAuthorityOperation,
      updateCandyGuardAuthorityOperationHandler
    );
    op.register(updateCandyGuardOperation, updateCandyGuardOperationHandler);
    op.register(
      updateCandyMachineOperation,
      updateCandyMachineOperationHandler
    );
    op.register(wrapCandyGuardOperation, wrapCandyGuardOperationHandler);
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    candyMachines(): CandyMachineClient;
  }
}

declare module '../programModule/ProgramClient' {
  interface ProgramClient {
    getCandyMachine(programs?: Program[]): Program;
    getCandyGuard<T extends CandyGuardProgram>(programs?: Program[]): T;
    getGateway(programs?: Program[]): Program;
  }
}
