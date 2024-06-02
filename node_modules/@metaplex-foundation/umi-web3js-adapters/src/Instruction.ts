import { Instruction } from '@metaplex-foundation/umi';
import { TransactionInstruction as Web3JsTransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from './PublicKey';

export function fromWeb3JsInstruction(
  instruction: Web3JsTransactionInstruction
): Instruction {
  return {
    keys: instruction.keys.map((accountMeta) => ({
      ...accountMeta,
      pubkey: fromWeb3JsPublicKey(accountMeta.pubkey),
    })),
    programId: fromWeb3JsPublicKey(instruction.programId),
    data: new Uint8Array(instruction.data),
  };
}

export function toWeb3JsInstruction(
  instruction: Instruction
): Web3JsTransactionInstruction {
  return new Web3JsTransactionInstruction({
    keys: instruction.keys.map((accountMeta) => ({
      ...accountMeta,
      pubkey: toWeb3JsPublicKey(accountMeta.pubkey),
    })),
    programId: toWeb3JsPublicKey(instruction.programId),
    data: Buffer.from(instruction.data),
  });
}
