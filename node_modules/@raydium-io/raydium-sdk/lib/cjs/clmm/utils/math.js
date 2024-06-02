"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapMath = exports.LiquidityMath = exports.TickMath = exports.SqrtPriceMath = exports.MathUtil = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const entity_1 = require("../../entity");
const constants_1 = require("./constants");
const pda_1 = require("./pda");
const pool_1 = require("./pool");
const tick_1 = require("./tick");
const tickQuery_1 = require("./tickQuery");
class MathUtil {
    static mulDivRoundingUp(a, b, denominator) {
        const numerator = a.mul(b);
        let result = numerator.div(denominator);
        if (!numerator.mod(denominator).eq(entity_1.ZERO)) {
            result = result.add(entity_1.ONE);
        }
        return result;
    }
    static mulDivFloor(a, b, denominator) {
        if (denominator.eq(entity_1.ZERO)) {
            throw new Error('division by 0');
        }
        return a.mul(b).div(denominator);
    }
    static mulDivCeil(a, b, denominator) {
        if (denominator.eq(entity_1.ZERO)) {
            throw new Error('division by 0');
        }
        const numerator = a.mul(b).add(denominator.sub(entity_1.ONE));
        return numerator.div(denominator);
    }
    static x64ToDecimal(num, decimalPlaces) {
        return new decimal_js_1.default(num.toString()).div(decimal_js_1.default.pow(2, 64)).toDecimalPlaces(decimalPlaces);
    }
    static decimalToX64(num) {
        return new bn_js_1.default(num.mul(decimal_js_1.default.pow(2, 64)).floor().toFixed());
    }
    static wrappingSubU128(n0, n1) {
        return n0.add(constants_1.Q128).sub(n1).mod(constants_1.Q128);
    }
}
exports.MathUtil = MathUtil;
// sqrt price math
function mulRightShift(val, mulBy) {
    return signedRightShift(val.mul(mulBy), 64, 256);
}
function signedLeftShift(n0, shiftBy, bitWidth) {
    const twosN0 = n0.toTwos(bitWidth).shln(shiftBy);
    twosN0.imaskn(bitWidth + 1);
    return twosN0.fromTwos(bitWidth);
}
function signedRightShift(n0, shiftBy, bitWidth) {
    const twoN0 = n0.toTwos(bitWidth).shrn(shiftBy);
    twoN0.imaskn(bitWidth - shiftBy + 1);
    return twoN0.fromTwos(bitWidth - shiftBy);
}
class SqrtPriceMath {
    static sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB) {
        return MathUtil.x64ToDecimal(sqrtPriceX64)
            .pow(2)
            .mul(decimal_js_1.default.pow(10, decimalsA - decimalsB));
    }
    static priceToSqrtPriceX64(price, decimalsA, decimalsB) {
        return MathUtil.decimalToX64(price.mul(decimal_js_1.default.pow(10, decimalsB - decimalsA)).sqrt());
    }
    static getNextSqrtPriceX64FromInput(sqrtPriceX64, liquidity, amountIn, zeroForOne) {
        if (!sqrtPriceX64.gt(entity_1.ZERO)) {
            throw new Error('sqrtPriceX64 must greater than 0');
        }
        if (!liquidity.gt(entity_1.ZERO)) {
            throw new Error('liquidity must greater than 0');
        }
        return zeroForOne
            ? this.getNextSqrtPriceFromTokenAmountARoundingUp(sqrtPriceX64, liquidity, amountIn, true)
            : this.getNextSqrtPriceFromTokenAmountBRoundingDown(sqrtPriceX64, liquidity, amountIn, true);
    }
    static getNextSqrtPriceX64FromOutput(sqrtPriceX64, liquidity, amountOut, zeroForOne) {
        if (!sqrtPriceX64.gt(entity_1.ZERO)) {
            throw new Error('sqrtPriceX64 must greater than 0');
        }
        if (!liquidity.gt(entity_1.ZERO)) {
            throw new Error('liquidity must greater than 0');
        }
        return zeroForOne
            ? this.getNextSqrtPriceFromTokenAmountBRoundingDown(sqrtPriceX64, liquidity, amountOut, false)
            : this.getNextSqrtPriceFromTokenAmountARoundingUp(sqrtPriceX64, liquidity, amountOut, false);
    }
    static getNextSqrtPriceFromTokenAmountARoundingUp(sqrtPriceX64, liquidity, amount, add) {
        if (amount.eq(entity_1.ZERO))
            return sqrtPriceX64;
        const liquidityLeftShift = liquidity.shln(constants_1.U64Resolution);
        if (add) {
            const numerator1 = liquidityLeftShift;
            const denominator = liquidityLeftShift.add(amount.mul(sqrtPriceX64));
            if (denominator.gte(numerator1)) {
                return MathUtil.mulDivCeil(numerator1, sqrtPriceX64, denominator);
            }
            return MathUtil.mulDivRoundingUp(numerator1, entity_1.ONE, numerator1.div(sqrtPriceX64).add(amount));
        }
        else {
            const amountMulSqrtPrice = amount.mul(sqrtPriceX64);
            if (!liquidityLeftShift.gt(amountMulSqrtPrice)) {
                throw new Error('getNextSqrtPriceFromTokenAmountARoundingUp,liquidityLeftShift must gt amountMulSqrtPrice');
            }
            const denominator = liquidityLeftShift.sub(amountMulSqrtPrice);
            return MathUtil.mulDivCeil(liquidityLeftShift, sqrtPriceX64, denominator);
        }
    }
    static getNextSqrtPriceFromTokenAmountBRoundingDown(sqrtPriceX64, liquidity, amount, add) {
        const deltaY = amount.shln(constants_1.U64Resolution);
        if (add) {
            return sqrtPriceX64.add(deltaY.div(liquidity));
        }
        else {
            const amountDivLiquidity = MathUtil.mulDivRoundingUp(deltaY, entity_1.ONE, liquidity);
            if (!sqrtPriceX64.gt(amountDivLiquidity)) {
                throw new Error('getNextSqrtPriceFromTokenAmountBRoundingDown sqrtPriceX64 must gt amountDivLiquidity');
            }
            return sqrtPriceX64.sub(amountDivLiquidity);
        }
    }
    static getSqrtPriceX64FromTick(tick) {
        if (!Number.isInteger(tick)) {
            throw new Error('tick must be integer');
        }
        if (tick < constants_1.MIN_TICK || tick > constants_1.MAX_TICK) {
            throw new Error('tick must be in MIN_TICK and MAX_TICK');
        }
        const tickAbs = tick < 0 ? tick * -1 : tick;
        let ratio = (tickAbs & 0x1) != 0 ? new bn_js_1.default('18445821805675395072') : new bn_js_1.default('18446744073709551616');
        if ((tickAbs & 0x2) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18444899583751176192'));
        if ((tickAbs & 0x4) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18443055278223355904'));
        if ((tickAbs & 0x8) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18439367220385607680'));
        if ((tickAbs & 0x10) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18431993317065453568'));
        if ((tickAbs & 0x20) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18417254355718170624'));
        if ((tickAbs & 0x40) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18387811781193609216'));
        if ((tickAbs & 0x80) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18329067761203558400'));
        if ((tickAbs & 0x100) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('18212142134806163456'));
        if ((tickAbs & 0x200) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('17980523815641700352'));
        if ((tickAbs & 0x400) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('17526086738831433728'));
        if ((tickAbs & 0x800) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('16651378430235570176'));
        if ((tickAbs & 0x1000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('15030750278694412288'));
        if ((tickAbs & 0x2000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('12247334978884435968'));
        if ((tickAbs & 0x4000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('8131365268886854656'));
        if ((tickAbs & 0x8000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('3584323654725218816'));
        if ((tickAbs & 0x10000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('696457651848324352'));
        if ((tickAbs & 0x20000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('26294789957507116'));
        if ((tickAbs & 0x40000) != 0)
            ratio = mulRightShift(ratio, new bn_js_1.default('37481735321082'));
        if (tick > 0)
            ratio = constants_1.MaxUint128.div(ratio);
        return ratio;
    }
    static getTickFromPrice(price, decimalsA, decimalsB) {
        return SqrtPriceMath.getTickFromSqrtPriceX64(SqrtPriceMath.priceToSqrtPriceX64(price, decimalsA, decimalsB));
    }
    static getTickFromSqrtPriceX64(sqrtPriceX64) {
        if (sqrtPriceX64.gt(constants_1.MAX_SQRT_PRICE_X64) || sqrtPriceX64.lt(constants_1.MIN_SQRT_PRICE_X64)) {
            throw new Error('Provided sqrtPrice is not within the supported sqrtPrice range.');
        }
        const msb = sqrtPriceX64.bitLength() - 1;
        const adjustedMsb = new bn_js_1.default(msb - 64);
        const log2pIntegerX32 = signedLeftShift(adjustedMsb, 32, 128);
        let bit = new bn_js_1.default('8000000000000000', 'hex');
        let precision = 0;
        let log2pFractionX64 = new bn_js_1.default(0);
        let r = msb >= 64 ? sqrtPriceX64.shrn(msb - 63) : sqrtPriceX64.shln(63 - msb);
        while (bit.gt(new bn_js_1.default(0)) && precision < constants_1.BIT_PRECISION) {
            r = r.mul(r);
            const rMoreThanTwo = r.shrn(127);
            r = r.shrn(63 + rMoreThanTwo.toNumber());
            log2pFractionX64 = log2pFractionX64.add(bit.mul(rMoreThanTwo));
            bit = bit.shrn(1);
            precision += 1;
        }
        const log2pFractionX32 = log2pFractionX64.shrn(32);
        const log2pX32 = log2pIntegerX32.add(log2pFractionX32);
        const logbpX64 = log2pX32.mul(new bn_js_1.default(constants_1.LOG_B_2_X32));
        const tickLow = signedRightShift(logbpX64.sub(new bn_js_1.default(constants_1.LOG_B_P_ERR_MARGIN_LOWER_X64)), 64, 128).toNumber();
        const tickHigh = signedRightShift(logbpX64.add(new bn_js_1.default(constants_1.LOG_B_P_ERR_MARGIN_UPPER_X64)), 64, 128).toNumber();
        if (tickLow == tickHigh) {
            return tickLow;
        }
        else {
            const derivedTickHighSqrtPriceX64 = SqrtPriceMath.getSqrtPriceX64FromTick(tickHigh);
            return derivedTickHighSqrtPriceX64.lte(sqrtPriceX64) ? tickHigh : tickLow;
        }
    }
}
exports.SqrtPriceMath = SqrtPriceMath;
// tick math
class TickMath {
    static getTickWithPriceAndTickspacing(price, tickSpacing, mintDecimalsA, mintDecimalsB) {
        const tick = SqrtPriceMath.getTickFromSqrtPriceX64(SqrtPriceMath.priceToSqrtPriceX64(price, mintDecimalsA, mintDecimalsB));
        let result = tick / tickSpacing;
        if (result < 0) {
            result = Math.floor(result);
        }
        else {
            result = Math.ceil(result);
        }
        return result * tickSpacing;
    }
    static roundPriceWithTickspacing(price, tickSpacing, mintDecimalsA, mintDecimalsB) {
        const tick = TickMath.getTickWithPriceAndTickspacing(price, tickSpacing, mintDecimalsA, mintDecimalsB);
        const sqrtPriceX64 = SqrtPriceMath.getSqrtPriceX64FromTick(tick);
        return SqrtPriceMath.sqrtPriceX64ToPrice(sqrtPriceX64, mintDecimalsA, mintDecimalsB);
    }
}
exports.TickMath = TickMath;
class LiquidityMath {
    static addDelta(x, y) {
        return x.add(y);
    }
    static getTokenAmountAFromLiquidity(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        if (!sqrtPriceX64A.gt(entity_1.ZERO)) {
            throw new Error('sqrtPriceX64A must greater than 0');
        }
        const numerator1 = liquidity.ushln(constants_1.U64Resolution);
        const numerator2 = sqrtPriceX64B.sub(sqrtPriceX64A);
        return roundUp
            ? MathUtil.mulDivRoundingUp(MathUtil.mulDivCeil(numerator1, numerator2, sqrtPriceX64B), entity_1.ONE, sqrtPriceX64A)
            : MathUtil.mulDivFloor(numerator1, numerator2, sqrtPriceX64B).div(sqrtPriceX64A);
    }
    static getTokenAmountBFromLiquidity(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        if (!sqrtPriceX64A.gt(entity_1.ZERO)) {
            throw new Error('sqrtPriceX64A must greater than 0');
        }
        return roundUp
            ? MathUtil.mulDivCeil(liquidity, sqrtPriceX64B.sub(sqrtPriceX64A), constants_1.Q64)
            : MathUtil.mulDivFloor(liquidity, sqrtPriceX64B.sub(sqrtPriceX64A), constants_1.Q64);
    }
    static getLiquidityFromTokenAmountA(sqrtPriceX64A, sqrtPriceX64B, amountA, roundUp) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        const numerator = amountA.mul(sqrtPriceX64A).mul(sqrtPriceX64B);
        const denominator = sqrtPriceX64B.sub(sqrtPriceX64A);
        const result = numerator.div(denominator);
        if (roundUp) {
            return MathUtil.mulDivRoundingUp(result, entity_1.ONE, constants_1.MaxU64);
        }
        else {
            return result.shrn(constants_1.U64Resolution);
        }
    }
    static getLiquidityFromTokenAmountB(sqrtPriceX64A, sqrtPriceX64B, amountB) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        return MathUtil.mulDivFloor(amountB, constants_1.MaxU64, sqrtPriceX64B.sub(sqrtPriceX64A));
    }
    static getLiquidityFromTokenAmounts(sqrtPriceCurrentX64, sqrtPriceX64A, sqrtPriceX64B, amountA, amountB) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        if (sqrtPriceCurrentX64.lte(sqrtPriceX64A)) {
            return LiquidityMath.getLiquidityFromTokenAmountA(sqrtPriceX64A, sqrtPriceX64B, amountA, false);
        }
        else if (sqrtPriceCurrentX64.lt(sqrtPriceX64B)) {
            const liquidity0 = LiquidityMath.getLiquidityFromTokenAmountA(sqrtPriceCurrentX64, sqrtPriceX64B, amountA, false);
            const liquidity1 = LiquidityMath.getLiquidityFromTokenAmountB(sqrtPriceX64A, sqrtPriceCurrentX64, amountB);
            return liquidity0.lt(liquidity1) ? liquidity0 : liquidity1;
        }
        else {
            return LiquidityMath.getLiquidityFromTokenAmountB(sqrtPriceX64A, sqrtPriceX64B, amountB);
        }
    }
    static getAmountsFromLiquidity(sqrtPriceCurrentX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp) {
        if (sqrtPriceX64A.gt(sqrtPriceX64B)) {
            ;
            [sqrtPriceX64A, sqrtPriceX64B] = [sqrtPriceX64B, sqrtPriceX64A];
        }
        if (sqrtPriceCurrentX64.lte(sqrtPriceX64A)) {
            return {
                amountA: LiquidityMath.getTokenAmountAFromLiquidity(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp),
                amountB: new bn_js_1.default(0),
            };
        }
        else if (sqrtPriceCurrentX64.lt(sqrtPriceX64B)) {
            const amountA = LiquidityMath.getTokenAmountAFromLiquidity(sqrtPriceCurrentX64, sqrtPriceX64B, liquidity, roundUp);
            const amountB = LiquidityMath.getTokenAmountBFromLiquidity(sqrtPriceX64A, sqrtPriceCurrentX64, liquidity, roundUp);
            return { amountA, amountB };
        }
        else {
            return {
                amountA: new bn_js_1.default(0),
                amountB: LiquidityMath.getTokenAmountBFromLiquidity(sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp),
            };
        }
    }
    static getAmountsFromLiquidityWithSlippage(sqrtPriceCurrentX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, amountMax, roundUp, amountSlippage) {
        const { amountA, amountB } = LiquidityMath.getAmountsFromLiquidity(sqrtPriceCurrentX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, roundUp);
        const coefficient = amountMax ? 1 + amountSlippage : 1 - amountSlippage;
        const amount0Slippage = new bn_js_1.default(new decimal_js_1.default(amountA.toString()).mul(coefficient).toFixed(0));
        const amount1Slippage = new bn_js_1.default(new decimal_js_1.default(amountB.toString()).mul(coefficient).toFixed(0));
        return {
            amountSlippageA: amount0Slippage,
            amountSlippageB: amount1Slippage,
        };
    }
}
exports.LiquidityMath = LiquidityMath;
class SwapMath {
    static swapCompute(programId, poolId, tickArrayCache, tickArrayBitmap, tickarrayBitmapExtension, zeroForOne, fee, liquidity, currentTick, tickSpacing, currentSqrtPriceX64, amountSpecified, lastSavedTickArrayStartIndex, sqrtPriceLimitX64, catchLiquidityInsufficient = false) {
        if (amountSpecified.eq(entity_1.ZERO)) {
            throw new Error('amountSpecified must not be 0');
        }
        if (!sqrtPriceLimitX64)
            sqrtPriceLimitX64 = zeroForOne ? constants_1.MIN_SQRT_PRICE_X64.add(entity_1.ONE) : constants_1.MAX_SQRT_PRICE_X64.sub(entity_1.ONE);
        if (zeroForOne) {
            if (sqrtPriceLimitX64.lt(constants_1.MIN_SQRT_PRICE_X64)) {
                throw new Error('sqrtPriceX64 must greater than MIN_SQRT_PRICE_X64');
            }
            if (sqrtPriceLimitX64.gte(currentSqrtPriceX64)) {
                throw new Error('sqrtPriceX64 must smaller than current');
            }
        }
        else {
            if (sqrtPriceLimitX64.gt(constants_1.MAX_SQRT_PRICE_X64)) {
                throw new Error('sqrtPriceX64 must smaller than MAX_SQRT_PRICE_X64');
            }
            if (sqrtPriceLimitX64.lte(currentSqrtPriceX64)) {
                throw new Error('sqrtPriceX64 must greater than current');
            }
        }
        const baseInput = amountSpecified.gt(entity_1.ZERO);
        const state = {
            amountSpecifiedRemaining: amountSpecified,
            amountCalculated: entity_1.ZERO,
            sqrtPriceX64: currentSqrtPriceX64,
            tick: currentTick > lastSavedTickArrayStartIndex
                ? Math.min(lastSavedTickArrayStartIndex + tickQuery_1.TickQuery.tickCount(tickSpacing) - 1, currentTick)
                : lastSavedTickArrayStartIndex,
            accounts: [],
            liquidity,
            feeAmount: new bn_js_1.default(0),
        };
        let tickAarrayStartIndex = lastSavedTickArrayStartIndex;
        let tickArrayCurrent = tickArrayCache[lastSavedTickArrayStartIndex];
        let loopCount = 0;
        let t = !zeroForOne && tickArrayCurrent.startTickIndex === state.tick;
        while (!state.amountSpecifiedRemaining.eq(entity_1.ZERO) &&
            !state.sqrtPriceX64.eq(sqrtPriceLimitX64)
        // state.tick < MAX_TICK &&
        // state.tick > MIN_TICK
        ) {
            if (loopCount > 10) {
                // throw Error('liquidity limit')
            }
            const step = {};
            step.sqrtPriceStartX64 = state.sqrtPriceX64;
            const tickState = tick_1.TickUtils.nextInitTick(tickArrayCurrent, state.tick, tickSpacing, zeroForOne, t);
            let nextInitTick = tickState ? tickState : null; // TickUtils.firstInitializedTick(tickArrayCurrent, zeroForOne)
            let tickArrayAddress = null;
            if (!(nextInitTick === null || nextInitTick === void 0 ? void 0 : nextInitTick.liquidityGross.gtn(0))) {
                const nextInitTickArrayIndex = pool_1.PoolUtils.nextInitializedTickArrayStartIndex({
                    tickCurrent: state.tick,
                    tickSpacing,
                    tickArrayBitmap,
                    exBitmapInfo: tickarrayBitmapExtension,
                }, tickAarrayStartIndex, zeroForOne);
                if (!nextInitTickArrayIndex.isExist) {
                    if (catchLiquidityInsufficient) {
                        return {
                            allTrade: false,
                            amountSpecifiedRemaining: state.amountSpecifiedRemaining,
                            amountCalculated: state.amountCalculated,
                            feeAmount: state.feeAmount,
                            sqrtPriceX64: state.sqrtPriceX64,
                            liquidity: state.liquidity,
                            tickCurrent: state.tick,
                            accounts: state.accounts,
                        };
                    }
                    throw Error('swapCompute LiquidityInsufficient');
                }
                tickAarrayStartIndex = nextInitTickArrayIndex.nextStartIndex;
                const { publicKey: expectedNextTickArrayAddress } = (0, pda_1.getPdaTickArrayAddress)(programId, poolId, tickAarrayStartIndex);
                tickArrayAddress = expectedNextTickArrayAddress;
                tickArrayCurrent = tickArrayCache[tickAarrayStartIndex];
                try {
                    nextInitTick = tick_1.TickUtils.firstInitializedTick(tickArrayCurrent, zeroForOne);
                }
                catch (e) {
                    throw Error('not found next tick info');
                }
            }
            step.tickNext = nextInitTick.tick;
            step.initialized = nextInitTick.liquidityGross.gtn(0);
            if (lastSavedTickArrayStartIndex !== tickAarrayStartIndex && tickArrayAddress) {
                state.accounts.push(tickArrayAddress);
                lastSavedTickArrayStartIndex = tickAarrayStartIndex;
            }
            if (step.tickNext < constants_1.MIN_TICK) {
                step.tickNext = constants_1.MIN_TICK;
            }
            else if (step.tickNext > constants_1.MAX_TICK) {
                step.tickNext = constants_1.MAX_TICK;
            }
            step.sqrtPriceNextX64 = SqrtPriceMath.getSqrtPriceX64FromTick(step.tickNext);
            let targetPrice;
            if ((zeroForOne && step.sqrtPriceNextX64.lt(sqrtPriceLimitX64)) ||
                (!zeroForOne && step.sqrtPriceNextX64.gt(sqrtPriceLimitX64))) {
                targetPrice = sqrtPriceLimitX64;
            }
            else {
                targetPrice = step.sqrtPriceNextX64;
            }
            ;
            [state.sqrtPriceX64, step.amountIn, step.amountOut, step.feeAmount] = SwapMath.swapStepCompute(state.sqrtPriceX64, targetPrice, state.liquidity, state.amountSpecifiedRemaining, fee);
            state.feeAmount = state.feeAmount.add(step.feeAmount);
            if (baseInput) {
                state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.sub(step.amountIn.add(step.feeAmount));
                state.amountCalculated = state.amountCalculated.sub(step.amountOut);
            }
            else {
                state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.add(step.amountOut);
                state.amountCalculated = state.amountCalculated.add(step.amountIn.add(step.feeAmount));
            }
            if (state.sqrtPriceX64.eq(step.sqrtPriceNextX64)) {
                if (step.initialized) {
                    let liquidityNet = nextInitTick.liquidityNet;
                    if (zeroForOne)
                        liquidityNet = liquidityNet.mul(constants_1.NEGATIVE_ONE);
                    state.liquidity = LiquidityMath.addDelta(state.liquidity, liquidityNet);
                }
                t = step.tickNext != state.tick && !zeroForOne && tickArrayCurrent.startTickIndex === step.tickNext;
                state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext; //
            }
            else if (state.sqrtPriceX64 != step.sqrtPriceStartX64) {
                const _T = SqrtPriceMath.getTickFromSqrtPriceX64(state.sqrtPriceX64);
                t = _T != state.tick && !zeroForOne && tickArrayCurrent.startTickIndex === _T;
                state.tick = _T;
            }
            ++loopCount;
        }
        try {
            const { nextStartIndex: tickAarrayStartIndex, isExist } = tickQuery_1.TickQuery.nextInitializedTickArray(state.tick, tickSpacing, zeroForOne, tickArrayBitmap, tickarrayBitmapExtension);
            if (isExist && lastSavedTickArrayStartIndex !== tickAarrayStartIndex) {
                state.accounts.push((0, pda_1.getPdaTickArrayAddress)(programId, poolId, tickAarrayStartIndex).publicKey);
                lastSavedTickArrayStartIndex = tickAarrayStartIndex;
            }
        }
        catch (e) {
            /* empty */
        }
        return {
            allTrade: true,
            amountSpecifiedRemaining: entity_1.ZERO,
            amountCalculated: state.amountCalculated,
            feeAmount: state.feeAmount,
            sqrtPriceX64: state.sqrtPriceX64,
            liquidity: state.liquidity,
            tickCurrent: state.tick,
            accounts: state.accounts,
        };
    }
    static swapStepCompute(sqrtPriceX64Current, sqrtPriceX64Target, liquidity, amountRemaining, feeRate) {
        const swapStep = {
            sqrtPriceX64Next: new bn_js_1.default(0),
            amountIn: new bn_js_1.default(0),
            amountOut: new bn_js_1.default(0),
            feeAmount: new bn_js_1.default(0),
        };
        const zeroForOne = sqrtPriceX64Current.gte(sqrtPriceX64Target);
        const baseInput = amountRemaining.gte(entity_1.ZERO);
        if (baseInput) {
            const amountRemainingSubtractFee = MathUtil.mulDivFloor(amountRemaining, constants_1.FEE_RATE_DENOMINATOR.sub(new bn_js_1.default(feeRate.toString())), constants_1.FEE_RATE_DENOMINATOR);
            swapStep.amountIn = zeroForOne
                ? LiquidityMath.getTokenAmountAFromLiquidity(sqrtPriceX64Target, sqrtPriceX64Current, liquidity, true)
                : LiquidityMath.getTokenAmountBFromLiquidity(sqrtPriceX64Current, sqrtPriceX64Target, liquidity, true);
            if (amountRemainingSubtractFee.gte(swapStep.amountIn)) {
                swapStep.sqrtPriceX64Next = sqrtPriceX64Target;
            }
            else {
                swapStep.sqrtPriceX64Next = SqrtPriceMath.getNextSqrtPriceX64FromInput(sqrtPriceX64Current, liquidity, amountRemainingSubtractFee, zeroForOne);
            }
        }
        else {
            swapStep.amountOut = zeroForOne
                ? LiquidityMath.getTokenAmountBFromLiquidity(sqrtPriceX64Target, sqrtPriceX64Current, liquidity, false)
                : LiquidityMath.getTokenAmountAFromLiquidity(sqrtPriceX64Current, sqrtPriceX64Target, liquidity, false);
            if (amountRemaining.mul(constants_1.NEGATIVE_ONE).gte(swapStep.amountOut)) {
                swapStep.sqrtPriceX64Next = sqrtPriceX64Target;
            }
            else {
                swapStep.sqrtPriceX64Next = SqrtPriceMath.getNextSqrtPriceX64FromOutput(sqrtPriceX64Current, liquidity, amountRemaining.mul(constants_1.NEGATIVE_ONE), zeroForOne);
            }
        }
        const reachTargetPrice = sqrtPriceX64Target.eq(swapStep.sqrtPriceX64Next);
        if (zeroForOne) {
            if (!(reachTargetPrice && baseInput)) {
                swapStep.amountIn = LiquidityMath.getTokenAmountAFromLiquidity(swapStep.sqrtPriceX64Next, sqrtPriceX64Current, liquidity, true);
            }
            if (!(reachTargetPrice && !baseInput)) {
                swapStep.amountOut = LiquidityMath.getTokenAmountBFromLiquidity(swapStep.sqrtPriceX64Next, sqrtPriceX64Current, liquidity, false);
            }
        }
        else {
            swapStep.amountIn =
                reachTargetPrice && baseInput
                    ? swapStep.amountIn
                    : LiquidityMath.getTokenAmountBFromLiquidity(sqrtPriceX64Current, swapStep.sqrtPriceX64Next, liquidity, true);
            swapStep.amountOut =
                reachTargetPrice && !baseInput
                    ? swapStep.amountOut
                    : LiquidityMath.getTokenAmountAFromLiquidity(sqrtPriceX64Current, swapStep.sqrtPriceX64Next, liquidity, false);
        }
        if (!baseInput && swapStep.amountOut.gt(amountRemaining.mul(constants_1.NEGATIVE_ONE))) {
            swapStep.amountOut = amountRemaining.mul(constants_1.NEGATIVE_ONE);
        }
        if (baseInput && !swapStep.sqrtPriceX64Next.eq(sqrtPriceX64Target)) {
            swapStep.feeAmount = amountRemaining.sub(swapStep.amountIn);
        }
        else {
            swapStep.feeAmount = MathUtil.mulDivCeil(swapStep.amountIn, new bn_js_1.default(feeRate), constants_1.FEE_RATE_DENOMINATOR.sub(new bn_js_1.default(feeRate)));
        }
        return [swapStep.sqrtPriceX64Next, swapStep.amountIn, swapStep.amountOut, swapStep.feeAmount];
    }
}
exports.SwapMath = SwapMath;
//# sourceMappingURL=math.js.map