import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { TickArrayBitmapExtensionType } from '../clmm';
export declare const TICK_ARRAY_SIZE = 60;
export declare const TICK_ARRAY_BITMAP_SIZE = 512;
export type Tick = {
    tick: number;
    liquidityNet: BN;
    liquidityGross: BN;
    feeGrowthOutsideX64A: BN;
    feeGrowthOutsideX64B: BN;
    rewardGrowthsOutsideX64: BN[];
};
export type TickArray = {
    address: PublicKey;
    poolId: PublicKey;
    startTickIndex: number;
    ticks: Tick[];
    initializedTickCount: number;
};
export type TickState = {
    tick: number;
    liquidityNet: BN;
    liquidityGross: BN;
    feeGrowthOutsideX64A: BN;
    feeGrowthOutsideX64B: BN;
    tickCumulativeOutside: BN;
    secondsPerLiquidityOutsideX64: BN;
    secondsOutside: number;
    rewardGrowthsOutside: BN[];
};
export type TickArrayState = {
    ammPool: PublicKey;
    startTickIndex: number;
    ticks: TickState[];
    initializedTickCount: number;
};
export declare class TickUtils {
    static getTickArrayAddressByTick(programId: PublicKey, poolId: PublicKey, tickIndex: number, tickSpacing: number): PublicKey;
    static getTickOffsetInArray(tickIndex: number, tickSpacing: number): number;
    static getTickArrayBitIndex(tickIndex: number, tickSpacing: number): number;
    static getTickArrayStartIndexByTick(tickIndex: number, tickSpacing: number): number;
    static getTickArrayOffsetInBitmapByTick(tick: number, tickSpacing: number): number;
    static checkTickArrayIsInitialized(bitmap: BN, tick: number, tickSpacing: number): {
        isInitialized: boolean;
        startIndex: number;
    };
    static getNextTickArrayStartIndex(lastTickArrayStartIndex: number, tickSpacing: number, zeroForOne: boolean): number;
    static mergeTickArrayBitmap(bns: BN[]): BN;
    static getInitializedTickArrayInRange(tickArrayBitmap: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType, tickSpacing: number, tickArrayStartIndex: number, expectedCount: number): number[];
    static getAllInitializedTickArrayStartIndex(tickArrayBitmap: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType, tickSpacing: number): number[];
    static getAllInitializedTickArrayInfo(programId: PublicKey, poolId: PublicKey, tickArrayBitmap: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType, tickSpacing: number): {
        tickArrayStartIndex: number;
        tickArrayAddress: PublicKey;
    }[];
    static getAllInitializedTickInTickArray(tickArray: TickArrayState): TickState[];
    static searchLowBitFromStart(tickArrayBitmap: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType, currentTickArrayBitStartIndex: number, expectedCount: number, tickSpacing: number): number[];
    static searchHightBitFromStart(tickArrayBitmap: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType, currentTickArrayBitStartIndex: number, expectedCount: number, tickSpacing: number): number[];
    static checkIsOutOfBoundary(tick: number): boolean;
    static nextInitTick(tickArrayCurrent: TickArray, currentTickIndex: number, tickSpacing: number, zeroForOne: boolean, t: boolean): Tick | null;
    static firstInitializedTick(tickArrayCurrent: TickArray, zeroForOne: boolean): Tick;
}
//# sourceMappingURL=tick.d.ts.map