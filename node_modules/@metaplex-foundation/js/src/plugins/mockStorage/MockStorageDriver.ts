import { MetaplexFile, StorageDriver } from '../storageModule';
import { Amount, BigNumber, lamports, toBigNumber } from '@/types';
import { AssetNotFoundError } from '@/errors';

const DEFAULT_BASE_URL = 'https://mockstorage.example.com/';
const DEFAULT_COST_PER_BYTE = 1;

export type MockStorageOptions = {
  baseUrl?: string;
  costPerByte?: BigNumber | number;
};

export class MockStorageDriver implements StorageDriver {
  protected cache: Record<string, MetaplexFile> = {};
  public readonly baseUrl: string;
  public readonly costPerByte: BigNumber;

  constructor(options?: MockStorageOptions) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this.costPerByte = toBigNumber(
      options?.costPerByte != null
        ? options?.costPerByte
        : DEFAULT_COST_PER_BYTE
    );
  }

  async getUploadPrice(bytes: number): Promise<Amount> {
    return lamports(this.costPerByte.muln(bytes));
  }

  async upload(file: MetaplexFile): Promise<string> {
    const uri = `${this.baseUrl}${file.uniqueName}`;
    this.cache[uri] = file;

    return uri;
  }

  async download(uri: string): Promise<MetaplexFile> {
    const file = this.cache[uri];

    if (!file) {
      throw new AssetNotFoundError(uri);
    }

    return file;
  }
}
