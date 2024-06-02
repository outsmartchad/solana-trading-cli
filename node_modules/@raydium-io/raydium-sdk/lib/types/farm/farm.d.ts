import { Connection, PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, ComputeBudgetConfig, InstructionType, TokenAccount, TxVersion } from '../base';
import { CacheLTA, GetMultipleAccountsInfoConfig } from '../common';
import { BigNumberish } from '../entity';
import { SplAccount } from '../spl';
import { FarmLedger, FarmState } from './layout';
export declare const poolTypeV6: {
    readonly 'Standard SPL': 0;
    readonly 'Option tokens': 1;
};
export type FarmPoolKeys = {
    readonly id: PublicKey;
    readonly lpMint: PublicKey;
    readonly version: number;
    readonly programId: PublicKey;
    readonly authority: PublicKey;
    readonly lpVault: PublicKey;
    readonly upcoming: boolean;
    readonly rewardInfos: ({
        readonly rewardMint: PublicKey;
        readonly rewardVault: PublicKey;
    } | {
        readonly rewardMint: PublicKey;
        readonly rewardVault: PublicKey;
        readonly rewardOpenTime: number;
        readonly rewardEndTime: number;
        readonly rewardPerSecond: number;
        readonly rewardType: keyof typeof poolTypeV6;
    })[];
};
/**
 * Full user keys that build transaction need
 */
