import type { Metaplex } from '../../Metaplex';

// Low-level modules.
import { identityModule } from '../identityModule';
import { storageModule } from '../storageModule';
import { rpcModule } from '../rpcModule';
import { operationModule } from '../operationModule';
import { programModule } from '../programModule';
import { utilsModule } from '../utilsModule';

// Default drivers.
import { guestIdentity } from '../guestIdentity';
import { irysStorage } from '../irysStorage';

// Verticals.
import { systemModule } from '../systemModule';
import { tokenModule } from '../tokenModule';
import { nftModule } from '../nftModule';
import { candyMachineV2Module } from '../candyMachineV2Module';
import { candyMachineModule } from '../candyMachineModule';
import { auctionHouseModule } from '../auctionHouseModule';

export const corePlugins = () => ({
  install(metaplex: Metaplex) {
    // Low-level modules.
    metaplex.use(identityModule());
    metaplex.use(storageModule());
    metaplex.use(rpcModule());
    metaplex.use(operationModule());
    metaplex.use(programModule());
    metaplex.use(utilsModule());

    // Default drivers.
    metaplex.use(guestIdentity());
    metaplex.use(irysStorage());

    // Verticals.
    metaplex.use(systemModule());
    metaplex.use(tokenModule());
    metaplex.use(nftModule());
    metaplex.use(candyMachineV2Module());
    metaplex.use(candyMachineModule());
    metaplex.use(auctionHouseModule());
  },
});
