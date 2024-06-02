import { UmiPlugin } from '@metaplex-foundation/umi';
import { createFetchHttp } from './createFetchHttp';

export const fetchHttp = (): UmiPlugin => ({
  install(umi) {
    umi.http = createFetchHttp();
  },
});
