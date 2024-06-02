/// <reference types="node" />
import { PublicKey } from '@solana/web3.js';
export { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
export { SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
export declare const SYSTEM_PROGRAM_ID: PublicKey;
export declare const MEMO_PROGRAM_ID: PublicKey;
export declare const RENT_PROGRAM_ID: PublicKey;
export declare const METADATA_PROGRAM_ID: PublicKey;
export declare const INSTRUCTION_PROGRAM_ID: PublicKey;
export type PublicKeyish = PublicKey | string;
export declare function validateAndParsePublicKey(publicKey: PublicKeyish): PublicKey;
export declare function findProgramAddress(seeds: Array<Buffer | Uint8Array>, programId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function AccountMeta(publicKey: PublicKey, isSigner: boolean): {
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
};
export declare function AccountMetaReadonly(publicKey: PublicKey, isSigner: boolean): {
    pubkey: PublicKey;
    isWritable: boolean;
    isSigner: boolean;
};
//# sourceMappingURL=pubkey.d.ts.map