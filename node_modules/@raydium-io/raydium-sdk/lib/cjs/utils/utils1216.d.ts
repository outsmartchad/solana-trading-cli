/// <reference types="node" />
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, TokenAccount, TxVersion } from '../base';
import { CacheLTA } from '../common';
export interface SHOW_INFO {
    programId: PublicKey;
    poolId: PublicKey;
    ammId: PublicKey;
    ownerAccountId: PublicKey;
    snapshotLpAmount: BN;
    openTime: number;
    endTime: number;
    project: (typeof Utils1216.VERSION_PROJECT)[number];
    canClaim: boolean;
    canClaimErrorType: canClaimErrorType;
    tokenInfo: {
        programId: PublicKey;
        mintAddress: PublicKey;
        mintVault: PublicKey;
        mintDecimals: number;
        perLpLoss: BN;
        debtAmount: BN;
    }[];
}
export type canClaimErrorType = 'outOfOperationalTime' | 'alreadyClaimIt' | undefined;
export declare class Utils1216 extends Base {
    static CLAIMED_NUM: number;
    static POOL_LAYOUT: import("../marshmallow").Structure<number | Buffer | PublicKey | BN | BN[] | {
        mintDecimals: number;
        mintAddress: PublicKey;
        mintVault: PublicKey;
        perLpLoss: BN;
        totalClaimedAmount: BN;
    }[], "", {
        status: number;
        padding: BN[];
        openTime: BN;
        endTime: BN;
        bump: number;
        ammId: PublicKey;
        tokenInfo: {
            mintDecimals: number;
            mintAddress: PublicKey;
            mintVault: PublicKey;
            perLpLoss: BN;
            totalClaimedAmount: BN;
        }[];
    }>;
    static OWNER_LAYOUT: import("../marshmallow").Structure<number | Buffer | PublicKey | BN | BN[] | {
        mintAddress: PublicKey;
        debtAmount: BN;
        claimedAmount: BN;
    }[], "", {
        version: number;
        owner: PublicKey;
        padding: BN[];
        poolId: PublicKey;
        bump: number;
        tokenInfo: {
            mintAddress: PublicKey;
            debtAmount: BN;
            claimedAmount: BN;
        }[];
        lpAmount: BN;
    }>;
    static DEFAULT_POOL_ID: PublicKey[];
    static SEED_CONFIG: {
        pool: {
            id: Buffer;
        };
        owner: {
            id: Buffer;
        };
    };
    static VERSION_PROJECT: readonly [undefined, "Francium", "Tulip", "Larix"];
    static getPdaPoolId(programId: PublicKey, ammId: PublicKey): {
        publicKey: PublicKey;
        nonce: number;
    };
    static getPdaOwnerId(programId: PublicKey, poolId: PublicKey, owner: PublicKey, version: number): {
        publicKey: PublicKey;
        nonce: number;
    };
    static getAllInfo({ connection, programId, poolIds, wallet, chainTime, }: {
        connection: Connection;
        programId: PublicKey;
        poolIds: PublicKey[];
        wallet: PublicKey;
        chainTime: number;
    }): Promise<SHOW_INFO[]>;
    static makeClaimInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: SHOW_INFO;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            associatedOnly: boolean;
            checkCreateATAOwner: boolean;
        };
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeClaimAllInstructionSimple<T extends TxVersion>({ connection, poolInfos, ownerInfo, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfos: SHOW_INFO[];
        ownerInfo: {
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            associatedOnly: boolean;
            checkCreateATAOwner: boolean;
        };
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeClaimInstruction({ programId, poolInfo, ownerInfo, }: {
        programId: PublicKey;
        poolInfo: SHOW_INFO;
        ownerInfo: {
            wallet: PublicKey;
            ownerPda: PublicKey;
            claimAddress: PublicKey[];
        };
    }): TransactionInstruction;
}
