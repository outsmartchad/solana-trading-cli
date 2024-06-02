import { Connection, EpochInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, ComputeBudgetConfig, ReturnTypeFetchMultipleMintInfos, TokenAccount, TransferAmountFee, TxVersion } from '../base';
import { ApiPoolInfo, ApiPoolInfoItem } from '../baseInfo';
import { ClmmPoolInfo, ReturnTypeFetchMultiplePoolTickArrays } from '../clmm';
import { CacheLTA } from '../common';
import { Currency, Percent, Price, Token, TokenAmount, TokenAmountType } from '../entity';
export type PoolType = ClmmPoolInfo | ApiPoolInfoItem;
type RoutePathType = {
    [routeMint: string]: {
        mintProgram: PublicKey;
        in: PoolType[];
        out: PoolType[];
        mDecimals: number;
    };
};
interface PoolAccountInfoV4 {
    ammId: string;
    status: BN;
    baseDecimals: number;
    quoteDecimals: number;
    lpDecimals: number;
    baseReserve: BN;
    quoteReserve: BN;
    lpSupply: BN;
    startTime: BN;
}
export interface ComputeAmountOutAmmLayout {
    amountIn: TransferAmountFee;
    amountOut: TransferAmountFee;
    minAmountOut: TransferAmountFee;
    currentPrice: Price | undefined;
    executionPrice: Price | null;
    priceImpact: Percent;
    fee: TokenAmountType[];
    routeType: 'amm';
    poolKey: PoolType[];
    remainingAccounts: PublicKey[][];
    poolReady: boolean;
    poolType: 'CLMM' | 'STABLE' | undefined;
    feeConfig?: {
        feeAmount: BN;
        feeAccount: PublicKey;
    };
    expirationTime: number | undefined;
    allTrade: boolean;
    slippage: Percent;
    clmmExPriceX64: (BN | undefined)[];
}
export interface ComputeAmountOutRouteLayout {
    amountIn: TransferAmountFee;
    amountOut: TransferAmountFee;
    minAmountOut: TransferAmountFee;
    currentPrice: Price | undefined;
    executionPrice: Price | null;
    priceImpact: Percent;
    fee: TokenAmountType[];
    routeType: 'route';
    poolKey: PoolType[];
    remainingAccounts: (PublicKey[] | undefined)[];
    minMiddleAmountFee: TokenAmount | undefined;
    middleToken: Token;
    poolReady: boolean;
    poolType: ('CLMM' | 'STABLE' | undefined)[];
    feeConfig?: {
        feeAmount: BN;
        feeAccount: PublicKey;
    };
    expirationTime: number | undefined;
    allTrade: boolean;
    slippage: Percent;
    clmmExPriceX64: (BN | undefined)[];
}
type ComputeAmountOutLayout = ComputeAmountOutAmmLayout | ComputeAmountOutRouteLayout;
type makeSwapInstructionParam = {
    ownerInfo: {
        wallet: PublicKey;
        sourceToken: PublicKey;
        routeToken?: PublicKey;
        destinationToken: PublicKey;
    };
    inputMint: PublicKey;
    routeProgram: PublicKey;
    swapInfo: ComputeAmountOutLayout;
};
export interface ReturnTypeGetAllRoute {
    directPath: PoolType[];
    addLiquidityPools: ApiPoolInfoItem[];
    routePathDict: RoutePathType;
    needSimulate: ApiPoolInfoItem[];
    needTickArray: ClmmPoolInfo[];
    needCheckToken: string[];
}
export interface ReturnTypeFetchMultipleInfo {
    [ammId: string]: PoolAccountInfoV4;
}
export type ReturnTypeGetAddLiquidityDefaultPool = ApiPoolInfoItem | undefined;
export type ReturnTypeGetAllRouteComputeAmountOut = ComputeAmountOutLayout[];
export declare class TradeV2 extends Base {
    static getAllRoute({ inputMint, outputMint, apiPoolList, clmmList, allowedRouteToken2022, }: {
        inputMint: PublicKey;
        outputMint: PublicKey;
        apiPoolList?: ApiPoolInfo;
        clmmList?: ClmmPoolInfo[];
        allowedRouteToken2022?: boolean;
    }): ReturnTypeGetAllRoute;
    static fetchMultipleInfo({ connection, pools, batchRequest, }: {
        connection: Connection;
        pools: ApiPoolInfoItem[];
        batchRequest?: boolean;
    }): Promise<ReturnTypeFetchMultipleInfo>;
    static getAddLiquidityDefaultPool({ addLiquidityPools, poolInfosCache, }: {
        addLiquidityPools: ApiPoolInfoItem[];
        poolInfosCache: {
            [ammId: string]: PoolAccountInfoV4;
        };
    }): ReturnTypeGetAddLiquidityDefaultPool;
    private static ComparePoolSize;
    static getAllRouteComputeAmountOut({ inputTokenAmount, outputToken, directPath, routePathDict, simulateCache, tickCache, mintInfos, slippage, chainTime, epochInfo, feeConfig, }: {
        directPath: PoolType[];
        routePathDict: RoutePathType;
        simulateCache: ReturnTypeFetchMultipleInfo;
        tickCache: ReturnTypeFetchMultiplePoolTickArrays;
        mintInfos: ReturnTypeFetchMultipleMintInfos;
        inputTokenAmount: TokenAmountType;
        outputToken: Token | Currency;
        slippage: Percent;
        chainTime: number;
        epochInfo: EpochInfo;
        feeConfig?: {
            feeBps: BN;
            feeAccount: PublicKey;
        };
    }): ReturnTypeGetAllRouteComputeAmountOut;
    private static computeAmountOut;
    static makeSwapInstruction({ routeProgram, ownerInfo, inputMint, swapInfo }: makeSwapInstructionParam): {
        address: {};
        innerTransaction: import("../base").InnerTransaction;
    };
    static makeSwapInstructionSimple<T extends TxVersion>({ connection, swapInfo, ownerInfo, computeBudgetConfig, routeProgram, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        swapInfo: ComputeAmountOutLayout;
        ownerInfo: {
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            associatedOnly: boolean;
            checkCreateATAOwner: boolean;
        };
        routeProgram: PublicKey;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
}
export {};
