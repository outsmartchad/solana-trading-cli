import { PublicKey } from '@solana/web3.js';
export declare function getRegistrarAddress(programId: PublicKey, realm: PublicKey, communityTokenMint: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getVotingTokenMint(programId: PublicKey, poolId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getVotingMintAuthority(programId: PublicKey, poolId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getVoterAddress(programId: PublicKey, registrar: PublicKey, authority: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getVoterWeightRecordAddress(programId: PublicKey, registrar: PublicKey, authority: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getTokenOwnerRecordAddress(programId: PublicKey, realm: PublicKey, governingTokenMint: PublicKey, governingTokenOwner: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
