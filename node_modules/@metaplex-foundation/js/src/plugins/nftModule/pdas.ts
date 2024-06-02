import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { BigNumber, Pda, toBigNumber } from '@/types';

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().metadata(...)` instead.
 */
export const findMetadataPda = (
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().masterEdition(...)` instead.
 */
export const findMasterEditionV2Pda = (
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from('edition', 'utf8'),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().edition(...)` instead.
 */
export const findEditionPda = (
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from('edition', 'utf8'),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().editionMarker(...)` instead.
 */
export const findEditionMarkerPda = (
  mint: PublicKey,
  edition: BigNumber,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from('edition', 'utf8'),
    Buffer.from(edition.div(toBigNumber(248)).toString()),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().collectionAuthorityRecord(...)` instead.
 */
export const findCollectionAuthorityRecordPda = (
  mint: PublicKey,
  collectionAuthority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from('collection_authority', 'utf8'),
    collectionAuthority.toBuffer(),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().useAuthorityRecord(...)` instead.
 */
export const findUseAuthorityRecordPda = (
  mint: PublicKey,
  useAuthority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    mint.toBuffer(),
    Buffer.from('user', 'utf8'),
    useAuthority.toBuffer(),
  ]);
};

/**
 * @group Pdas
 * @deprecated Please use `metaplex.nfts().pdas().burner(...)` instead.
 */
export const findProgramAsBurnerPda = (
  programId: PublicKey = PROGRAM_ID
): Pda => {
  return Pda.find(programId, [
    Buffer.from('metadata', 'utf8'),
    programId.toBuffer(),
    Buffer.from('burn', 'utf8'),
  ]);
};
