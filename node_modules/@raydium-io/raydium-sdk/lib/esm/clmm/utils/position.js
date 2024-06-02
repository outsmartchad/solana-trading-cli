import BN from 'bn.js';
import { Q64 } from './constants';
import { MathUtil } from './math';
export class PositionUtils {
    static getfeeGrowthInside(poolState, tickLowerState, tickUpperState) {
        let feeGrowthBelowX64A = new BN(0);
        let feeGrowthBelowX64B = new BN(0);
        if (poolState.tickCurrent >= tickLowerState.tick) {
            feeGrowthBelowX64A = tickLowerState.feeGrowthOutsideX64A;
            feeGrowthBelowX64B = tickLowerState.feeGrowthOutsideX64B;
        }
        else {
            feeGrowthBelowX64A = poolState.feeGrowthGlobalX64A.sub(tickLowerState.feeGrowthOutsideX64A);
            feeGrowthBelowX64B = poolState.feeGrowthGlobalX64B.sub(tickLowerState.feeGrowthOutsideX64B);
        }
        let feeGrowthAboveX64A = new BN(0);
        let feeGrowthAboveX64B = new BN(0);
        if (poolState.tickCurrent < tickUpperState.tick) {
            feeGrowthAboveX64A = tickUpperState.feeGrowthOutsideX64A;
            feeGrowthAboveX64B = tickUpperState.feeGrowthOutsideX64B;
        }
        else {
            feeGrowthAboveX64A = poolState.feeGrowthGlobalX64A.sub(tickUpperState.feeGrowthOutsideX64A);
            feeGrowthAboveX64B = poolState.feeGrowthGlobalX64B.sub(tickUpperState.feeGrowthOutsideX64B);
        }
        const feeGrowthInsideX64A = MathUtil.wrappingSubU128(MathUtil.wrappingSubU128(poolState.feeGrowthGlobalX64A, feeGrowthBelowX64A), feeGrowthAboveX64A);
        const feeGrowthInsideBX64 = MathUtil.wrappingSubU128(MathUtil.wrappingSubU128(poolState.feeGrowthGlobalX64B, feeGrowthBelowX64B), feeGrowthAboveX64B);
        return { feeGrowthInsideX64A, feeGrowthInsideBX64 };
    }
    static GetPositionFees(ammPool, positionState, tickLowerState, tickUpperState) {
        const { feeGrowthInsideX64A, feeGrowthInsideBX64 } = this.getfeeGrowthInside(ammPool, tickLowerState, tickUpperState);
        const feeGrowthdeltaA = MathUtil.mulDivFloor(MathUtil.wrappingSubU128(feeGrowthInsideX64A, positionState.feeGrowthInsideLastX64A), positionState.liquidity, Q64);
        const tokenFeeAmountA = positionState.tokenFeesOwedA.add(feeGrowthdeltaA);
        const feeGrowthdelta1 = MathUtil.mulDivFloor(MathUtil.wrappingSubU128(feeGrowthInsideBX64, positionState.feeGrowthInsideLastX64B), positionState.liquidity, Q64);
        const tokenFeeAmountB = positionState.tokenFeesOwedB.add(feeGrowthdelta1);
        return { tokenFeeAmountA, tokenFeeAmountB };
    }
    static GetPositionRewards(ammPool, positionState, tickLowerState, tickUpperState) {
        const rewards = [];
        const rewardGrowthsInside = this.getRewardGrowthInside(ammPool.tickCurrent, tickLowerState, tickUpperState, ammPool.rewardInfos);
        for (let i = 0; i < rewardGrowthsInside.length; i++) {
            const rewardGrowthInside = rewardGrowthsInside[i];
            const currRewardInfo = positionState.rewardInfos[i];
            const rewardGrowthDelta = MathUtil.wrappingSubU128(rewardGrowthInside, currRewardInfo.growthInsideLastX64);
            const amountOwedDelta = MathUtil.mulDivFloor(rewardGrowthDelta, positionState.liquidity, Q64);
            const rewardAmountOwed = currRewardInfo.rewardAmountOwed.add(amountOwedDelta);
            rewards.push(rewardAmountOwed);
        }
        return rewards;
    }
    static getRewardGrowthInside(tickCurrentIndex, tickLowerState, tickUpperState, rewardInfos) {
        const rewardGrowthsInside = [];
        for (let i = 0; i < rewardInfos.length; i++) {
            let rewardGrowthsBelow = new BN(0);
            if (tickLowerState.liquidityGross.eqn(0)) {
                rewardGrowthsBelow = rewardInfos[i].rewardGrowthGlobalX64;
            }
            else if (tickCurrentIndex < tickLowerState.tick) {
                rewardGrowthsBelow = rewardInfos[i].rewardGrowthGlobalX64.sub(tickLowerState.rewardGrowthsOutsideX64[i]);
            }
            else {
                rewardGrowthsBelow = tickLowerState.rewardGrowthsOutsideX64[i];
            }
            let rewardGrowthsAbove = new BN(0);
            if (tickUpperState.liquidityGross.eqn(0)) {
                //
            }
            else if (tickCurrentIndex < tickUpperState.tick) {
                rewardGrowthsAbove = tickUpperState.rewardGrowthsOutsideX64[i];
            }
            else {
                rewardGrowthsAbove = rewardInfos[i].rewardGrowthGlobalX64.sub(tickUpperState.rewardGrowthsOutsideX64[i]);
            }
            rewardGrowthsInside.push(MathUtil.wrappingSubU128(MathUtil.wrappingSubU128(rewardInfos[i].rewardGrowthGlobalX64, rewardGrowthsBelow), rewardGrowthsAbove));
        }
        return rewardGrowthsInside;
    }
}
//# sourceMappingURL=position.js.map