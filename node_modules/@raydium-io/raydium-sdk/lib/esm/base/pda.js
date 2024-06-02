import { PublicKey } from '@solana/web3.js';
import { findProgramAddress } from '../common';
export function getATAAddress(owner, mint, programId) {
    return findProgramAddress([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'));
}
//# sourceMappingURL=pda.js.map