export interface FarmUserKeys {
    ledger: PublicKey;
    auxiliaryLedgers?: PublicKey[];
    lpTokenAccount: PublicKey;
    rewardTokenAccounts: PublicKey[];
    owner: PublicKey;
}
export interface FarmRewardInfo {
    rewardMint: PublicKey;
    rewardPerSecond: BigNumberish;
    rewardOpenTime: BigNumberish;
    rewardEndTime: BigNumberish;
    rewardType: keyof typeof poolTypeV6;
}
export interface FarmDepositInstructionParams {
    poolKeys: FarmPoolKeys;
    userKeys: FarmUserKeys;
    amount: BigNumberish;
}
export type FarmWithdrawInstructionParams = FarmDepositInstructionParams;
export interface FarmCreateAssociatedLedgerAccountInstructionParams {
    poolKeys: FarmPoolKeys;
    userKeys: {
        ledger: PublicKey;
        owner: PublicKey;
    };
}
export interface FarmCreateInstructionParamsV6 {
    version: 6;
    programId: PublicKey;
    lpMint: PublicKey;
    rewardInfos: {
        rewardMint: PublicKey;
        rewardPerSecond: BigNumberish;
        rewardOpenTime: BigNumberish;
        rewardEndTime: BigNumberish;
        rewardType: keyof typeof poolTypeV6;
    }[];
    lockInfo: {
        lockMint: PublicKey;
        lockVault: PublicKey;
    };
}
export type FarmCreateInstructionParams = FarmCreateInstructionParamsV6;
export interface FarmRestartInstructionParamsV6 {
    connection: Connection;
    poolKeys: FarmPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    newRewardInfo: FarmRewardInfo;
}
export type FarmRestartInstructionParams = FarmRestartInstructionParamsV6;
export interface FarmCreatorWithdrawRewardInstructionParamsV6 {
    poolKeys: FarmPoolKeys;
    userKeys: {
        userRewardToken: PublicKey;
        owner: PublicKey;
        payer?: PublicKey;
    };
    withdrawMint: PublicKey;
}
export type FarmCreatorWithdrawRewardInstructionParams = FarmCreatorWithdrawRewardInstructionParamsV6;
export interface FarmCreatorWithdrawRewardInstructionSimpleParamsV6 {
    connection: Connection;
    poolKeys: FarmPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    withdrawMint: PublicKey;
}
export type FarmCreatorWithdrawRewardInstructionSimpleParams = FarmCreatorWithdrawRewardInstructionSimpleParamsV6;
export interface FarmCreatorAddRewardTokenInstructionParamsV6 {
    connection: Connection;
    poolKeys: FarmPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    newRewardInfo: FarmRewardInfo;
}
export type FarmCreatorAddRewardTokenInstructionParams = FarmCreatorAddRewardTokenInstructionParamsV6;
export interface MakeCreateFarmInstructionParamsV6 {
    connection: Connection;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    poolInfo: FarmCreateInstructionParams;
}
export type makeCreateFarmInstructionParams = MakeCreateFarmInstructionParamsV6;
export interface MakeCreateFarmInstructionParamsV6Simple {
    connection: Connection;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    poolInfo: FarmCreateInstructionParams;
}
export type makeCreateFarmInstructionSimpleParams = MakeCreateFarmInstructionParamsV6Simple;
export interface FarmFetchMultipleInfoParams {
    connection: Connection;
    pools: FarmPoolKeys[];
    owner?: PublicKey;
    config?: GetMultipleAccountsInfoConfig;
    chainTime: number;
}
export interface FarmFetchMultipleInfoReturnItem {
    apiPoolInfo: FarmPoolKeys;
    state: FarmState;
    lpVault: SplAccount;
    ledger?: FarmLedger;
    wrapped?: {
        pendingRewards: BN[];
    };
}
export interface FarmFetchMultipleInfoReturn {
    [id: string]: FarmFetchMultipleInfoReturnItem;
}
export declare class Farm extends Base {
    static getStateLayout(version: number): import("./layout").FarmStateLayout;
    static getLedgerLayout(version: number): import("./layout").FarmLedgerLayout;
    static getLayouts(version: number): {
        state: import("./layout").FarmStateLayout;
        ledger: import("./layout").FarmLedgerLayout;
    };
    static getAssociatedAuthority({ programId, poolId }: {
        programId: PublicKey;
        poolId: PublicKey;
    }): {
        publicKey: PublicKey;
        nonce: number;
    };
    static getAssociatedLedgerAccount({ programId, poolId, owner, version, }: {
        programId: PublicKey;
        poolId: PublicKey;
        owner: PublicKey;
        version: 6 | 5 | 3;
    }): PublicKey;
    static getAssociatedLedgerPoolAccount({ programId, poolId, mint, type, }: {
        programId: PublicKey;
        poolId: PublicKey;
        mint: PublicKey;
        type: 'lpVault' | 'rewardVault';
    }): PublicKey;
    static makeDepositInstruction(params: FarmDepositInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeDepositInstructionV3({ poolKeys, userKeys, amount }: FarmDepositInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeDepositInstructionV5({ poolKeys, userKeys, amount }: FarmDepositInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeDepositInstructionV6({ poolKeys, userKeys, amount }: FarmDepositInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeWithdrawInstruction(params: FarmWithdrawInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeWithdrawInstructionV3({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeWithdrawInstructionV5({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeWithdrawInstructionV6({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeCreateAssociatedLedgerAccountInstruction(params: FarmCreateAssociatedLedgerAccountInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeCreateAssociatedLedgerAccountInstructionV3({ poolKeys, userKeys, }: FarmCreateAssociatedLedgerAccountInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeCreateAssociatedLedgerAccountInstructionV5({ poolKeys, userKeys, }: FarmCreateAssociatedLedgerAccountInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeCreateFarmInstruction({ connection, userKeys, poolInfo }: makeCreateFarmInstructionParams): Promise<{
        address: {
            farmId: PublicKey;
        };
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: Signer[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    }>;
    static makeCreateFarmInstructionV6({ connection, userKeys, poolInfo }: MakeCreateFarmInstructionParamsV6): Promise<{
        address: {
            farmId: PublicKey;
        };
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: Signer[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    }>;
    static makeCreatorWithdrawFarmRewardInstruction(params: FarmCreatorWithdrawRewardInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static makeCreatorWithdrawFarmRewardInstructionV6({ poolKeys, userKeys, withdrawMint, }: FarmCreatorWithdrawRewardInstructionParamsV6): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    };
    static fetchMultipleInfoAndUpdate({ connection, pools, owner, config, chainTime, }: FarmFetchMultipleInfoParams): Promise<FarmFetchMultipleInfoReturn>;
    static updatePoolInfo(poolInfo: FarmState, lpVault: SplAccount, slot: number, chainTime: number): FarmState;
    static makeCreatorWithdrawFarmRewardInstructionSimple<T extends TxVersion>(params: FarmCreatorWithdrawRewardInstructionSimpleParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreatorWithdrawFarmRewardInstructionV6Simple<T extends TxVersion>({ connection, poolKeys, userKeys, withdrawMint, makeTxVersion, lookupTableCache, computeBudgetConfig, }: FarmCreatorWithdrawRewardInstructionSimpleParamsV6 & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreateFarmInstructionSimple<T extends TxVersion>(params: makeCreateFarmInstructionSimpleParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            farmId: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreateFarmInstructionV6Simple<T extends TxVersion>({ connection, userKeys, poolInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }: MakeCreateFarmInstructionParamsV6Simple & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            farmId: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeRestartFarmInstructionSimple<T extends TxVersion>(params: FarmRestartInstructionParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeRestartFarmInstructionV6Simple<T extends TxVersion>({ connection, poolKeys, userKeys, newRewardInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }: FarmRestartInstructionParamsV6 & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeFarmCreatorAddRewardTokenInstructionSimple<T extends TxVersion>(params: FarmCreatorAddRewardTokenInstructionParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeFarmCreatorAddRewardTokenInstructionV6Simple<T extends TxVersion>({ connection, poolKeys, userKeys, newRewardInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }: FarmCreatorAddRewardTokenInstructionParamsV6 & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeDepositInstructionSimple<T extends TxVersion>({ connection, poolKeys, fetchPoolInfo, ownerInfo, amount, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, computeBudgetConfig, }: {
        connection: Connection;
        poolKeys: FarmPoolKeys;
        fetchPoolInfo: FarmFetchMultipleInfoReturnItem;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        amount: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeWithdrawInstructionSimple<T extends TxVersion>({ connection, fetchPoolInfo, ownerInfo, amount, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, computeBudgetConfig, }: {
        connection: Connection;
        fetchPoolInfo: FarmFetchMultipleInfoReturnItem;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        amount: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeHarvestAllRewardInstructionSimple<T extends TxVersion>({ connection, fetchPoolInfos, ownerInfo, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, computeBudgetConfig, }: {
        connection: Connection;
        fetchPoolInfos: FarmFetchMultipleInfoReturn;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    /**
     * @deprecated the method is **DANGEROUS**, please don't use
     */
    static makeV1InfoToV2PdaAndHarvestSimple<T extends TxVersion>({ connection, wallet, tokenAccounts, programIdV3, programIdV5, makeTxVersion, lookupTableCache, computeBudgetConfig, }: {
        connection: Connection;
        wallet: PublicKey;
        tokenAccounts: TokenAccount[];
        programIdV3: PublicKey;
        programIdV5: PublicKey;
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeDepositTokenInstruction({ connection, programId, governanceProgramId, voteWeightAddinProgramId, realm, communityTokenMint, owner, poolId, }: {
        connection: Connection;
        programId: PublicKey;
        governanceProgramId: PublicKey;
        voteWeightAddinProgramId: PublicKey;
        realm: PublicKey;
        communityTokenMint: PublicKey;
        owner: PublicKey;
        poolId: PublicKey;
    }): Promise<{
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: any[];
        };
    }>;
    static makeWithdrawTokenInstruction({ connection, programId, governanceProgramId, voteWeightAddinProgramId, realm, communityTokenMint, owner, poolId, }: {
        connection: Connection;
        programId: PublicKey;
        governanceProgramId: PublicKey;
        voteWeightAddinProgramId: PublicKey;
        realm: PublicKey;
        communityTokenMint: PublicKey;
        owner: PublicKey;
        poolId: PublicKey;
    }): Promise<{
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: any[];
        };
    }>;
}
//# sourceMappingURL=farm.d.ts.map