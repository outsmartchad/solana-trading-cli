import { PublicKey } from '@solana/web3.js';
export declare function getATAAddress(owner: PublicKey, mint: PublicKey, programId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
