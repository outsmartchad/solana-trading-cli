import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { ZERO } from '../../entity';
import { MAX_TICK, MIN_TICK, NEGATIVE_ONE, Q64 } from './constants';
import { MathUtil, SwapMath } from './math';
import { getPdaTickArrayAddress } from './pda';
import { TICK_ARRAY_BITMAP_SIZE, TickUtils } from './tick';
import { TickArrayBitmap, TickArrayBitmapExtension } from './tickarrayBitmap';
import { TickQuery } from './tickQuery';
export class PoolUtils {
    static getOutputAmountAndRemainAccounts(poolInfo, tickArrayCache, inputTokenMint, inputAmount, sqrtPriceLimitX64, catchLiquidityInsufficient = false) {
        const zeroForOne = inputTokenMint.equals(poolInfo.mintA.mint);
        const allNeededAccounts = [];
        const { isExist, startIndex: firstTickArrayStartIndex, nextAccountMeta, } = this.getFirstInitializedTickArray(poolInfo, zeroForOne);
        if (!isExist || firstTickArrayStartIndex === undefined || !nextAccountMeta)
            throw new Error('Invalid tick array');
        try {
            const preTick = this.preInitializedTickArrayStartIndex(poolInfo, zeroForOne);
            if (preTick.isExist) {
                const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, preTick.nextStartIndex);
                allNeededAccounts.push(address);
            }
        }
        catch (e) {
            /* empty */
        }
        allNeededAccounts.push(nextAccountMeta);
        const { allTrade, amountSpecifiedRemaining, amountCalculated: outputAmount, accounts: reaminAccounts, sqrtPriceX64: executionPrice, feeAmount, } = SwapMath.swapCompute(poolInfo.programId, poolInfo.id, tickArrayCache, poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, zeroForOne, poolInfo.ammConfig.tradeFeeRate, poolInfo.liquidity, poolInfo.tickCurrent, poolInfo.tickSpacing, poolInfo.sqrtPriceX64, inputAmount, firstTickArrayStartIndex, sqrtPriceLimitX64, catchLiquidityInsufficient);
        allNeededAccounts.push(...reaminAccounts);
        return {
            allTrade,
            realTradeAmountIn: inputAmount.sub(amountSpecifiedRemaining),
            expectedAmountOut: outputAmount.mul(NEGATIVE_ONE),
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
                const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, preTick.nextStartIndex);
                allNeededAccounts.push(address);
            }
        }
        catch (e) {
            /* empty */
        }
        allNeededAccounts.push(nextAccountMeta);
        const { amountCalculated: inputAmount, accounts: reaminAccounts, sqrtPriceX64: executionPrice, feeAmount, } = SwapMath.swapCompute(poolInfo.programId, poolInfo.id, tickArrayCache, poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, zeroForOne, poolInfo.ammConfig.tradeFeeRate, poolInfo.liquidity, poolInfo.tickCurrent, poolInfo.tickSpacing, poolInfo.sqrtPriceX64, outputAmount.mul(NEGATIVE_ONE), firstTickArrayStartIndex, sqrtPriceLimitX64);
        allNeededAccounts.push(...reaminAccounts);
        return { expectedAmountIn: inputAmount, remainingAccounts: allNeededAccounts, executionPrice, feeAmount };
    }
    static getFirstInitializedTickArray(poolInfo, zeroForOne) {
        const { isInitialized, startIndex } = PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
            poolInfo.tickCurrent,
        ])
            ? TickArrayBitmapExtension.checkTickArrayIsInit(TickQuery.getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing), poolInfo.tickSpacing, poolInfo.exBitmapInfo)
            : TickUtils.checkTickArrayIsInitialized(TickUtils.mergeTickArrayBitmap(poolInfo.tickArrayBitmap), poolInfo.tickCurrent, poolInfo.tickSpacing);
        if (isInitialized) {
            const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, startIndex);
            return {
                isExist: true,
                startIndex,
                nextAccountMeta: address,
            };
        }
        const { isExist, nextStartIndex } = this.nextInitializedTickArrayStartIndex(poolInfo, TickQuery.getArrayStartIndex(poolInfo.tickCurrent, poolInfo.tickSpacing), zeroForOne);
        if (isExist) {
            const { publicKey: address } = getPdaTickArrayAddress(poolInfo.programId, poolInfo.id, nextStartIndex);
            return {
                isExist: true,
                startIndex: nextStartIndex,
                nextAccountMeta: address,
            };
        }
        return { isExist: false, nextAccountMeta: undefined, startIndex: undefined };
    }
    static preInitializedTickArrayStartIndex(poolInfo, zeroForOne) {
        const currentOffset = Math.floor(poolInfo.tickCurrent / TickQuery.tickCount(poolInfo.tickSpacing));
        const result = !zeroForOne
            ? TickUtils.searchLowBitFromStart(poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, currentOffset - 1, 1, poolInfo.tickSpacing)
            : TickUtils.searchHightBitFromStart(poolInfo.tickArrayBitmap, poolInfo.exBitmapInfo, currentOffset + 1, 1, poolInfo.tickSpacing);
        return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 };
    }
    static nextInitializedTickArrayStartIndex(poolInfo, lastTickArrayStartIndex, zeroForOne) {
        lastTickArrayStartIndex = TickQuery.getArrayStartIndex(lastTickArrayStartIndex, poolInfo.tickSpacing);
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { isInit: startIsInit, tickIndex: startIndex } = TickArrayBitmap.nextInitializedTickArrayStartIndex(TickUtils.mergeTickArrayBitmap(poolInfo.tickArrayBitmap), lastTickArrayStartIndex, poolInfo.tickSpacing, zeroForOne);
            if (startIsInit) {
                return { isExist: true, nextStartIndex: startIndex };
            }
            lastTickArrayStartIndex = startIndex;
            const { isInit, tickIndex } = TickArrayBitmapExtension.nextInitializedTickArrayFromOneBitmap(lastTickArrayStartIndex, poolInfo.tickSpacing, zeroForOne, poolInfo.exBitmapInfo);
            if (isInit)
                return { isExist: true, nextStartIndex: tickIndex };
            lastTickArrayStartIndex = tickIndex;
            if (lastTickArrayStartIndex < MIN_TICK || lastTickArrayStartIndex > MAX_TICK)
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
    static async updatePoolRewardInfos({ connection, apiPoolInfo, chainTime, poolLiquidity, rewardInfos, }) {
        const nRewardInfo = [];
        for (let i = 0; i < rewardInfos.length; i++) {
            const _itemReward = rewardInfos[i];
            const apiRewardProgram = apiPoolInfo.rewardInfos[i]?.programId ?? (await connection.getAccountInfo(_itemReward.tokenMint))?.owner;
            if (apiRewardProgram === undefined)
                throw Error('get new reward mint info error');
            const itemReward = {
                ..._itemReward,
                perSecond: MathUtil.x64ToDecimal(_itemReward.emissionsPerSecondX64),
                remainingRewards: undefined,
                tokenProgramId: new PublicKey(apiRewardProgram),
            };
            if (itemReward.tokenMint.equals(PublicKey.default))
                continue;
            if (chainTime <= itemReward.openTime.toNumber() || poolLiquidity.eq(ZERO)) {
                nRewardInfo.push(itemReward);
                continue;
            }
            const latestUpdateTime = new BN(Math.min(itemReward.endTime.toNumber(), chainTime));
            const timeDelta = latestUpdateTime.sub(itemReward.lastUpdateTime);
            const rewardGrowthDeltaX64 = MathUtil.mulDivFloor(timeDelta, itemReward.emissionsPerSecondX64, poolLiquidity);
            const rewardGrowthGlobalX64 = itemReward.rewardGrowthGlobalX64.add(rewardGrowthDeltaX64);
            const rewardEmissionedDelta = MathUtil.mulDivFloor(timeDelta, itemReward.emissionsPerSecondX64, Q64);
            const rewardTotalEmissioned = itemReward.rewardTotalEmissioned.add(rewardEmissionedDelta);
            nRewardInfo.push({
                ...itemReward,
                rewardGrowthGlobalX64,
                rewardTotalEmissioned,
                lastUpdateTime: latestUpdateTime,
            });
        }
        return nRewardInfo;
    }
    static isOverflowDefaultTickarrayBitmap(tickSpacing, tickarrayStartIndexs) {
        const { maxTickBoundary, minTickBoundary } = this.tickRange(tickSpacing);
        for (const tickIndex of tickarrayStartIndexs) {
            const tickarrayStartIndex = TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing);
            if (tickarrayStartIndex >= maxTickBoundary || tickarrayStartIndex < minTickBoundary) {
                return true;
            }
        }
        return false;
    }
    static tickRange(tickSpacing) {
        let maxTickBoundary = TickArrayBitmap.maxTickInTickarrayBitmap(tickSpacing);
        let minTickBoundary = -maxTickBoundary;
        if (maxTickBoundary > MAX_TICK) {
            maxTickBoundary = TickQuery.getArrayStartIndex(MAX_TICK, tickSpacing) + TickQuery.tickCount(tickSpacing);
        }
        if (minTickBoundary < MIN_TICK) {
            minTickBoundary = TickQuery.getArrayStartIndex(MIN_TICK, tickSpacing);
        }
        return { maxTickBoundary, minTickBoundary };
    }
    static get_tick_array_offset(tickarrayStartIndex, tickSpacing) {
        if (!TickQuery.checkIsValidStartIndex(tickarrayStartIndex, tickSpacing)) {
            throw new Error('No enough initialized tickArray');
        }
        return (tickarrayStartIndex / TickQuery.tickCount(tickSpacing)) * TICK_ARRAY_BITMAP_SIZE;
    }
}
//# sourceMappingURL=pool.js.map