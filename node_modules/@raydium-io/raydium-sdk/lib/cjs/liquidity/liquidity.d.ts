import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, ComputeBudgetConfig, InstructionType, MakeInstructionOutType, TokenAccount, TxVersion } from '../base';
import { ApiPoolInfoItem } from '../baseInfo';
import { ClmmPoolInfo } from '../clmm';
import { CacheLTA, GetMultipleAccountsInfoConfig } from '../common';
import { BigNumberish, Currency, CurrencyAmount, Percent, Price, Token, TokenAmount } from '../entity';
import { FarmPoolKeys } from '../farm';
import { LiquidityStateV4 } from './layout';
export declare function initStableModelLayout(connection: Connection): Promise<void>;
export type SwapSide = 'in' | 'out';
export type LiquiditySide = 'a' | 'b';
export type AmountSide = 'base' | 'quote';
export type LiquidityPoolKeysV4 = {
    [T in keyof ApiPoolInfoItem]: string extends ApiPoolInfoItem[T] ? PublicKey : ApiPoolInfoItem[T];
};
/**
 * Full liquidity pool keys that build transaction need
 */
export type LiquidityPoolKeys = LiquidityPoolKeysV4;
export interface LiquidityAssociatedPoolKeysV4 extends Omit<LiquidityPoolKeysV4, 'marketBaseVault' | 'marketQuoteVault' | 'marketBids' | 'marketAsks' | 'marketEventQueue'> {
    nonce: number;
}
/**
 * Associated liquidity pool keys
 * @remarks
 * without partial markets keys
 */
export type LiquidityAssociatedPoolKeys = LiquidityAssociatedPoolKeysV4 & {
    configId: PublicKey;
};
export declare enum LiquidityPoolStatus {
    Uninitialized = 0,
    Initialized = 1,
    Disabled = 2,
    RemoveLiquidityOnly = 3,
    LiquidityOnly = 4,
    OrderBook = 5,
    Swap = 6,
    WaitingForStart = 7
}
/**
 * Liquidity pool info
 * @remarks
 * same data type with layouts
 */
export interface LiquidityPoolInfo {
    status: BN;
    baseDecimals: number;
    quoteDecimals: number;
    lpDecimals: number;
    baseReserve: BN;
    quoteReserve: BN;
    lpSupply: BN;
    startTime: BN;
}
/**
 * Full user keys that build transaction need
 */
export interface LiquidityUserKeys {
    baseTokenAccount: PublicKey;
    quoteTokenAccount: PublicKey;
    lpTokenAccount: PublicKey;
    owner: PublicKey;
}
export interface LiquidityAddInstructionParamsV4 {
    poolKeys: LiquidityPoolKeys;
    userKeys: LiquidityUserKeys;
    baseAmountIn: BigNumberish;
    quoteAmountIn: BigNumberish;
    fixedSide: AmountSide;
}
/**
 * Add liquidity instruction params
 */
export type LiquidityAddInstructionParams = LiquidityAddInstructionParamsV4;
/**
 * Add liquidity transaction params
 */
export interface LiquidityAddInstructionSimpleParams {
    connection: Connection;
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    amountInA: CurrencyAmount | TokenAmount;
    amountInB: CurrencyAmount | TokenAmount;
    fixedSide: LiquiditySide;
    config?: {
        bypassAssociatedCheck?: boolean;
        checkCreateATAOwner?: boolean;
    };
}
export interface LiquidityRemoveInstructionParamsV4 {
    poolKeys: LiquidityPoolKeys;
    userKeys: LiquidityUserKeys;
    amountIn: BigNumberish;
}
/**
 * Remove liquidity instruction params
 */
export type LiquidityRemoveInstructionParams = LiquidityRemoveInstructionParamsV4;
/**
 * Remove liquidity transaction params
 */
export interface LiquidityRemoveInstructionSimpleParams {
    connection: Connection;
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    amountIn: TokenAmount;
    config?: {
        bypassAssociatedCheck?: boolean;
        checkCreateATAOwner?: boolean;
    };
}
export interface LiquiditySwapFixedInInstructionParamsV4 {
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccountIn: PublicKey;
        tokenAccountOut: PublicKey;
        owner: PublicKey;
    };
    amountIn: BigNumberish;
    minAmountOut: BigNumberish;
}
export interface LiquiditySwapFixedOutInstructionParamsV4 {
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccountIn: PublicKey;
        tokenAccountOut: PublicKey;
        owner: PublicKey;
    };
    maxAmountIn: BigNumberish;
    amountOut: BigNumberish;
}
/**
 * Swap instruction params
 */
export interface LiquiditySwapInstructionParams {
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccountIn: PublicKey;
        tokenAccountOut: PublicKey;
        owner: PublicKey;
    };
    amountIn: BigNumberish;
    amountOut: BigNumberish;
    fixedSide: SwapSide;
}
/**
 * Swap transaction params
 */
