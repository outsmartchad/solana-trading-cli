import { PublicKey } from '@solana/web3.js';
import type { Metaplex } from '@/Metaplex';
import { ProgramNotRecognizedError } from '@/errors';
import { Program, Cluster } from '@/types';

/**
 * @group Modules
 */
export class ProgramClient {
  protected programs: Program[] = [];
  constructor(protected readonly metaplex: Metaplex) {}

  register(program: Program): void {
    this.programs.unshift(program);
  }

  all(overrides: Program[] = []): Program[] {
    return [...overrides, ...this.programs];
  }

  allForCluster(cluster: Cluster, overrides: Program[] = []): Program[] {
    return this.all(overrides).filter((program) => {
      return program.clusterFilter?.(cluster) ?? true;
    });
  }

  allForCurrentCluster(overrides: Program[] = []): Program[] {
    return this.allForCluster(this.metaplex.cluster, overrides);
  }

  get<T extends Program = Program>(
    nameOrAddress: string | PublicKey,
    overrides: Program[] = []
  ): T {
    const programs = this.allForCurrentCluster(overrides);
    const program =
      typeof nameOrAddress === 'string'
        ? programs.find((program) => program.name === nameOrAddress)
        : programs.find((program) => program.address.equals(nameOrAddress));

    if (!program) {
      throw new ProgramNotRecognizedError(nameOrAddress, this.metaplex.cluster);
    }

    return program as T;
  }
}
