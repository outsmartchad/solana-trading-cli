import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { TickArrayBitmapExtensionType } from '../clmm';
import { TickArray } from './tick';
export declare class MathUtil {
    static mulDivRoundingUp(a: BN, b: BN, denominator: BN): BN;
    static mulDivFloor(a: BN, b: BN, denominator: BN): BN;
    static mulDivCeil(a: BN, b: BN, denominator: BN): BN;
    static x64ToDecimal(num: BN, decimalPlaces?: number): Decimal;
    static decimalToX64(num: Decimal): BN;
    static wrappingSubU128(n0: BN, n1: BN): BN;
}
export declare class SqrtPriceMath {
    static sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal;
    static priceToSqrtPriceX64(price: Decimal, decimalsA: number, decimalsB: number): BN;
    static getNextSqrtPriceX64FromInput(sqrtPriceX64: BN, liquidity: BN, amountIn: BN, zeroForOne: boolean): BN;
    static getNextSqrtPriceX64FromOutput(sqrtPriceX64: BN, liquidity: BN, amountOut: BN, zeroForOne: boolean): BN;
    private static getNextSqrtPriceFromTokenAmountARoundingUp;
    private static getNextSqrtPriceFromTokenAmountBRoundingDown;
    static getSqrtPriceX64FromTick(tick: number): BN;
    static getTickFromPrice(price: Decimal, decimalsA: number, decimalsB: number): number;
    static getTickFromSqrtPriceX64(sqrtPriceX64: BN): number;
}
export declare class TickMath {
    static getTickWithPriceAndTickspacing(price: Decimal, tickSpacing: number, mintDecimalsA: number, mintDecimalsB: number): number;
    static roundPriceWithTickspacing(price: Decimal, tickSpacing: number, mintDecimalsA: number, mintDecimalsB: number): Decimal;
}
export declare class LiquidityMath {
    static addDelta(x: BN, y: BN): BN;
    static getTokenAmountAFromLiquidity(sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, roundUp: boolean): BN;
    static getTokenAmountBFromLiquidity(sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, roundUp: boolean): BN;
    static getLiquidityFromTokenAmountA(sqrtPriceX64A: BN, sqrtPriceX64B: BN, amountA: BN, roundUp: boolean): BN;
    static getLiquidityFromTokenAmountB(sqrtPriceX64A: BN, sqrtPriceX64B: BN, amountB: BN): BN;
    static getLiquidityFromTokenAmounts(sqrtPriceCurrentX64: BN, sqrtPriceX64A: BN, sqrtPriceX64B: BN, amountA: BN, amountB: BN): BN;
    static getAmountsFromLiquidity(sqrtPriceCurrentX64: BN, sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, roundUp: boolean): {
        amountA: BN;
        amountB: BN;
    };
    static getAmountsFromLiquidityWithSlippage(sqrtPriceCurrentX64: BN, sqrtPriceX64A: BN, sqrtPriceX64B: BN, liquidity: BN, amountMax: boolean, roundUp: boolean, amountSlippage: number): {
        amountSlippageA: BN;
        amountSlippageB: BN;
    };
}
export interface StepComputations {
    sqrtPriceStartX64: BN;
    tickNext: number;
    initialized: boolean;
    sqrtPriceNextX64: BN;
    amountIn: BN;
    amountOut: BN;
    feeAmount: BN;
}
export declare abstract class SwapMath {
    static swapCompute(programId: PublicKey, poolId: PublicKey, tickArrayCache: {
        [key: string]: TickArray;
    }, tickArrayBitmap: BN[], tickarrayBitmapExtension: TickArrayBitmapExtensionType, zeroForOne: boolean, fee: number, liquidity: BN, currentTick: number, tickSpacing: number, currentSqrtPriceX64: BN, amountSpecified: BN, lastSavedTickArrayStartIndex: number, sqrtPriceLimitX64?: BN, catchLiquidityInsufficient?: boolean): {
        allTrade: boolean;
        amountSpecifiedRemaining: BN;
        amountCalculated: BN;
        feeAmount: BN;
        sqrtPriceX64: BN;
        liquidity: BN;
        tickCurrent: number;
        accounts: PublicKey[];
    };
    private static swapStepCompute;
}
