import { UmiPlugin } from '@metaplex-foundation/umi';
import { createHttpDownloader } from './createHttpDownloader';

export const httpDownloader = (): UmiPlugin => ({
  install(umi) {
    umi.downloader = createHttpDownloader(umi);
  },
});
