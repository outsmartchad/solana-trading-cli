import BN from 'bn.js';
import { ClmmPoolInfo, ClmmPoolPersonalPosition, ClmmPoolRewardInfo } from '../clmm';
import { Tick } from './tick';
export declare class PositionUtils {
    static getfeeGrowthInside(poolState: ClmmPoolInfo, tickLowerState: Tick, tickUpperState: Tick): {
        feeGrowthInsideX64A: BN;
        feeGrowthInsideBX64: BN;
    };
    static GetPositionFees(ammPool: ClmmPoolInfo, positionState: ClmmPoolPersonalPosition, tickLowerState: Tick, tickUpperState: Tick): {
        tokenFeeAmountA: BN;
        tokenFeeAmountB: BN;
    };
    static GetPositionRewards(ammPool: ClmmPoolInfo, positionState: ClmmPoolPersonalPosition, tickLowerState: Tick, tickUpperState: Tick): BN[];
    static getRewardGrowthInside(tickCurrentIndex: number, tickLowerState: Tick, tickUpperState: Tick, rewardInfos: ClmmPoolRewardInfo[]): BN[];
}
