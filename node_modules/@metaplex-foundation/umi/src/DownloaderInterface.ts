import { InterfaceImplementationMissingError } from './errors';
import type { GenericAbortSignal } from './GenericAbortSignal';
import type { GenericFile } from './GenericFile';

/**
 * Defines the interface for a downloader.
 * It allows us to fetch files from given URIs.
 *
 * @category Context and Interfaces
 */
export interface DownloaderInterface {
  /** Downloads multiple files from a list of URIs. */
  download: (
    uris: string[],
    options?: DownloaderOptions
  ) => Promise<GenericFile[]>;

  /** Downloads and parses a JSON file from a given URI. */
  downloadJson: <T>(uri: string, options?: DownloaderOptions) => Promise<T>;
}

/**
 * Defines the options that can be passed when downloading files. *
 * @category Storage
 */
export type DownloaderOptions = {
  /** An abort signal to cancel the download. */
  signal?: GenericAbortSignal;
};

/**
 * An implementation of the {@link DownloaderInterface} that throws an error when called.
 * @category Storage
 */
export function createNullDownloader(): DownloaderInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError(
      'DownloaderInterface',
      'downloader'
    );
  };
  return { download: errorHandler, downloadJson: errorHandler };
}
