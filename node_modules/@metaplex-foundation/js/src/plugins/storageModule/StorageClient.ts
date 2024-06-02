import fetch, { RequestInit } from 'node-fetch';
import {
  getBytesFromMetaplexFiles,
  MetaplexFile,
  toMetaplexFile,
  toMetaplexFileFromJson,
} from './MetaplexFile';
import { StorageDownloadOptions, StorageDriver } from './StorageDriver';
import { Amount, HasDriver } from '@/types';
import { DriverNotProvidedError, InvalidJsonStringError } from '@/errors';

/**
 * @group Modules
 */
export class StorageClient implements HasDriver<StorageDriver> {
  private _driver: StorageDriver | null = null;

  driver(): StorageDriver {
    if (!this._driver) {
      throw new DriverNotProvidedError('StorageDriver');
    }

    return this._driver;
  }

  setDriver(newDriver: StorageDriver): void {
    this._driver = newDriver;
  }

  getUploadPriceForBytes(bytes: number): Promise<Amount> {
    return this.driver().getUploadPrice(bytes);
  }

  getUploadPriceForFile(file: MetaplexFile): Promise<Amount> {
    return this.getUploadPriceForFiles([file]);
  }

  getUploadPriceForFiles(files: MetaplexFile[]): Promise<Amount> {
    const driver = this.driver();

    return driver.getUploadPriceForFiles
      ? driver.getUploadPriceForFiles(files)
      : this.getUploadPriceForBytes(getBytesFromMetaplexFiles(...files));
  }

  upload(file: MetaplexFile): Promise<string> {
    return this.driver().upload(file);
  }

  uploadAll(files: MetaplexFile[]): Promise<string[]> {
    const driver = this.driver();

    return driver.uploadAll
      ? driver.uploadAll(files)
      : Promise.all(files.map((file) => this.driver().upload(file)));
  }

  uploadJson<T extends object = object>(json: T): Promise<string> {
    return this.upload(toMetaplexFileFromJson<T>(json));
  }

  async download(
    uri: string,
    options?: StorageDownloadOptions
  ): Promise<MetaplexFile> {
    const driver = this.driver();

    if (driver.download) {
      return driver.download(uri, options);
    }

    const response = await fetch(uri, options as RequestInit);
    const buffer = await response.arrayBuffer();

    return toMetaplexFile(buffer, uri);
  }

  async downloadJson<T extends object = object>(
    uri: string,
    options?: StorageDownloadOptions
  ): Promise<T> {
    const file = await this.download(uri, options);

    try {
      return JSON.parse(file.buffer.toString());
    } catch (error) {
      throw new InvalidJsonStringError(error as Error);
    }
  }
}
