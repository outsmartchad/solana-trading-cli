import {
  Cluster,
  ClusterFilter,
  Context,
  ErrorWithLogs,
  isPublicKey,
  Program,
  ProgramError,
  ProgramRepositoryInterface,
  publicKey,
  PublicKey,
  PublicKeyInput,
  Transaction,
} from '@metaplex-foundation/umi';
import {
  ProgramErrorNotRecognizedError,
  ProgramNotRecognizedError,
} from './errors';

export function createDefaultProgramRepository(
  context: Pick<Context, 'rpc'>,
  initialPrograms: Program[] = [],
  initialBindings: Record<string, string | PublicKey> = {}
): ProgramRepositoryInterface {
  const programs: Program[] = [...initialPrograms];
  const bindings: Record<string, string | PublicKey> = { ...initialBindings };

  const has = (
    identifier: string | PublicKey,
    clusterFilter: ClusterFilter = 'current'
  ): boolean => {
    const programs = all(clusterFilter);
    const resolvedIdentifier = resolveBinding(identifier);
    return isPublicKey(resolvedIdentifier)
      ? programs.some((p) => p.publicKey === resolvedIdentifier)
      : programs.some((p) => p.name === resolvedIdentifier);
  };

  const get = <T extends Program = Program>(
    identifier: string | PublicKey,
    clusterFilter: ClusterFilter = 'current'
  ): T => {
    const cluster = resolveClusterFilter(clusterFilter);
    const programs = all(clusterFilter);
    const resolvedIdentifier = resolveBinding(identifier);
    const program = isPublicKey(resolvedIdentifier)
      ? programs.find((p) => p.publicKey === resolvedIdentifier)
      : programs.find((p) => p.name === resolvedIdentifier);

    if (!program) {
      throw new ProgramNotRecognizedError(resolvedIdentifier, cluster);
    }

    return program as T;
  };

  const getPublicKey = (
    identifier: string | PublicKey,
    fallback?: PublicKeyInput,
    clusterFilter?: ClusterFilter
  ): PublicKey => {
    try {
      return get(identifier, clusterFilter).publicKey;
    } catch (error) {
      if (fallback === undefined) throw error;
      return publicKey(fallback);
    }
  };

  const all = (clusterFilter: ClusterFilter = 'current'): Program[] => {
    const cluster = resolveClusterFilter(clusterFilter);
    return cluster === '*'
      ? programs
      : programs.filter((program) => program.isOnCluster(cluster));
  };

  const add = (program: Program, overrides = true): void => {
    if (!overrides && has(program.publicKey, '*')) return;
    programs.unshift(program);
  };

  const bind = (abstract: string, concrete: string | PublicKey): void => {
    bindings[abstract] = concrete;
    resolveBinding(abstract); // Ensures the binding is valid.
  };

  const unbind = (abstract: string): void => {
    delete bindings[abstract];
  };

  const clone = (): ProgramRepositoryInterface =>
    createDefaultProgramRepository(context, programs, bindings);

  const resolveError = (
    error: ErrorWithLogs,
    transaction: Transaction
  ): ProgramError | null => {
    // Ensure the error as logs.
    if (!Array.isArray(error.logs) || error.logs.length === 0) return null;
    const logs = error.logs.join('\n');

    // Parse the instruction number.
    const instructionRegex = /Error processing Instruction (\d+):/;
    const instruction = error.message.match(instructionRegex)?.[1] ?? null;

    // Parse the error code.
    const errorCodeRegex = /Custom program error: (0x[a-f0-9]+)/i;
    const errorCodeString = logs.match(errorCodeRegex)?.[1] ?? null;
    const errorCode = errorCodeString ? parseInt(errorCodeString, 16) : null;

    // Ensure we could find an instruction number and an error code.
    if (instruction === null || errorCode === null) return null;

    // Get the program ID from the instruction in the transaction.
    const instructionNumber: number = parseInt(instruction, 10);
    const programIndex: number | null =
      transaction.message.instructions?.[instructionNumber]?.programIndex ??
      null;
    const programId = programIndex
      ? transaction.message.accounts[programIndex]
      : null;

    // Ensure we were able to find a program ID for the instruction.
    if (!programId) return null;

    // Find a registered program if any.
    let program: Program;
    try {
      program = get(programId);
    } catch (_programNotFoundError) {
      return null;
    }

    // Finally, resolve the error.
    const resolvedError = program.getErrorFromCode(errorCode, error);
    return resolvedError ?? new ProgramErrorNotRecognizedError(program, error);
  };

  const resolveClusterFilter = (clusterFilter: ClusterFilter): Cluster | '*' =>
    clusterFilter === 'current' ? context.rpc.getCluster() : clusterFilter;

  const resolveBinding = (
    identifier: string | PublicKey,
    stack: string[] = []
  ): string | PublicKey => {
    if (isPublicKey(identifier)) return identifier;
    if (bindings[identifier] === undefined) return identifier;
    const stackWithIdentifier = [...stack, identifier];
    if (stack.includes(identifier)) {
      throw new Error(
        `Circular binding detected: ${stackWithIdentifier.join(' -> ')}`
      );
    }
    return resolveBinding(bindings[identifier], stackWithIdentifier);
  };

  return {
    has,
    get,
    getPublicKey,
    all,
    add,
    bind,
    unbind,
    clone,
    resolveError,
  };
}
