import { RequestInit } from 'node-fetch';
import { MetaplexFile } from './MetaplexFile';
import { Amount } from '@/types';

export type StorageDriver = {
  getUploadPrice: (bytes: number) => Promise<Amount>;
  upload: (file: MetaplexFile) => Promise<string>;
  uploadAll?: (files: MetaplexFile[]) => Promise<string[]>;
  download?: (
    uri: string,
    options?: StorageDownloadOptions
  ) => Promise<MetaplexFile>;
  getUploadPriceForFiles?: (files: MetaplexFile[]) => Promise<Amount>;
};

export type StorageDownloadOptions = Omit<RequestInit, 'signal'> & {
  signal?: AbortSignal | null;
};
