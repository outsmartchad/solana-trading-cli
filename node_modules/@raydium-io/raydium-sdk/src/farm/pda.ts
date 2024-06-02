import { PublicKey } from '@solana/web3.js'

import { findProgramAddress } from '../common'

export function getRegistrarAddress(programId: PublicKey, realm: PublicKey, communityTokenMint: PublicKey) {
  return findProgramAddress(
    [realm.toBuffer(), Buffer.from('registrar', 'utf8'), communityTokenMint.toBuffer()],
    programId,
  )
}

export function getVotingTokenMint(programId: PublicKey, poolId: PublicKey) {
  return findProgramAddress([poolId.toBuffer(), Buffer.from('voting_mint_seed', 'utf8')], programId)
}

export function getVotingMintAuthority(programId: PublicKey, poolId: PublicKey) {
  return findProgramAddress([poolId.toBuffer()], programId)
}

export function getVoterAddress(programId: PublicKey, registrar: PublicKey, authority: PublicKey) {
  return findProgramAddress([registrar.toBuffer(), Buffer.from('voter', 'utf8'), authority.toBuffer()], programId)
}

export function getVoterWeightRecordAddress(programId: PublicKey, registrar: PublicKey, authority: PublicKey) {
  return findProgramAddress(
    [registrar.toBuffer(), Buffer.from('voter-weight-record', 'utf8'), authority.toBuffer()],
    programId,
  )
}

export function getTokenOwnerRecordAddress(
  programId: PublicKey,
  realm: PublicKey,
  governingTokenMint: PublicKey,
  governingTokenOwner: PublicKey,
) {
  return findProgramAddress(
    [
      Buffer.from('governance', 'utf8'),
      realm.toBuffer(),
      governingTokenMint.toBuffer(),
      governingTokenOwner.toBuffer(),
    ],
    programId,
  )
}
