import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { ApiClmmPoolsItem } from '../../baseInfo';
import { ClmmPoolInfo, ClmmPoolRewardInfo, ClmmPoolRewardLayoutInfo, TickArrayBitmapExtensionType } from '../clmm';
import { TickArray } from './tick';
export declare class PoolUtils {
    static getOutputAmountAndRemainAccounts(poolInfo: ClmmPoolInfo, tickArrayCache: {
        [key: string]: TickArray;
    }, inputTokenMint: PublicKey, inputAmount: BN, sqrtPriceLimitX64?: BN, catchLiquidityInsufficient?: boolean): {
        allTrade: boolean;
        realTradeAmountIn: BN;
        expectedAmountOut: BN;
        remainingAccounts: PublicKey[];
        executionPrice: BN;
        feeAmount: BN;
    };
    static getInputAmountAndRemainAccounts(poolInfo: ClmmPoolInfo, tickArrayCache: {
        [key: string]: TickArray;
    }, outputTokenMint: PublicKey, outputAmount: BN, sqrtPriceLimitX64?: BN): {
        expectedAmountIn: BN;
        remainingAccounts: PublicKey[];
        executionPrice: BN;
        feeAmount: BN;
    };
    static getFirstInitializedTickArray(poolInfo: ClmmPoolInfo, zeroForOne: boolean): {
        isExist: true;
        startIndex: number;
        nextAccountMeta: PublicKey;
    } | {
        isExist: false;
        startIndex: undefined;
        nextAccountMeta: undefined;
    };
    static preInitializedTickArrayStartIndex(poolInfo: ClmmPoolInfo, zeroForOne: boolean): {
        isExist: boolean;
        nextStartIndex: number;
    };
    static nextInitializedTickArrayStartIndex(poolInfo: {
        tickCurrent: number;
        tickSpacing: number;
        tickArrayBitmap: BN[];
        exBitmapInfo: TickArrayBitmapExtensionType;
    } | ClmmPoolInfo, lastTickArrayStartIndex: number, zeroForOne: boolean): {
        isExist: boolean;
        nextStartIndex: number;
    };
    static updatePoolRewardInfos({ connection, apiPoolInfo, chainTime, poolLiquidity, rewardInfos, }: {
        connection: Connection;
        apiPoolInfo: ApiClmmPoolsItem;
        chainTime: number;
        poolLiquidity: BN;
        rewardInfos: ClmmPoolRewardLayoutInfo[];
    }): Promise<ClmmPoolRewardInfo[]>;
    static isOverflowDefaultTickarrayBitmap(tickSpacing: number, tickarrayStartIndexs: number[]): boolean;
    static tickRange(tickSpacing: number): {
        maxTickBoundary: number;
        minTickBoundary: number;
    };
    static get_tick_array_offset(tickarrayStartIndex: number, tickSpacing: number): number;
}
//# sourceMappingURL=pool.d.ts.map