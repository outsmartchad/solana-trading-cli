/**
 * Vendored from @percolator/core — transaction builder.
 * Source: https://github.com/dcccrypto/percolator-launch
 */
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
  Keypair,
  SendOptions,
  Commitment,
  AccountMeta,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { parseErrorFromLogs } from "../abi/errors";

export interface BuildIxParams {
  programId: PublicKey;
  keys: AccountMeta[];
  data: Uint8Array | Buffer;
}

export function buildIx(params: BuildIxParams): TransactionInstruction {
  return new TransactionInstruction({
    programId: params.programId,
    keys: params.keys,
    data: params.data as Buffer,
  });
}

export interface TxResult {
  signature: string;
  slot: number;
  err: string | null;
  hint?: string;
  logs: string[];
  unitsConsumed?: number;
}

export interface SimulateOrSendParams {
  connection: Connection;
  ix: TransactionInstruction;
  signers: Keypair[];
  simulate: boolean;
  commitment?: Commitment;
  computeUnitLimit?: number;
}

export async function simulateOrSend(
  params: SimulateOrSendParams
): Promise<TxResult> {
  const { connection, ix, signers, simulate, commitment = "confirmed", computeUnitLimit } = params;
  const tx = new Transaction();
  if (computeUnitLimit !== undefined) {
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }));
  }
  tx.add(ix);
  const latestBlockhash = await connection.getLatestBlockhash(commitment);
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.feePayer = signers[0].publicKey;

  if (simulate) {
    tx.sign(...signers);
    const result = await connection.simulateTransaction(tx, signers);
    const logs = result.value.logs ?? [];
    let err: string | null = null;
    let hint: string | undefined;
    if (result.value.err) {
      const parsed = parseErrorFromLogs(logs);
      if (parsed) {
        err = `${parsed.name} (0x${parsed.code.toString(16)})`;
        hint = parsed.hint;
      } else {
        err = JSON.stringify(result.value.err);
      }
    }
    return { signature: "(simulated)", slot: result.context.slot, err, hint, logs, unitsConsumed: result.value.unitsConsumed ?? undefined };
  }

  const options: SendOptions = { skipPreflight: false, preflightCommitment: commitment };
  try {
    const signature = await connection.sendTransaction(tx, signers, options);
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash: latestBlockhash.blockhash, lastValidBlockHeight: latestBlockhash.lastValidBlockHeight },
      commitment
    );
    const txInfo = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    const logs = txInfo?.meta?.logMessages ?? [];
    let err: string | null = null;
    let hint: string | undefined;
    if (confirmation.value.err) {
      const parsed = parseErrorFromLogs(logs);
      if (parsed) {
        err = `${parsed.name} (0x${parsed.code.toString(16)})`;
        hint = parsed.hint;
      } else {
        err = JSON.stringify(confirmation.value.err);
      }
    }
    return { signature, slot: txInfo?.slot ?? 0, err, hint, logs };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { signature: "", slot: 0, err: message, logs: [] };
  }
}
