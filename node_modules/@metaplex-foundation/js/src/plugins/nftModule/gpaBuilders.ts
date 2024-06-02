import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { Key, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { Metaplex } from '@/Metaplex';
import { GpaBuilder, padEmptyChars } from '@/utils';
import { toBigNumber } from '@/types';

const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const MAX_URI_LENGTH = 200;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const DATA_START = 1 + 32 + 32;
const NAME_START = DATA_START + 4;
const SYMBOL_START = NAME_START + MAX_NAME_LENGTH + 4;
const URI_START = SYMBOL_START + MAX_SYMBOL_LENGTH + 4;
const CREATORS_START = URI_START + MAX_URI_LENGTH + 2 + 1 + 4;

export class TokenMetadataGpaBuilder extends GpaBuilder {
  constructor(metaplex: Metaplex, programId?: PublicKey) {
    super(metaplex, programId ?? PROGRAM_ID);
  }

  whereKey(key: Key) {
    return this.where(0, toBigNumber(key, 'le'));
  }
}

export class MetadataV1GpaBuilder extends TokenMetadataGpaBuilder {
  constructor(metaplex: Metaplex, programId?: PublicKey) {
    super(metaplex, programId);
    this.whereKey(Key.MetadataV1);
  }

  selectUpdatedAuthority() {
    return this.slice(1, 32);
  }

  whereUpdateAuthority(updateAuthority: PublicKey) {
    return this.where(1, updateAuthority);
  }

  selectMint() {
    return this.slice(33, 32);
  }

  whereMint(mint: PublicKey) {
    return this.where(33, mint);
  }

  selectName() {
    return this.slice(NAME_START, MAX_NAME_LENGTH);
  }

  whereName(name: string) {
    return this.where(
      NAME_START,
      Buffer.from(padEmptyChars(name, MAX_NAME_LENGTH))
    );
  }

  selectSymbol() {
    return this.slice(SYMBOL_START, MAX_SYMBOL_LENGTH);
  }

  whereSymbol(symbol: string) {
    return this.where(
      SYMBOL_START,
      Buffer.from(padEmptyChars(symbol, MAX_SYMBOL_LENGTH))
    );
  }

  selectUri() {
    return this.slice(URI_START, MAX_URI_LENGTH);
  }

  whereUri(uri: string) {
    return this.where(
      URI_START,
      Buffer.from(padEmptyChars(uri, MAX_URI_LENGTH))
    );
  }

  selectCreator(position: number) {
    return this.slice(
      CREATORS_START + (position - 1) * MAX_CREATOR_LEN,
      CREATORS_START + position * MAX_CREATOR_LEN
    );
  }

  whereCreator(position: number, creator: PublicKey) {
    return this.where(
      CREATORS_START + (position - 1) * MAX_CREATOR_LEN,
      creator
    );
  }

  selectFirstCreator() {
    return this.selectCreator(1);
  }

  whereFirstCreator(firstCreator: PublicKey) {
    return this.whereCreator(1, firstCreator);
  }
}
