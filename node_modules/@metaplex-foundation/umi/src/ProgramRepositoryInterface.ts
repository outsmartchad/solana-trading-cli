import type {
  PublicKey,
  PublicKeyInput,
} from '@metaplex-foundation/umi-public-keys';
import type { ClusterFilter } from './Cluster';
import type { ErrorWithLogs, Program } from './Program';
import type { Transaction } from './Transaction';
import { InterfaceImplementationMissingError, ProgramError } from './errors';

/**
 * Defines the interface for a program repository.
 * It allows us to register and retrieve programs when needed.
 *
 * @category Context and Interfaces
 */
export interface ProgramRepositoryInterface {
  /**
   * Whether a given program is registered in the repository.
   *
   * @param identifier The name or public key of the program to check.
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   */
  has(identifier: string | PublicKey, clusterFilter?: ClusterFilter): boolean;

  /**
   * Gets a program from the repository.
   * Throws an error if the program is not found.
   *
   * @param identifier The name or public key of the program to retrieve.
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   * @typeParam T - The type of the program to retrieve. Defaults to `Program`.
   */
  get<T extends Program = Program>(
    identifier: string | PublicKey,
    clusterFilter?: ClusterFilter
  ): T;

  /**
   * Gets the public key of a program from the repository,
   * with an optional fallback public key.
   *
   * Throws an error if the program is not found and no fallback is provided.
   *
   * @param identifier The name or public key of the program to retrieve.
   * @param fallback The fallback public key to use if the program is not found.
   * Defaults to not using a fallback public key.
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   */
  getPublicKey(
    identifier: string | PublicKey,
    fallback?: PublicKeyInput,
    clusterFilter?: ClusterFilter
  ): PublicKey;

  /**
   * Gets all programs from the repository matching the given cluster filter.
   * Defaults to getting all programs from the current cluster.
   *
   * @param clusterFilter The cluster filter to apply. Defaults to `"current"`.
   */
  all(clusterFilter?: ClusterFilter): Program[];

  /**
   * Registers a new program in the repository.
   *
   * @param program The program to register.
   * @param overrides Whether to register and prioritize
   * the given program even if a program with the same
   * public key already exists. Defaults to `true`.
   */
  add(program: Program, overrides?: boolean): void;

  /**
   * Creates a binding between a name and a program identifier.
   * This can be used to create redirections or aliases when resolving programs.
   *
   * @param abstract The name of the binding.
   * @param concrete The identifier this binding should resolve to.
   */
  bind(abstract: string, concrete: string | PublicKey): void;

  /**
   * Removes a binding using its name.
   *
   * @param abstract The name of the binding to remove.
   */
  unbind(abstract: string): void;

  /**
   * Creates a cloned instance of the repository.
   *
   * @returns A new repository instance with the same programs and bindings.
   */
  clone(): ProgramRepositoryInterface;

  /**
   * Resolves a custom program error from a transaction error.
   *
   * @param error The raw error to resolve containing the program logs.
   * @param transaction The transaction that caused the error.
   * @returns The resolved program error, or `null` if the error cannot be resolved.
   */
  resolveError(
    error: ErrorWithLogs,
    transaction: Transaction
  ): ProgramError | null;
}

/**
 * An implementation of the {@link ProgramRepositoryInterface} that throws an error when called.
 * @category Programs
 */
export function createNullProgramRepository(): ProgramRepositoryInterface {
  const errorHandler = () => {
    throw new InterfaceImplementationMissingError(
      'ProgramRepositoryInterface',
      'programs'
    );
  };
  return {
    has: errorHandler,
    get: errorHandler,
    getPublicKey: errorHandler,
    all: errorHandler,
    add: errorHandler,
    bind: errorHandler,
    unbind: errorHandler,
    clone: errorHandler,
    resolveError: errorHandler,
  };
}
