import { PublicKey } from '@solana/web3.js'

import { findProgramAddress } from '../common'

export function getATAAddress(owner: PublicKey, mint: PublicKey, programId: PublicKey) {
  return findProgramAddress(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
  )
}
