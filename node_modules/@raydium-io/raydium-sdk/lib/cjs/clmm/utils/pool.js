"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolUtils = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const entity_1 = require("../../entity");
const constants_1 = require("./constants");
const math_1 = require("./math");
const pda_1 = require("./pda");
const tick_1 = require("./tick");
const tickarrayBitmap_1 = require("./tickarrayBitmap");
const tickQuery_1 = require("./tickQuery");
class PoolUtils {
    static getOutputAmountAndRemainAccounts(poolInfo, tickArrayCache, inputTokenMint, inputAmount, sqrtPriceLimitX64, catchLiquidityInsufficient = false) {
        const zeroForOne = inputTokenMint.equals(poolInfo.mintA.mint);
        const allNeededAccounts = [];
        const { isExist, startIndex: firstTickArrayStartIndex, nextAccountMeta, } = this.getFirstInitializedTickArray(poolInfo, zeroForOne);
        if (!isExist || firstTickArrayStartIndex === undefined || !nextAccountMeta)
            throw new Error('Invalid tick array');
        try {
            const preTick = this.preInitializedTickArrayStartIndex(poolInfo, zeroForOne);
            if (preTick.isExist) {
                const { publicKey: address } = (0, pda_1.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, preTick.nextStartIndex);
                allNeededAccounts.push(address);
            }
        }
        catch (e) {
            /* empty */
        }
        allNeededAccounts.push(nextAccountMeta);
        const { allTrade, amountSpecifiedRemaining, amountCalculated: outputAmount, accounts: reaminAccounts, sqrtPriceX64: executionPrice, feeAmount, } = math_1.SwapMath.swapCompute(poolInfo.programId, poolInfo.id, tickArrayCache, poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, zeroForOne, poolInfo.ammConfig.tradeFeeRate, poolInfo.liquidity, poolInfo.tickCurrent, poolInfo.tickSpacing, poolInfo.sqrtPriceX64, inputAmount, firstTickArrayStartIndex, sqrtPriceLimitX64, catchLiquidityInsufficient);
        allNeededAccounts.push(...reaminAccounts);
        return {
            allTrade,
            realTradeAmountIn: inputAmount.sub(amountSpecifiedRemaining),
            expectedAmountOut: outputAmount.mul(constants_1.NEGATIVE_ONE),
            remainingAccounts: allNeededAccounts,
            executionPrice,
            feeAmount,
        };
    }
    static getInputAmountAndRemainAccounts(poolInfo, tickArrayCache, outputTokenMint, outputAmount, sqrtPriceLimitX64) {
        const zeroForOne = outputTokenMint.equals(poolInfo.mintB.mint);
        const allNeededAccounts = [];
        const { isExist, startIndex: firstTickArrayStartIndex, nextAccountMeta, } = this.getFirstInitializedTickArray(poolInfo, zeroForOne);
        if (!isExist || firstTickArrayStartIndex === undefined || !nextAccountMeta)
            throw new Error('Invalid tick array');
        try {
            const preTick = this.preInitializedTickArrayStartIndex(poolInfo, zeroForOne);
            if (preTick.isExist) {
                const { publicKey: address } = (0, pda_1.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, preTick.nextStartIndex);
                allNeededAccounts.push(address);
            }
        }
        catch (e) {
            /* empty */
        }
        allNeededAccounts.push(nextAccountMeta);
        const { amountCalculated: inputAmount, accounts: reaminAccounts, sqrtPriceX64: executionPrice, feeAmount, } = math_1.SwapMath.swapCompute(poolInfo.programId, poolInfo.id, tickArrayCache, poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, zeroForOne, poolInfo.ammConfig.tradeFeeRate, poolInfo.liquidity, poolInfo.tickCurrent, poolInfo.tickSpacing, poolInfo.sqrtPriceX64, outputAmount.mul(constants_1.NEGATIVE_ONE), firstTickArrayStartIndex, sqrtPriceLimitX64);
        allNeededAccounts.push(...reaminAccounts);
        return { expectedAmountIn: inputAmount, remainingAccounts: allNeededAccounts, executionPrice, feeAmount };
    }
    static getFirstInitializedTickArray(poolInfo, zeroForOne) {
        const { isInitialized, startIndex } = PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
            poolInfo.tickCurrent,
        ])
            ? tickarrayBitmap_1.TickArrayBitmapExtension.checkTickArrayIsInit(tickQuery_1.TickQuery.getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing), poolInfo.tickSpacing, poolInfo.exBitmapInfo)
            : tick_1.TickUtils.checkTickArrayIsInitialized(tick_1.TickUtils.mergeTickArrayBitmap(poolInfo.tickArrayBitmap), poolInfo.tickCurrent, poolInfo.tickSpacing);
        if (isInitialized) {
            const { publicKey: address } = (0, pda_1.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, startIndex);
            return {
                isExist: true,
                startIndex,
                nextAccountMeta: address,
            };
        }
        const { isExist, nextStartIndex } = this.nextInitializedTickArrayStartIndex(poolInfo, tickQuery_1.TickQuery.getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing), zeroForOne);
        if (isExist) {
            const { publicKey: address } = (0, pda_1.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, nextStartIndex);
            return {
                isExist: true,
                startIndex: nextStartIndex,
                nextAccountMeta: address,
            };
        }
        return { isExist: false, nextAccountMeta: undefined, startIndex: undefined };
    }
    static preInitializedTickArrayStartIndex(poolInfo, zeroForOne) {
        const currentOffset = Math.floor(poolInfo.tickCurrent / tickQuery_1.TickQuery.tickCount(poolInfo.tickSpacing));
        const result = !zeroForOne
            ? tick_1.TickUtils.searchLowBitFromStart(poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, currentOffset - 1, 1, poolInfo.tickSpacing)
            : tick_1.TickUtils.searchHightBitFromStart(poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, currentOffset + 1, 1, poolInfo.tickSpacing);
        return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 };
    }
    static nextInitializedTickArrayStartIndex(poolInfo, lastTickArrayStartIndex, zeroForOne) {
        lastTickArrayStartIndex = tickQuery_1.TickQuery.getArrayStartIndex(lastTickArrayStartIndex, poolInfo.tickSpacing);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { isInit: startIsInit, tickIndex: startIndex } = tickarrayBitmap_1.TickArrayBitmap.nextInitializedTickArrayStartIndex(tick_1.TickUtils.mergeTickArrayBitmap(poolInfo.tickArrayBitmap), lastTickArrayStartIndex, poolInfo.tickSpacing, zeroForOne);
            if (startIsInit) {
                return { isExist: true, nextStartIndex: startIndex };
            }
            lastTickArrayStartIndex = startIndex;
            const { isInit, tickIndex } = tickarrayBitmap_1.TickArrayBitmapExtension.nextInitializedTickArrayFromOneBitmap(lastTickArrayStartIndex, poolInfo.tickSpacing, zeroForOne, poolInfo.exBitmapInfo);
            if (isInit)
                return { isExist: true, nextStartIndex: tickIndex };
            lastTickArrayStartIndex = tickIndex;
            if (lastTickArrayStartIndex < constants_1.MIN_TICK || lastTickArrayStartIndex > constants_1.MAX_TICK)
                return { isExist: false, nextStartIndex: 0 };
        }
        // const tickArrayBitmap = TickUtils.mergeTickArrayBitmap(
        //   poolInfo.tickArrayBitmap
        // );
        // const currentOffset = TickUtils.getTickArrayOffsetInBitmapByTick(
        //   poolInfo.tickCurrent,
        //   poolInfo.tickSpacing
        // );
        // const result: number[] = zeroForOne ? TickUtils.searchLowBitFromStart(
        //   tickArrayBitmap,
        //   currentOffset - 1,
        //   0,
        //   1,
        //   poolInfo.tickSpacing
        // ) : TickUtils.searchHightBitFromStart(
        //   tickArrayBitmap,
        //   currentOffset,
        //   1024,
        //   1,
        //   poolInfo.tickSpacing
        // );
        // return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 }
    }
    static updatePoolRewardInfos({ connection, apiPoolInfo, chainTime, poolLiquidity, rewardInfos, }) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const nRewardInfo = [];
            for (let i = 0; i < rewardInfos.length; i++) {
                const _itemReward = rewardInfos[i];
                const apiRewardProgram = (_b = (_a = apiPoolInfo.rewardInfos[i]) === null || _a === void 0 ? void 0 : _a.programId) !== null && _b !== void 0 ? _b : (_c = (yield connection.getAccountInfo(_itemReward.tokenMint))) === null || _c === void 0 ? void 0 : _c.owner;
                if (apiRewardProgram === undefined)
                    throw Error('get new reward mint info error');
                const itemReward = Object.assign(Object.assign({}, _itemReward), { perSecond: math_1.MathUtil.x64ToDecimal(_itemReward.emissionsPerSecondX64), remainingRewards: undefined, tokenProgramId: new web3_js_1.PublicKey(apiRewardProgram) });
                if (itemReward.tokenMint.equals(web3_js_1.PublicKey.default))
                    continue;
                if (chainTime <= itemReward.openTime.toNumber() || poolLiquidity.eq(entity_1.ZERO)) {
                    nRewardInfo.push(itemReward);
                    continue;
                }
                const latestUpdateTime = new bn_js_1.default(Math.min(itemReward.endTime.toNumber(), chainTime));
                const timeDelta = latestUpdateTime.sub(itemReward.lastUpdateTime);
                const rewardGrowthDeltaX64 = math_1.MathUtil.mulDivFloor(timeDelta, itemReward.emissionsPerSecondX64, poolLiquidity);
                const rewardGrowthGlobalX64 = itemReward.rewardGrowthGlobalX64.add(rewardGrowthDeltaX64);
                const rewardEmissionedDelta = math_1.MathUtil.mulDivFloor(timeDelta, itemReward.emissionsPerSecondX64, constants_1.Q64);
                const rewardTotalEmissioned = itemReward.rewardTotalEmissioned.add(rewardEmissionedDelta);
                nRewardInfo.push(Object.assign(Object.assign({}, itemReward), { rewardGrowthGlobalX64,
                    rewardTotalEmissioned, lastUpdateTime: latestUpdateTime }));
            }
            return nRewardInfo;
        });
    }
    static isOverflowDefaultTickarrayBitmap(tickSpacing, tickarrayStartIndexs) {
        const { maxTickBoundary, minTickBoundary } = this.tickRange(tickSpacing);
        for (const tickIndex of tickarrayStartIndexs) {
            const tickarrayStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing);
            if (tickarrayStartIndex >= maxTickBoundary || tickarrayStartIndex < minTickBoundary) {
                return true;
            }
        }
        return false;
    }
    static tickRange(tickSpacing) {
        let maxTickBoundary = tickarrayBitmap_1.TickArrayBitmap.maxTickInTickarrayBitmap(tickSpacing);
        let minTickBoundary = -maxTickBoundary;
        if (maxTickBoundary > constants_1.MAX_TICK) {
            maxTickBoundary = tickQuery_1.TickQuery.getArrayStartIndex(constants_1.MAX_TICK, tickSpacing) + tickQuery_1.TickQuery.tickCount(tickSpacing);
        }
        if (minTickBoundary < constants_1.MIN_TICK) {
            minTickBoundary = tickQuery_1.TickQuery.getArrayStartIndex(constants_1.MIN_TICK, tickSpacing);
        }
        return { maxTickBoundary, minTickBoundary };
    }
    static get_tick_array_offset(tickarrayStartIndex, tickSpacing) {
        if (!tickQuery_1.TickQuery.checkIsValidStartIndex(tickarrayStartIndex, tickSpacing)) {
            throw new Error('No enough initialized tickArray');
        }
        return (tickarrayStartIndex / tickQuery_1.TickQuery.tickCount(tickSpacing)) * tick_1.TICK_ARRAY_BITMAP_SIZE;
    }
}
exports.PoolUtils = PoolUtils;
//# sourceMappingURL=pool.js.map