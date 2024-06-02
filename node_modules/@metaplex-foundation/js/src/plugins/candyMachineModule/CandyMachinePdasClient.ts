import { Buffer } from 'buffer';
import type { Metaplex } from '@/Metaplex';
import { Pda, Program, PublicKey } from '@/types';

/**
 * This client allows you to build PDAs related to the Candy Machine module.
 *
 * @see {@link CandyMachineClient}
 * @group Module Pdas
 */
export class CandyMachinePdasClient {
  constructor(protected readonly metaplex: Metaplex) {}

  /** Finds the Authority PDA for the given Candy Machine. */
  authority({
    candyMachine,
    programs,
  }: {
    /** The Candy Machine address */
    candyMachine: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const program = this.metaplex.programs().getCandyMachine(programs);
    return Pda.find(program.address, [
      Buffer.from('candy_machine', 'utf8'),
      candyMachine.toBuffer(),
    ]);
  }

  /** Finds the Candy Guard PDA for the given base address it derives from. */
  candyGuard({
    base,
    programs,
  }: {
    /** The base address which the Candy Guard PDA derives from. */
    base: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const program = this.metaplex.programs().getCandyGuard(programs);
    return Pda.find(program.address, [
      Buffer.from('candy_guard', 'utf8'),
      base.toBuffer(),
    ]);
  }

  /**
   * Finds the Mint Limit Counter PDA that keeps track of how many
   * NFTs where minted by a given user on a given Candy Machine.
   */
  mintLimitCounter({
    id,
    user,
    candyMachine,
    candyGuard,
    programs,
  }: {
    /** A unique identifier in the context of a Candy Machine/Candy Guard combo. */
    id: number;
    /** The address of the wallet trying to mint. */
    user: PublicKey;
    /** The address of the Candy Guard account. */
    candyGuard: PublicKey;
    /** The address of the Candy Machine account. */
    candyMachine: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const program = this.metaplex.programs().getCandyGuard(programs);
    return Pda.find(program.address, [
      Buffer.from('mint_limit', 'utf8'),
      Buffer.from([id]),
      user.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ]);
  }

  /**
   * Finds the Allow List Proof PDA that keeps track of whether a user
   * has provided the correct Merkle Proof for the given Merkle Root.
   */
  merkleProof({
    merkleRoot,
    user,
    candyMachine,
    candyGuard,
    programs,
  }: {
    /** The Merkle Root used when verifying the user. */
    merkleRoot: Uint8Array;
    /** The address of the wallet trying to mint. */
    user: PublicKey;
    /** The address of the Candy Guard account. */
    candyGuard: PublicKey;
    /** The address of the Candy Machine account. */
    candyMachine: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const program = this.metaplex.programs().getCandyGuard(programs);
    return Pda.find(program.address, [
      Buffer.from('allow_list', 'utf8'),
      merkleRoot,
      user.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ]);
  }

  /**
   * Finds the Freeze PDA used as an escrow account by
   * the freezeSolPayment and freezeTokenPayment guards.
   */
  freezeEscrow({
    destination,
    candyMachine,
    candyGuard,
    programs,
  }: {
    /** The wallet that will eventually receive the funds. */
    destination: PublicKey;
    /** The address of the Candy Guard account. */
    candyGuard: PublicKey;
    /** The address of the Candy Machine account. */
    candyMachine: PublicKey;
    /** An optional set of programs that override the registered ones. */
    programs?: Program[];
  }): Pda {
    const program = this.metaplex.programs().getCandyGuard(programs);
    return Pda.find(program.address, [
      Buffer.from('freeze_escrow', 'utf8'),
      destination.toBuffer(),
      candyGuard.toBuffer(),
      candyMachine.toBuffer(),
    ]);
  }
}
