/// <reference types="node" />
import { PublicKey } from '@solana/web3.js';
export declare const AMM_CONFIG_SEED: Buffer;
export declare const POOL_SEED: Buffer;
export declare const POOL_VAULT_SEED: Buffer;
export declare const POOL_REWARD_VAULT_SEED: Buffer;
export declare const POSITION_SEED: Buffer;
export declare const TICK_ARRAY_SEED: Buffer;
export declare const OPERATION_SEED: Buffer;
export declare const POOL_TICK_ARRAY_BITMAP_SEED: Buffer;
export declare function getPdaAmmConfigId(programId: PublicKey, index: number): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaPoolId(programId: PublicKey, ammConfigId: PublicKey, mintA: PublicKey, mintB: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaPoolVaultId(programId: PublicKey, poolId: PublicKey, vaultMint: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaPoolRewardVaulId(programId: PublicKey, poolId: PublicKey, rewardMint: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaTickArrayAddress(programId: PublicKey, poolId: PublicKey, startIndex: number): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaProtocolPositionAddress(programId: PublicKey, poolId: PublicKey, tickLower: number, tickUpper: number): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaPersonalPositionAddress(programId: PublicKey, nftMint: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaMetadataKey(mint: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaOperationAccount(programId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
export declare function getPdaExBitmapAccount(programId: PublicKey, poolId: PublicKey): {
    publicKey: PublicKey;
    nonce: number;
};
