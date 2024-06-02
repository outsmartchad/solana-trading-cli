import { UmiPlugin } from '@metaplex-foundation/umi';
import { createChunkGetAccountsRpc } from './createChunkGetAccountsRpc';

export const chunkGetAccountsRpc = (chunkSize = 100): UmiPlugin => ({
  install(umi) {
    umi.rpc = createChunkGetAccountsRpc(umi.rpc, chunkSize);
  },
});
