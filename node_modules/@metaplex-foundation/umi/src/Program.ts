import type { PublicKey } from '@metaplex-foundation/umi-public-keys';
import type { Cluster } from './Cluster';
import type { ProgramError } from './errors';

/**
 * An error that contains Program logs.
 * @category Programs
 */
export type ErrorWithLogs = Error & { logs: string[] };

/**
 * An error that contains a Program error code.
 * @category Programs
 */
export type ErrorWithCode = Error & { code: number };

/**
 * Whether the given value is an instance of {@link ErrorWithLogs}.
 * @category Programs
 */
export const isErrorWithLogs = (error: unknown): error is ErrorWithLogs =>
  error instanceof Error && 'logs' in error;

/**
 * Defines a Solana Program that can be
 * registered in Umi's program repository.
 *
 * @category Programs
 */
export type Program = {
  /**
   * A unique name for the Program in camelCase.
   *
   * To avoid conflict with other organizations, it is recommended
   * to prefix the program name with a namespace that is unique to
   * your organization. For instance, Metaplex programs are prefixed
   * with `mpl` like so: `mplTokenMetadata` or `mplCandyMachine`.
   */
  name: string;

  /**
   * The public key of the program.
   */
  publicKey: PublicKey;

  /**
   * Retrieves a {@link ProgramError} from a given error code
   * or `null` if the error code is not recognized.
   */
  getErrorFromCode: (code: number, cause?: Error) => ProgramError | null;

  /**
   * Retrieves a {@link ProgramError} from a given error name
   * or `null` if the error name is not recognized.
   */
  getErrorFromName: (name: string, cause?: Error) => ProgramError | null;

  /**
   * A method that returns `true` if the program is available on the given cluster.
   *
   * If the same program is available on multiple clusters but using different public keys,
   * multiple Program instances must be registered such that the `isOnCluster` method
   * returns `true` for the appropriate cluster.
   */
  isOnCluster: (cluster: Cluster) => boolean;
};
