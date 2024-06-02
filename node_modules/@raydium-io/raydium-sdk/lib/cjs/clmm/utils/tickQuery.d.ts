import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { TickArrayBitmapExtensionType } from '../clmm';
import { Tick, TickArray } from './tick';
export declare const FETCH_TICKARRAY_COUNT = 15;
export declare type PoolVars = {
    key: PublicKey;
    tokenA: PublicKey;
    tokenB: PublicKey;
    fee: number;
};
export declare class TickQuery {
    static getTickArrays(connection: Connection, programId: PublicKey, poolId: PublicKey, tickCurrent: number, tickSpacing: number, tickArrayBitmapArray: BN[], exTickArrayBitmap: TickArrayBitmapExtensionType): Promise<{
        [key: string]: TickArray;
    }>;
    static nextInitializedTick(programId: PublicKey, poolId: PublicKey, tickArrayCache: {
        [key: string]: TickArray;
    }, tickIndex: number, tickSpacing: number, zeroForOne: boolean): {
        nextTick: Tick;
        tickArrayAddress: PublicKey | undefined;
        tickArrayStartTickIndex: number;
    };
    static nextInitializedTickArray(tickIndex: number, tickSpacing: number, zeroForOne: boolean, tickArrayBitmap: BN[], exBitmapInfo: TickArrayBitmapExtensionType): {
        isExist: boolean;
        nextStartIndex: number;
    };
    static firstInitializedTickInOneArray(programId: PublicKey, poolId: PublicKey, tickArray: TickArray, zeroForOne: boolean): {
        nextTick: Tick | undefined;
        tickArrayAddress: PublicKey;
        tickArrayStartTickIndex: number;
    };
    static nextInitializedTickInOneArray(programId: PublicKey, poolId: PublicKey, tickArrayCache: {
        [key: string]: TickArray;
    }, tickIndex: number, tickSpacing: number, zeroForOne: boolean): {
        initializedTick: Tick | undefined;
        tickArrayAddress: PublicKey | undefined;
        tickArrayStartTickIndex: number;
    };
    static getArrayStartIndex(tickIndex: number, tickSpacing: number): number;
    static checkIsValidStartIndex(tickIndex: number, tickSpacing: number): boolean;
    static tickCount(tickSpacing: number): number;
}
