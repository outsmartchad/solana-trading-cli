import {
  base58,
  TransactionInput,
  TransactionMessage,
} from '@metaplex-foundation/umi';
import {
  AddressLookupTableAccount as Web3JsAddressLookupTableAccount,
  Message as Web3JsMessageLegacy,
  MessageV0 as Web3JsMessageV0,
} from '@solana/web3.js';
import { toWeb3JsInstruction } from './Instruction';
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from './PublicKey';

export function fromWeb3JsMessage(
  message: Web3JsMessageLegacy | Web3JsMessageV0
): TransactionMessage {
  return {
    version: message.version,
    header: message.header,
    accounts: message.staticAccountKeys.map(fromWeb3JsPublicKey),
    blockhash: message.recentBlockhash,
    instructions: message.compiledInstructions.map((instruction) => ({
      programIndex: instruction.programIdIndex,
      accountIndexes: instruction.accountKeyIndexes,
      data: new Uint8Array(instruction.data),
    })),
    addressLookupTables: message.addressTableLookups.map((lookup) => ({
      publicKey: fromWeb3JsPublicKey(lookup.accountKey),
      writableIndexes: lookup.writableIndexes,
      readonlyIndexes: lookup.readonlyIndexes,
    })),
  };
}

export function toWeb3JsMessage(
  message: TransactionMessage
): Web3JsMessageLegacy | Web3JsMessageV0 {
  if (message.version === 'legacy') {
    return new Web3JsMessageLegacy({
      header: message.header,
      accountKeys: message.accounts.map(toWeb3JsPublicKey),
      recentBlockhash: message.blockhash,
      instructions: message.instructions.map((instruction) => ({
        programIdIndex: instruction.programIndex,
        accounts: instruction.accountIndexes,
        data: base58.deserialize(instruction.data)[0],
      })),
    });
  }

  return new Web3JsMessageV0({
    header: message.header,
    staticAccountKeys: message.accounts.map(toWeb3JsPublicKey),
    recentBlockhash: message.blockhash,
    compiledInstructions: message.instructions.map((instruction) => ({
      programIdIndex: instruction.programIndex,
      accountKeyIndexes: instruction.accountIndexes,
      data: instruction.data,
    })),
    addressTableLookups: message.addressLookupTables.map((lookup) => ({
      accountKey: toWeb3JsPublicKey(lookup.publicKey),
      writableIndexes: lookup.writableIndexes,
      readonlyIndexes: lookup.readonlyIndexes,
    })),
  });
}

export function toWeb3JsMessageFromInput(
  input: TransactionInput
): Web3JsMessageLegacy | Web3JsMessageV0 {
  if (input.version === 'legacy') {
    return Web3JsMessageLegacy.compile({
      payerKey: toWeb3JsPublicKey(input.payer),
      instructions: input.instructions.map(toWeb3JsInstruction),
      recentBlockhash: input.blockhash,
    });
  }

  return Web3JsMessageV0.compile({
    payerKey: toWeb3JsPublicKey(input.payer),
    instructions: input.instructions.map(toWeb3JsInstruction),
    recentBlockhash: input.blockhash,
    addressLookupTableAccounts: input.addressLookupTables?.map(
      (account) =>
        new Web3JsAddressLookupTableAccount({
          key: toWeb3JsPublicKey(account.publicKey),
          state: {
            addresses: account.addresses.map(toWeb3JsPublicKey),
            authority: undefined,
            deactivationSlot: BigInt(`0x${'ff'.repeat(8)}`),
            lastExtendedSlot: 0,
            lastExtendedSlotStartIndex: 0,
          },
        })
    ),
  });
}
