import { Connection, EpochInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { Base, ComputeBudgetConfig, GetTransferAmountFee, InnerTransaction, ReturnTypeFetchMultipleMintInfos, TokenAccount, TransferAmountFee, TxVersion } from '../base';
import { ApiClmmPoolsItem, ApiClmmPoolsItemStatistics } from '../baseInfo';
import { CacheLTA } from '../common';
import { Currency, CurrencyAmount, Percent, Price, Token, TokenAmount } from '../entity';
import { TickArray } from './utils/tick';
export interface ClmmConfigInfo {
    id: PublicKey;
    index: number;
    protocolFeeRate: number;
    tradeFeeRate: number;
    tickSpacing: number;
    fundFeeRate: number;
    fundOwner: string;
    description: string;
}
export interface ClmmPoolRewardLayoutInfo {
    rewardState: number;
    openTime: BN;
    endTime: BN;
    lastUpdateTime: BN;
    emissionsPerSecondX64: BN;
    rewardTotalEmissioned: BN;
    rewardClaimed: BN;
    tokenMint: PublicKey;
    tokenVault: PublicKey;
    creator: PublicKey;
    rewardGrowthGlobalX64: BN;
}
export interface ClmmPoolRewardInfo {
    rewardState: number;
    openTime: BN;
    endTime: BN;
    lastUpdateTime: BN;
    emissionsPerSecondX64: BN;
    rewardTotalEmissioned: BN;
    rewardClaimed: BN;
    tokenProgramId: PublicKey;
    tokenMint: PublicKey;
    tokenVault: PublicKey;
    creator: PublicKey;
    rewardGrowthGlobalX64: BN;
    perSecond: Decimal;
    remainingRewards: undefined | BN;
}
export interface ClmmPoolInfo {
    id: PublicKey;
    mintA: {
        programId: PublicKey;
        mint: PublicKey;
        vault: PublicKey;
        decimals: number;
    };
    mintB: {
        programId: PublicKey;
        mint: PublicKey;
        vault: PublicKey;
        decimals: number;
    };
    ammConfig: ClmmConfigInfo;
    observationId: PublicKey;
    creator: PublicKey;
    programId: PublicKey;
    version: 6;
    tickSpacing: number;
    liquidity: BN;
    sqrtPriceX64: BN;
    currentPrice: Decimal;
    tickCurrent: number;
    observationIndex: number;
    observationUpdateDuration: number;
    feeGrowthGlobalX64A: BN;
    feeGrowthGlobalX64B: BN;
    protocolFeesTokenA: BN;
    protocolFeesTokenB: BN;
    swapInAmountTokenA: BN;
    swapOutAmountTokenB: BN;
    swapInAmountTokenB: BN;
    swapOutAmountTokenA: BN;
    tickArrayBitmap: BN[];
    rewardInfos: ClmmPoolRewardInfo[];
    day: ApiClmmPoolsItemStatistics;
    week: ApiClmmPoolsItemStatistics;
    month: ApiClmmPoolsItemStatistics;
    tvl: number;
    lookupTableAccount: PublicKey;
    startTime: number;
    exBitmapInfo: TickArrayBitmapExtensionType;
}
export interface ClmmPoolPersonalPosition {
    poolId: PublicKey;
    nftMint: PublicKey;
    priceLower: Decimal;
    priceUpper: Decimal;
    amountA: BN;
    amountB: BN;
    tickLower: number;
    tickUpper: number;
    liquidity: BN;
    feeGrowthInsideLastX64A: BN;
    feeGrowthInsideLastX64B: BN;
    tokenFeesOwedA: BN;
    tokenFeesOwedB: BN;
    rewardInfos: {
        growthInsideLastX64: BN;
        rewardAmountOwed: BN;
        pendingReward: BN;
    }[];
    leverage: number;
    tokenFeeAmountA: BN;
    tokenFeeAmountB: BN;
}
export interface MintInfo {
    mint: PublicKey;
    decimals: number;
    programId: PublicKey;
}
export interface ReturnTypeGetLiquidityAmountOut {
    liquidity: BN;
    amountSlippageA: GetTransferAmountFee;
    amountSlippageB: GetTransferAmountFee;
    amountA: GetTransferAmountFee;
    amountB: GetTransferAmountFee;
    expirationTime: number | undefined;
}
export interface ReturnTypeGetPriceAndTick {
    tick: number;
    price: Decimal;
}
export interface ReturnTypeGetTickPrice {
    tick: number;
    price: Decimal;
    tickSqrtPriceX64: BN;
}
export interface ReturnTypeComputeAmountOutFormat {
    allTrade: boolean;
    realAmountIn: TransferAmountFee;
    amountOut: TransferAmountFee;
    minAmountOut: TransferAmountFee;
    expirationTime: number | undefined;
    currentPrice: Price;
    executionPrice: Price;
    priceImpact: Percent;
    fee: CurrencyAmount;
    remainingAccounts: PublicKey[];
    executionPriceX64: BN;
}
export interface ReturnTypeComputeAmountOut {
    allTrade: boolean;
    realAmountIn: GetTransferAmountFee;
    amountOut: GetTransferAmountFee;
    minAmountOut: GetTransferAmountFee;
    expirationTime: number | undefined;
    currentPrice: Decimal;
    executionPrice: Decimal;
    priceImpact: Percent;
    fee: BN;
    remainingAccounts: PublicKey[];
    executionPriceX64: BN;
}
export interface ReturnTypeComputeAmountOutBaseOut {
    amountIn: GetTransferAmountFee;
    maxAmountIn: GetTransferAmountFee;
    realAmountOut: GetTransferAmountFee;
    expirationTime: number | undefined;
    currentPrice: Decimal;
    executionPrice: Decimal;
    priceImpact: Percent;
    fee: BN;
    remainingAccounts: PublicKey[];
}
export interface ReturnTypeFetchMultiplePoolInfos {
    [id: string]: {
        state: ClmmPoolInfo;
        positionAccount?: ClmmPoolPersonalPosition[] | undefined;
    };
}
export interface ReturnTypeFetchMultiplePoolTickArrays {
    [poolId: string]: {
        [key: string]: TickArray;
    };
}
export interface TickArrayBitmapExtensionType {
    poolId: PublicKey;
    positiveTickArrayBitmap: BN[][];
    negativeTickArrayBitmap: BN[][];
}
export interface ReturnTypeFetchExBitmaps {
    [exBitmapId: string]: TickArrayBitmapExtensionType;
}
export declare class Clmm extends Base {
    static makeMockPoolInfo({ programId, mint1, mint2, ammConfig, createPoolInstructionSimpleAddress, initialPrice, startTime, owner, }: {
        programId: PublicKey;
        mint1: MintInfo;
        mint2: MintInfo;
        ammConfig: ClmmConfigInfo;
        createPoolInstructionSimpleAddress: {
            observationId: PublicKey;
            poolId: PublicKey;
            mintAVault: PublicKey;
            mintBVault: PublicKey;
            mintA: PublicKey;
            mintB: PublicKey;
            mintProgramIdA: PublicKey;
            mintProgramIdB: PublicKey;
        };
        initialPrice: Decimal;
        startTime: BN;
        owner: PublicKey;
    }): ClmmPoolInfo;
    static makeCreatePoolInstructionSimple<T extends TxVersion>({ makeTxVersion, connection, programId, owner, payer, mint1, mint2, ammConfig, initialPrice, startTime, computeBudgetConfig, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        programId: PublicKey;
        owner: PublicKey;
        payer: PublicKey;
        mint1: MintInfo;
        mint2: MintInfo;
        ammConfig: ClmmConfigInfo;
        initialPrice: Decimal;
        startTime: BN;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            mintA: PublicKey;
            mintB: PublicKey;
            mintProgramIdA: PublicKey;
            mintProgramIdB: PublicKey;
            observationId: PublicKey;
            poolId: PublicKey;
            mintAVault: PublicKey;
            mintBVault: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeOpenPositionFromLiquidityInstructionSimple<T extends TxVersion>({ makeTxVersion, connection, poolInfo, ownerInfo, amountMaxA, amountMaxB, tickLower, tickUpper, liquidity, associatedOnly, checkCreateATAOwner, withMetadata, getEphemeralSigners, computeBudgetConfig, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        amountMaxA: BN;
        amountMaxB: BN;
        tickLower: number;
        tickUpper: number;
        withMetadata?: 'create' | 'no-create';
        liquidity: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
        getEphemeralSigners?: (k: number) => any;
    }): Promise<{
        address: {
            nftMint: PublicKey;
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            metadataAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeOpenPositionFromBaseInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, tickLower, tickUpper, base, baseAmount, otherAmountMax, associatedOnly, checkCreateATAOwner, computeBudgetConfig, withMetadata, makeTxVersion, lookupTableCache, getEphemeralSigners, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        tickLower: number;
        tickUpper: number;
        withMetadata?: 'create' | 'no-create';
        base: 'MintA' | 'MintB';
        baseAmount: BN;
        otherAmountMax: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
        getEphemeralSigners?: (k: number) => any;
    }): Promise<{
        address: {
            nftMint: PublicKey;
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            metadataAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeIncreasePositionFromLiquidityInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerPosition, ownerInfo, amountMaxA, amountMaxB, liquidity, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        amountMaxA: BN;
        amountMaxB: BN;
        liquidity: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeIncreasePositionFromBaseInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerPosition, ownerInfo, base, baseAmount, otherAmountMax, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        base: 'MintA' | 'MintB';
        baseAmount: BN;
        otherAmountMax: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeDecreaseLiquidityInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerPosition, ownerInfo, liquidity, amountMinA, amountMinB, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
            closePosition?: boolean;
        };
        liquidity: BN;
        amountMinA: BN;
        amountMinB: BN;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSwapBaseInInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, inputMint, amountIn, amountOutMin, priceLimit, remainingAccounts, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        inputMint: PublicKey;
        amountIn: BN;
        amountOutMin: BN;
        priceLimit?: Decimal;
        remainingAccounts: PublicKey[];
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSwapBaseOutInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, outputMint, amountOut, amountInMax, priceLimit, remainingAccounts, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        outputMint: PublicKey;
        amountOut: BN;
        amountInMax: BN;
        priceLimit?: Decimal;
        remainingAccounts: PublicKey[];
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCLosePositionInstructionSimple<T extends TxVersion>({ poolInfo, ownerPosition, ownerInfo, makeTxVersion, lookupTableCache, connection, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            wallet: PublicKey;
            feePayer: PublicKey;
        };
    }): Promise<{
        address: {
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeInitRewardInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardInfo, chainTime, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardInfo: {
            programId: PublicKey;
            mint: PublicKey;
            openTime: number;
            endTime: number;
            perSecond: Decimal;
        };
        chainTime: number;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
    }): Promise<{
        address: {
            poolRewardVault: PublicKey;
            operationId: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeInitRewardsInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardInfos, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardInfos: {
            programId: PublicKey;
            mint: PublicKey;
            openTime: number;
            endTime: number;
            perSecond: Decimal;
        }[];
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSetRewardInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardInfo, chainTime, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardInfo: {
            programId: PublicKey;
            mint: PublicKey;
            openTime: number;
            endTime: number;
            perSecond: Decimal;
        };
        chainTime: number;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
    }): Promise<{
        address: {
            rewardVault: PublicKey;
            operationId: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSetRewardsInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardInfos, chainTime, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardInfos: {
            programId: PublicKey;
            mint: PublicKey;
            openTime: number;
            endTime: number;
            perSecond: Decimal;
        }[];
        chainTime: number;
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCollectRewardInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardMint, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardMint: PublicKey;
        associatedOnly: boolean;
        checkCreateATAOwner: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            rewardVault: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCollectRewardsInstructionSimple<T extends TxVersion>({ connection, poolInfo, ownerInfo, rewardMints, associatedOnly, checkCreateATAOwner, computeBudgetConfig, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        rewardMints: PublicKey[];
        associatedOnly: boolean;
        checkCreateATAOwner: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeHarvestAllRewardInstructionSimple<T extends TxVersion>({ connection, fetchPoolInfos, ownerInfo, associatedOnly, checkCreateATAOwner, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        fetchPoolInfos: ReturnTypeFetchMultiplePoolInfos;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        associatedOnly?: boolean;
        checkCreateATAOwner?: boolean;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreatePoolInstructions({ connection, programId, owner, mintA, mintB, ammConfigId, initialPriceX64, startTime, }: {
        connection: Connection;
        programId: PublicKey;
        owner: PublicKey;
        mintA: MintInfo;
        mintB: MintInfo;
        ammConfigId: PublicKey;
        initialPriceX64: BN;
        startTime: BN;
    }): Promise<{
        address: {
            observationId: PublicKey;
            poolId: PublicKey;
            mintAVault: PublicKey;
            mintBVault: PublicKey;
        };
        innerTransaction: InnerTransaction;
    }>;
    static makeOpenPositionFromLiquidityInstructions({ poolInfo, ownerInfo, tickLower, tickUpper, liquidity, amountMaxA, amountMaxB, withMetadata, getEphemeralSigners, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        tickLower: number;
        tickUpper: number;
        liquidity: BN;
        amountMaxA: BN;
        amountMaxB: BN;
        withMetadata: 'create' | 'no-create';
        getEphemeralSigners?: (k: number) => any;
    }): Promise<{
        address: {
            nftMint: PublicKey;
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            metadataAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    }>;
    static makeOpenPositionFromBaseInstructions({ poolInfo, ownerInfo, tickLower, tickUpper, base, baseAmount, otherAmountMax, withMetadata, getEphemeralSigners, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        tickLower: number;
        tickUpper: number;
        withMetadata: 'create' | 'no-create';
        base: 'MintA' | 'MintB';
        baseAmount: BN;
        otherAmountMax: BN;
        getEphemeralSigners?: (k: number) => any;
    }): Promise<{
        address: {
            nftMint: PublicKey;
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            metadataAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    }>;
    static makeIncreasePositionFromLiquidityInstructions({ poolInfo, ownerPosition, ownerInfo, liquidity, amountMaxA, amountMaxB, }: {
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        liquidity: BN;
        amountMaxA: BN;
        amountMaxB: BN;
    }): {
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeIncreasePositionFromBaseInstructions({ poolInfo, ownerPosition, ownerInfo, base, baseAmount, otherAmountMax, }: {
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        base: 'MintA' | 'MintB';
        baseAmount: BN;
        otherAmountMax: BN;
    }): {
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeDecreaseLiquidityInstructions({ poolInfo, ownerPosition, ownerInfo, liquidity, amountMinA, amountMinB, }: {
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
            rewardAccounts: PublicKey[];
        };
        liquidity: BN;
        amountMinA: BN;
        amountMinB: BN;
    }): {
        address: {
            tickArrayLower: PublicKey;
            tickArrayUpper: PublicKey;
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
            protocolPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeClosePositionInstructions({ poolInfo, ownerInfo, ownerPosition, }: {
        poolInfo: ClmmPoolInfo;
        ownerPosition: ClmmPoolPersonalPosition;
        ownerInfo: {
            wallet: PublicKey;
        };
    }): {
        address: {
            positionNftAccount: PublicKey;
            personalPosition: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeSwapBaseInInstructions({ poolInfo, ownerInfo, inputMint, amountIn, amountOutMin, sqrtPriceLimitX64, remainingAccounts, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        inputMint: PublicKey;
        amountIn: BN;
        amountOutMin: BN;
        sqrtPriceLimitX64: BN;
        remainingAccounts: PublicKey[];
    }): {
        address: {};
        innerTransaction: InnerTransaction;
    };
    static makeSwapBaseOutInstructions({ poolInfo, ownerInfo, outputMint, amountOut, amountInMax, sqrtPriceLimitX64, remainingAccounts, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccountA: PublicKey;
            tokenAccountB: PublicKey;
        };
        outputMint: PublicKey;
        amountOut: BN;
        amountInMax: BN;
        sqrtPriceLimitX64: BN;
        remainingAccounts: PublicKey[];
    }): {
        address: {};
        innerTransaction: InnerTransaction;
    };
    static makeInitRewardInstructions({ poolInfo, ownerInfo, rewardInfo, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccount: PublicKey;
        };
        rewardInfo: {
            programId: PublicKey;
            mint: PublicKey;
            openTime: number;
            endTime: number;
            emissionsPerSecondX64: BN;
        };
    }): {
        address: {
            poolRewardVault: PublicKey;
            operationId: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeSetRewardInstructions({ poolInfo, ownerInfo, rewardInfo, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccount: PublicKey;
        };
        rewardInfo: {
            mint: PublicKey;
            openTime: number;
            endTime: number;
            emissionsPerSecondX64: BN;
        };
    }): {
        address: {
            rewardVault: PublicKey;
            operationId: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static makeCollectRewardInstructions({ poolInfo, ownerInfo, rewardMint, }: {
        poolInfo: ClmmPoolInfo;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccount: PublicKey;
        };
        rewardMint: PublicKey;
    }): {
        address: {
            rewardVault: PublicKey;
        };
        innerTransaction: InnerTransaction;
    };
    static getLiquidityAmountOutFromAmountIn({ poolInfo, inputA, tickLower, tickUpper, amount, slippage, add, token2022Infos, epochInfo, amountHasFee, }: {
        poolInfo: ClmmPoolInfo;
        inputA: boolean;
        tickLower: number;
        tickUpper: number;
        amount: BN;
        slippage: number;
        add: boolean;
        amountHasFee: boolean;
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
    }): ReturnTypeGetLiquidityAmountOut;
    static getLiquidityFromAmounts({ poolInfo, tickLower, tickUpper, amountA, amountB, slippage, add, token2022Infos, epochInfo, amountHasFee, }: {
        poolInfo: ClmmPoolInfo;
        tickLower: number;
        tickUpper: number;
        amountA: BN;
        amountB: BN;
        slippage: number;
        add: boolean;
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
        amountHasFee: boolean;
    }): ReturnTypeGetLiquidityAmountOut;
    static getAmountsFromLiquidity({ poolInfo, tickLower, tickUpper, liquidity, slippage, add, token2022Infos, epochInfo, amountAddFee, }: {
        poolInfo: ClmmPoolInfo;
        tickLower: number;
        tickUpper: number;
        liquidity: BN;
        slippage: number;
        add: boolean;
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
        amountAddFee: boolean;
    }): ReturnTypeGetLiquidityAmountOut;
    static getPriceAndTick({ poolInfo, price, baseIn, }: {
        poolInfo: ClmmPoolInfo;
        price: Decimal;
        baseIn: boolean;
    }): ReturnTypeGetPriceAndTick;
    static getTickPrice({ poolInfo, tick, baseIn, }: {
        poolInfo: ClmmPoolInfo;
        tick: number;
        baseIn: boolean;
    }): ReturnTypeGetTickPrice;
    static computeAmountOutFormat({ poolInfo, tickArrayCache, token2022Infos, epochInfo, amountIn, currencyOut, slippage, catchLiquidityInsufficient, }: {
        poolInfo: ClmmPoolInfo;
        tickArrayCache: {
            [key: string]: TickArray;
        };
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
        amountIn: CurrencyAmount | TokenAmount;
        currencyOut: Token | Currency;
        slippage: Percent;
        catchLiquidityInsufficient: boolean;
    }): ReturnTypeComputeAmountOutFormat;
    static computeAmountOutAndCheckToken({ connection, poolInfo, tickArrayCache, baseMint, amountIn, slippage, priceLimit, catchLiquidityInsufficient, }: {
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        tickArrayCache: {
            [key: string]: TickArray;
        };
        baseMint: PublicKey;
        amountIn: BN;
        slippage: number;
        priceLimit?: Decimal;
        catchLiquidityInsufficient: boolean;
    }): Promise<ReturnTypeComputeAmountOut>;
    static computeAmountOut({ poolInfo, tickArrayCache, baseMint, token2022Infos, epochInfo, amountIn, slippage, priceLimit, catchLiquidityInsufficient, }: {
        poolInfo: ClmmPoolInfo;
        tickArrayCache: {
            [key: string]: TickArray;
        };
        baseMint: PublicKey;
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
        amountIn: BN;
        slippage: number;
        priceLimit?: Decimal;
        catchLiquidityInsufficient: boolean;
    }): ReturnTypeComputeAmountOut;
    static computeAmountInAndCheckToken({ connection, poolInfo, tickArrayCache, baseMint, amountOut, slippage, priceLimit, }: {
        connection: Connection;
        poolInfo: ClmmPoolInfo;
        tickArrayCache: {
            [key: string]: TickArray;
        };
        baseMint: PublicKey;
        amountOut: BN;
        slippage: number;
        priceLimit?: Decimal;
    }): Promise<ReturnTypeComputeAmountOutBaseOut>;
    static computeAmountIn({ poolInfo, tickArrayCache, baseMint, token2022Infos, epochInfo, amountOut, slippage, priceLimit, }: {
        poolInfo: ClmmPoolInfo;
        tickArrayCache: {
            [key: string]: TickArray;
        };
        baseMint: PublicKey;
        token2022Infos: ReturnTypeFetchMultipleMintInfos;
        epochInfo: EpochInfo;
        amountOut: BN;
        slippage: number;
        priceLimit?: Decimal;
    }): ReturnTypeComputeAmountOutBaseOut;
    static estimateAprsForPriceRangeMultiplier({ poolInfo, aprType, positionTickLowerIndex, positionTickUpperIndex, }: {
        poolInfo: ClmmPoolInfo;
        aprType: 'day' | 'week' | 'month';
        positionTickLowerIndex: number;
        positionTickUpperIndex: number;
    }): {
        feeApr: number;
        rewardsApr: number[];
        apr: number;
    };
    static estimateAprsForPriceRangeDelta({ poolInfo, aprType, mintPrice, rewardMintDecimals, liquidity, positionTickLowerIndex, positionTickUpperIndex, chainTime, }: {
        poolInfo: ClmmPoolInfo;
        aprType: 'day' | 'week' | 'month';
        mintPrice: {
            [mint: string]: Price;
        };
        rewardMintDecimals: {
            [mint: string]: number;
        };
        liquidity: BN;
        positionTickLowerIndex: number;
        positionTickUpperIndex: number;
        chainTime: number;
    }): {
        feeApr: number;
        rewardsApr: number[];
        apr: number;
    };
    static fetchMultiplePoolInfos({ connection, poolKeys, ownerInfo, chainTime, batchRequest, updateOwnerRewardAndFee, }: {
        connection: Connection;
        poolKeys: ApiClmmPoolsItem[];
        ownerInfo?: {
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
        };
        chainTime: number;
        batchRequest?: boolean;
        updateOwnerRewardAndFee?: boolean;
    }): Promise<ReturnTypeFetchMultiplePoolInfos>;
    static fetchMultiplePoolTickArrays({ connection, poolKeys, batchRequest, }: {
        connection: Connection;
        poolKeys: ClmmPoolInfo[];
        batchRequest?: boolean;
    }): Promise<ReturnTypeFetchMultiplePoolTickArrays>;
    static fetchExBitmaps({ connection, exBitmapAddress, batchRequest, }: {
        connection: Connection;
        exBitmapAddress: PublicKey[];
        batchRequest: boolean;
    }): Promise<ReturnTypeFetchExBitmaps>;
    static getWhiteListMint({ connection, programId }: {
        connection: Connection;
        programId: PublicKey;
    }): Promise<PublicKey[]>;
}