export interface LiquiditySwapInstructionSimpleParams {
    connection: Connection;
    poolKeys: LiquidityPoolKeys;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    amountIn: CurrencyAmount | TokenAmount;
    amountOut: CurrencyAmount | TokenAmount;
    fixedSide: SwapSide;
    config?: {
        bypassAssociatedCheck?: boolean;
        checkCreateATAOwner?: boolean;
    };
}
export interface LiquidityInitPoolInstructionParamsV4 {
    poolKeys: LiquidityAssociatedPoolKeysV4;
    userKeys: {
        lpTokenAccount: PublicKey;
        payer: PublicKey;
    };
    startTime: BigNumberish;
}
/**
 * Init pool instruction params
 */
export type LiquidityInitPoolInstructionParams = LiquidityInitPoolInstructionParamsV4;
/**
 * Init pool transaction params
 */
export interface LiquidityInitPoolTransactionParams {
    connection: Connection;
    poolKeys: LiquidityAssociatedPoolKeysV4;
    userKeys: {
        tokenAccounts: TokenAccount[];
        owner: PublicKey;
        payer?: PublicKey;
    };
    baseAmount: CurrencyAmount | TokenAmount;
    quoteAmount: CurrencyAmount | TokenAmount;
    startTime?: BigNumberish;
    config?: {
        bypassAssociatedCheck?: boolean;
        checkCreateATAOwner?: boolean;
    };
}
/**
 * Fetch liquidity pool info params
 */
export interface LiquidityFetchInfoParams {
    connection: Connection;
    poolKeys: LiquidityPoolKeys;
}
/**
 * Fetch liquidity multiple pool info params
 */
