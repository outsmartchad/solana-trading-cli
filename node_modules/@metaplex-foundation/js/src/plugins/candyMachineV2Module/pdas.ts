import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { CandyMachineV2Program } from './program';
import { Pda } from '@/types';

/** @group Pdas */
export const findCandyMachineV2CreatorPda = (
  candyMachine: PublicKey,
  programId: PublicKey = CandyMachineV2Program.publicKey
): Pda => {
  return Pda.find(programId, [
    Buffer.from('candy_machine', 'utf8'),
    candyMachine.toBuffer(),
  ]);
};

/** @group Pdas */
export const findCandyMachineV2CollectionPda = (
  candyMachine: PublicKey,
  programId: PublicKey = CandyMachineV2Program.publicKey
): Pda => {
  return Pda.find(programId, [
    Buffer.from('collection', 'utf8'),
    candyMachine.toBuffer(),
  ]);
};
