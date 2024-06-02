import { base58, Transaction } from '@metaplex-foundation/umi';
import {
  SIGNATURE_LENGTH_IN_BYTES,
  Transaction as Web3JsLegacyTransaction,
  Message as Web3JsMessage,
  VersionedTransaction as Web3JsTransaction,
} from '@solana/web3.js';
import { fromWeb3JsMessage, toWeb3JsMessage } from './TransactionMessage';

export function fromWeb3JsTransaction(
  web3JsTransaction: Web3JsTransaction
): Transaction {
  return {
    message: fromWeb3JsMessage(web3JsTransaction.message),
    serializedMessage: web3JsTransaction.message.serialize(),
    signatures: web3JsTransaction.signatures,
  };
}

export function toWeb3JsTransaction(
  transaction: Transaction
): Web3JsTransaction {
  return new Web3JsTransaction(
    toWeb3JsMessage(transaction.message),
    transaction.signatures
  );
}

export function fromWeb3JsLegacyTransaction(
  web3JsLegacyTransaction: Web3JsLegacyTransaction
): Transaction {
  const web3JsMessage = web3JsLegacyTransaction.compileMessage();
  const web3JsLegacySignatures = web3JsLegacyTransaction.signatures.reduce(
    (all, one) => {
      all[one.publicKey.toBase58()] = one.signature
        ? new Uint8Array(one.signature)
        : null;
      return all;
    },
    {} as Record<string, Uint8Array | null>
  );

  const signatures = [];
  for (let i = 0; i < web3JsMessage.header.numRequiredSignatures; i += 1) {
    const pubkey = web3JsMessage.accountKeys[i].toBase58();
    const signature = web3JsLegacySignatures[pubkey] ?? null;
    signatures.push(signature ?? new Uint8Array(SIGNATURE_LENGTH_IN_BYTES));
  }

  return {
    message: fromWeb3JsMessage(web3JsMessage),
    serializedMessage: web3JsMessage.serialize(),
    signatures,
  };
}

export function toWeb3JsLegacyTransaction(
  transaction: Transaction
): Web3JsLegacyTransaction {
  const web3JsTransaction = toWeb3JsTransaction({
    ...transaction,
    message: { ...transaction.message, version: 'legacy' },
  });
  return Web3JsLegacyTransaction.populate(
    web3JsTransaction.message as Web3JsMessage,
    web3JsTransaction.signatures.map(
      (signature) => base58.deserialize(signature)[0]
    )
  );
}