export interface LiquidityFetchMultipleInfoParams {
    connection: Connection;
    pools: LiquidityPoolKeys[];
    config?: GetMultipleAccountsInfoConfig;
}
export interface LiquidityComputeAnotherAmountParams {
    poolKeys: LiquidityPoolKeys;
    poolInfo: LiquidityPoolInfo;
    amount: CurrencyAmount | TokenAmount;
    anotherCurrency: Currency | Token;
    slippage: Percent;
}
export declare const LIQUIDITY_FEES_NUMERATOR: BN;
export declare const LIQUIDITY_FEES_DENOMINATOR: BN;
export interface LiquidityComputeAmountOutParams {
    poolKeys: LiquidityPoolKeys;
    poolInfo: LiquidityPoolInfo;
    amountIn: CurrencyAmount | TokenAmount;
    currencyOut: Currency | Token;
    slippage: Percent;
}
export interface LiquidityComputeAmountInParams extends Omit<LiquidityComputeAmountOutParams, 'amountIn' | 'currencyOut'> {
    amountOut: CurrencyAmount | TokenAmount;
    currencyIn: Currency | Token;
}
export declare class Liquidity extends Base {
    static getStateLayout(version: number): import("./layout").LiquidityStateLayout;
    static getLayouts(version: number): {
        state: import("./layout").LiquidityStateLayout;
    };
    static getAssociatedId({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedAuthority({ programId }: {
        programId: PublicKey;
    }): {
        publicKey: PublicKey;
        nonce: number;
    };
    static getAssociatedBaseVault({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedQuoteVault({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedLpMint({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedLpVault({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedTargetOrders({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedWithdrawQueue({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedOpenOrders({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): PublicKey;
    static getAssociatedConfigId({ programId }: {
        programId: PublicKey;
    }): PublicKey;
    static getAssociatedPoolKeys({ version, marketVersion, marketId, baseMint, quoteMint, baseDecimals, quoteDecimals, programId, marketProgramId, }: {
        version: 4 | 5;
        marketVersion: 3;
        marketId: PublicKey;
        baseMint: PublicKey;
        quoteMint: PublicKey;
        baseDecimals: number;
        quoteDecimals: number;
        programId: PublicKey;
        marketProgramId: PublicKey;
    }): LiquidityAssociatedPoolKeys;
    static getCreatePoolFee({ connection, programId }: {
        connection: Connection;
        programId: PublicKey;
    }): Promise<BN>;
    static makeAddLiquidityInstruction(params: LiquidityAddInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static makeAddLiquidityInstructionSimple<T extends TxVersion>(params: LiquidityAddInstructionSimpleParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            lpTokenAccount: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeRemoveLiquidityInstruction(params: LiquidityRemoveInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static makeRemoveLiquidityInstructionSimple<T extends TxVersion>(params: LiquidityRemoveInstructionSimpleParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {
            lpTokenAccount: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSwapInstruction(params: LiquiditySwapInstructionParams): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static makeSwapFixedInInstruction({ poolKeys, userKeys, amountIn, minAmountOut }: LiquiditySwapFixedInInstructionParamsV4, version: number): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static makeSwapFixedOutInstruction({ poolKeys, userKeys, maxAmountIn, amountOut }: LiquiditySwapFixedOutInstructionParamsV4, version: number): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static makeSwapInstructionSimple<T extends TxVersion>(params: LiquiditySwapInstructionSimpleParams & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        computeBudgetConfig?: ComputeBudgetConfig;
    }): Promise<{
        address: {};
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeSimulatePoolInfoInstruction({ poolKeys }: {
        poolKeys: LiquidityPoolKeys;
    }): {
        address: {};
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: PublicKey[];
            instructionTypes: InstructionType[];
        };
    };
    static isV4(lsl: any): lsl is LiquidityStateV4;
    static makeCreatePoolV4InstructionV2Simple<T extends TxVersion>({ connection, programId, marketInfo, baseMintInfo, quoteMintInfo, baseAmount, quoteAmount, startTime, ownerInfo, associatedOnly, computeBudgetConfig, checkCreateATAOwner, makeTxVersion, lookupTableCache, feeDestinationId, }: {
        connection: Connection;
        programId: PublicKey;
        marketInfo: {
            marketId: PublicKey;
            programId: PublicKey;
        };
        baseMintInfo: {
            mint: PublicKey;
            decimals: number;
        };
        quoteMintInfo: {
            mint: PublicKey;
            decimals: number;
        };
        baseAmount: BN;
        quoteAmount: BN;
        startTime: BN;
        ownerInfo: {
            feePayer: PublicKey;
            wallet: PublicKey;
            tokenAccounts: TokenAccount[];
            useSOLBalance?: boolean;
        };
        associatedOnly: boolean;
        checkCreateATAOwner: boolean;
        computeBudgetConfig?: ComputeBudgetConfig;
    } & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        feeDestinationId: PublicKey;
    }): Promise<{
        address: {
            programId: PublicKey;
            ammId: PublicKey;
            ammAuthority: PublicKey;
            ammOpenOrders: PublicKey;
            lpMint: PublicKey;
            coinMint: PublicKey;
            pcMint: PublicKey;
            coinVault: PublicKey;
            pcVault: PublicKey;
            withdrawQueue: PublicKey;
            ammTargetOrders: PublicKey;
            poolTempLp: PublicKey;
            marketProgramId: PublicKey;
            marketId: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreatePoolV4InstructionV2({ programId, ammId, ammAuthority, ammOpenOrders, lpMint, coinMint, pcMint, coinVault, pcVault, ammTargetOrders, marketProgramId, marketId, userWallet, userCoinVault, userPcVault, userLpVault, nonce, openTime, coinAmount, pcAmount, lookupTableAddress, ammConfigId, feeDestinationId, }: {
        programId: PublicKey;
        ammId: PublicKey;
        ammAuthority: PublicKey;
        ammOpenOrders: PublicKey;
        lpMint: PublicKey;
        coinMint: PublicKey;
        pcMint: PublicKey;
        coinVault: PublicKey;
        pcVault: PublicKey;
        ammTargetOrders: PublicKey;
        marketProgramId: PublicKey;
        marketId: PublicKey;
        userWallet: PublicKey;
        userCoinVault: PublicKey;
        userPcVault: PublicKey;
        userLpVault: PublicKey;
        lookupTableAddress?: PublicKey;
        ammConfigId: PublicKey;
        feeDestinationId: PublicKey;
        nonce: number;
        openTime: BN;
        coinAmount: BN;
        pcAmount: BN;
    }): MakeInstructionOutType;
    static makeRemoveAllLpAndCreateClmmPosition<T extends TxVersion>({ connection, poolKeys, removeLpAmount, userKeys, clmmPoolKeys, createPositionInfo, farmInfo, computeBudgetConfig, checkCreateATAOwner, getEphemeralSigners, makeTxVersion, lookupTableCache, }: {
        connection: Connection;
        poolKeys: LiquidityPoolKeys;
        removeLpAmount: BN;
        clmmPoolKeys: ClmmPoolInfo;
        createPositionInfo: {
            tickLower: number;
            tickUpper: number;
            liquidity: BN;
            amountMaxA: BN;
            amountMaxB: BN;
        };
        userKeys: {
            tokenAccounts: TokenAccount[];
            owner: PublicKey;
            payer?: PublicKey;
        };
        farmInfo?: {
            poolKeys: FarmPoolKeys;
            amount: BN;
        };
        computeBudgetConfig?: ComputeBudgetConfig;
        checkCreateATAOwner: boolean;
        getEphemeralSigners?: (k: number) => any;
    } & {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
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
    /**
     * Fetch all pools keys from on-chain data
     */
    static fetchAllPoolKeys(connection: Connection, programId: {
        4: PublicKey;
        5: PublicKey;
    }, config?: GetMultipleAccountsInfoConfig): Promise<LiquidityPoolKeys[]>;
    /**
     * Fetch liquidity pool's info
     */
    static fetchInfo({ connection, poolKeys }: LiquidityFetchInfoParams): Promise<LiquidityPoolInfo>;
    /**
     * Fetch multiple info of liquidity pools
     */
    static fetchMultipleInfo({ connection, pools, config, }: LiquidityFetchMultipleInfoParams): Promise<LiquidityPoolInfo[]>;
    static getEnabledFeatures(poolInfo: LiquidityPoolInfo): {
        swap: boolean;
        addLiquidity: boolean;
        removeLiquidity: boolean;
    };
    static includesToken(token: Token, poolKeys: LiquidityPoolKeys): boolean;
    /**
     * Get token side of liquidity pool
     * @param token - the token provided
     * @param poolKeys - the pool keys
     * @returns token side is `base` or `quote`
     */
    static _getTokenSide(token: Token, poolKeys: LiquidityPoolKeys): AmountSide;
    /**
     * Get tokens side of liquidity pool
     * @param tokenA - the token provided
     * @param tokenB - the token provided
     * @param poolKeys - the pool keys
     * @returns tokens side array
     */
    static _getTokensSide(tokenA: Token, tokenB: Token, poolKeys: LiquidityPoolKeys): AmountSide[];
    /**
     * Get currency amount side of liquidity pool
     * @param amount - the currency amount provided
     * @param poolKeys - the pool keys
     * @returns currency amount side is `base` or `quote`
     */
    static _getAmountSide(amount: CurrencyAmount | TokenAmount, poolKeys: LiquidityPoolKeys): AmountSide;
    /**
     * Get currencies amount side of liquidity pool
     * @param amountA - the currency amount provided
     * @param amountB - the currency amount provided
     * @param poolKeys - the pool keys
     * @returns currencies amount side array
     */
    static _getAmountsSide(amountA: CurrencyAmount | TokenAmount, amountB: CurrencyAmount | TokenAmount, poolKeys: LiquidityPoolKeys): AmountSide[];
    /**
     * Compute the another currency amount of add liquidity
     *
     * @param params - {@link LiquidityComputeAnotherAmountParams}
     *
     * @returns
     * anotherCurrencyAmount - currency amount without slippage
     * @returns
     * maxAnotherCurrencyAmount - currency amount with slippage
     *
     * @returns {@link CurrencyAmount}
     *
     * @example
     * ```
     * Liquidity.computeAnotherAmount({
     *   // 1%
     *   slippage: new Percent(1, 100)
     * })
     * ```
     */
    static computeAnotherAmount({ poolKeys, poolInfo, amount, anotherCurrency, slippage, }: LiquidityComputeAnotherAmountParams): {
        anotherAmount: CurrencyAmount;
        maxAnotherAmount: CurrencyAmount;
        liquidity: BN;
    } | {
        anotherAmount: TokenAmount;
        maxAnotherAmount: TokenAmount;
        liquidity: BN;
    };
    static _computePriceImpact(currentPrice: Price, amountIn: BN, amountOut: BN): Percent;
    static getRate(poolInfo: LiquidityPoolInfo): Price;
    /**
     * Compute output currency amount of swap
     *
     * @param params - {@link LiquidityComputeAmountOutParams}
     *
     * @returns
     * amountOut - currency amount without slippage
     * @returns
     * minAmountOut - currency amount with slippage
     */
    static computeAmountOut: ({ poolKeys, poolInfo, amountIn, currencyOut, slippage, }: LiquidityComputeAmountOutParams) => {
        amountOut: CurrencyAmount;
        minAmountOut: CurrencyAmount;
        currentPrice: Price;
        executionPrice: Price | null;
        priceImpact: Percent;
        fee: CurrencyAmount;
    } | {
        amountOut: TokenAmount;
        minAmountOut: TokenAmount;
        currentPrice: Price;
        executionPrice: Price | null;
        priceImpact: Percent;
        fee: CurrencyAmount;
    };
    /**
     * Compute input currency amount of swap
     *
     * @param params - {@link ComputeCurrencyAmountInParams}
     *
     * @returns
     * amountIn - currency amount without slippage
     * @returns
     * maxAmountIn - currency amount with slippage
     */
    static computeAmountIn({ poolKeys, poolInfo, amountOut, currencyIn, slippage }: LiquidityComputeAmountInParams): {
        amountIn: CurrencyAmount;
        maxAmountIn: CurrencyAmount;
        currentPrice: Price;
        executionPrice: Price | null;
        priceImpact: Percent;
    } | {
        amountIn: TokenAmount;
        maxAmountIn: TokenAmount;
        currentPrice: Price;
        executionPrice: Price | null;
        priceImpact: Percent;
    };
}
