"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickArrayBitmapExtensionLayout = exports.OperationLayout = exports.TickArrayLayout = exports.TickLayout = exports.ProtocolPositionLayout = exports.PositionInfoLayout = exports.PositionRewardInfoLayout = exports.PoolInfoLayout = exports.RewardInfo = exports.ObservationInfoLayout = exports.ObservationLayout = exports.AmmConfigLayout = void 0;
const marshmallow_1 = require("../marshmallow");
const tick_1 = require("./utils/tick");
const tickarrayBitmap_1 = require("./utils/tickarrayBitmap");
exports.AmmConfigLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.u16)('index'),
    (0, marshmallow_1.publicKey)(''),
    (0, marshmallow_1.u32)('protocolFeeRate'),
    (0, marshmallow_1.u32)('tradeFeeRate'),
    (0, marshmallow_1.u16)('tickSpacing'),
    (0, marshmallow_1.u32)('fundFeeRate'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u32)(), 1, 'padding'),
    (0, marshmallow_1.publicKey)('fundOwner'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 3, 'padding'),
]);
exports.ObservationLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u32)('blockTimestamp'),
    (0, marshmallow_1.u128)('sqrtPriceX64'),
    (0, marshmallow_1.u128)('cumulativeTimePriceX64'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 1, ''),
]);
exports.ObservationInfoLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.bool)('initialized'),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.seq)(exports.ObservationLayout, 1000, 'observations'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 5, ''),
]);
exports.RewardInfo = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u8)('rewardState'),
    (0, marshmallow_1.u64)('openTime'),
    (0, marshmallow_1.u64)('endTime'),
    (0, marshmallow_1.u64)('lastUpdateTime'),
    (0, marshmallow_1.u128)('emissionsPerSecondX64'),
    (0, marshmallow_1.u64)('rewardTotalEmissioned'),
    (0, marshmallow_1.u64)('rewardClaimed'),
    (0, marshmallow_1.publicKey)('tokenMint'),
    (0, marshmallow_1.publicKey)('tokenVault'),
    (0, marshmallow_1.publicKey)('creator'),
    (0, marshmallow_1.u128)('rewardGrowthGlobalX64'),
]);
exports.PoolInfoLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.publicKey)('ammConfig'),
    (0, marshmallow_1.publicKey)('creator'),
    (0, marshmallow_1.publicKey)('mintA'),
    (0, marshmallow_1.publicKey)('mintB'),
    (0, marshmallow_1.publicKey)('vaultA'),
    (0, marshmallow_1.publicKey)('vaultB'),
    (0, marshmallow_1.publicKey)('observationId'),
    (0, marshmallow_1.u8)('mintDecimalsA'),
    (0, marshmallow_1.u8)('mintDecimalsB'),
    (0, marshmallow_1.u16)('tickSpacing'),
    (0, marshmallow_1.u128)('liquidity'),
    (0, marshmallow_1.u128)('sqrtPriceX64'),
    (0, marshmallow_1.s32)('tickCurrent'),
    (0, marshmallow_1.u16)('observationIndex'),
    (0, marshmallow_1.u16)('observationUpdateDuration'),
    (0, marshmallow_1.u128)('feeGrowthGlobalX64A'),
    (0, marshmallow_1.u128)('feeGrowthGlobalX64B'),
    (0, marshmallow_1.u64)('protocolFeesTokenA'),
    (0, marshmallow_1.u64)('protocolFeesTokenB'),
    (0, marshmallow_1.u128)('swapInAmountTokenA'),
    (0, marshmallow_1.u128)('swapOutAmountTokenB'),
    (0, marshmallow_1.u128)('swapInAmountTokenB'),
    (0, marshmallow_1.u128)('swapOutAmountTokenA'),
    (0, marshmallow_1.u8)('status'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 7, ''),
    (0, marshmallow_1.seq)(exports.RewardInfo, 3, 'rewardInfos'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 16, 'tickArrayBitmap'),
    (0, marshmallow_1.u64)('totalFeesTokenA'),
    (0, marshmallow_1.u64)('totalFeesClaimedTokenA'),
    (0, marshmallow_1.u64)('totalFeesTokenB'),
    (0, marshmallow_1.u64)('totalFeesClaimedTokenB'),
    (0, marshmallow_1.u64)('fundFeesTokenA'),
    (0, marshmallow_1.u64)('fundFeesTokenB'),
    (0, marshmallow_1.u64)('startTime'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 15 * 4 - 3, 'padding'),
]);
exports.PositionRewardInfoLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u128)('growthInsideLastX64'), (0, marshmallow_1.u64)('rewardAmountOwed')]);
exports.PositionInfoLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.publicKey)('nftMint'),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.s32)('tickLower'),
    (0, marshmallow_1.s32)('tickUpper'),
    (0, marshmallow_1.u128)('liquidity'),
    (0, marshmallow_1.u128)('feeGrowthInsideLastX64A'),
    (0, marshmallow_1.u128)('feeGrowthInsideLastX64B'),
    (0, marshmallow_1.u64)('tokenFeesOwedA'),
    (0, marshmallow_1.u64)('tokenFeesOwedB'),
    (0, marshmallow_1.seq)(exports.PositionRewardInfoLayout, 3, 'rewardInfos'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 8, ''),
]);
exports.ProtocolPositionLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.s32)('tickLowerIndex'),
    (0, marshmallow_1.s32)('tickUpperIndex'),
    (0, marshmallow_1.u128)('liquidity'),
    (0, marshmallow_1.u128)('feeGrowthInsideLastX64A'),
    (0, marshmallow_1.u128)('feeGrowthInsideLastX64B'),
    (0, marshmallow_1.u64)('tokenFeesOwedA'),
    (0, marshmallow_1.u64)('tokenFeesOwedB'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 3, 'rewardGrowthInside'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 8, ''),
]);
exports.TickLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.s32)('tick'),
    (0, marshmallow_1.i128)('liquidityNet'),
    (0, marshmallow_1.u128)('liquidityGross'),
    (0, marshmallow_1.u128)('feeGrowthOutsideX64A'),
    (0, marshmallow_1.u128)('feeGrowthOutsideX64B'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 3, 'rewardGrowthsOutsideX64'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u32)(), 13, ''),
]);
exports.TickArrayLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.s32)('startTickIndex'),
    (0, marshmallow_1.seq)(exports.TickLayout, tick_1.TICK_ARRAY_SIZE, 'ticks'),
    (0, marshmallow_1.u8)('initializedTickCount'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 115, ''),
]);
exports.OperationLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.blob)(329), (0, marshmallow_1.seq)((0, marshmallow_1.publicKey)(), 100, 'whitelistMints')]);
exports.TickArrayBitmapExtensionLayout = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.seq)((0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 8), tickarrayBitmap_1.EXTENSION_TICKARRAY_BITMAP_SIZE, 'positiveTickArrayBitmap'),
    (0, marshmallow_1.seq)((0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 8), tickarrayBitmap_1.EXTENSION_TICKARRAY_BITMAP_SIZE, 'negativeTickArrayBitmap'),
]);
//# sourceMappingURL=layout.js.map