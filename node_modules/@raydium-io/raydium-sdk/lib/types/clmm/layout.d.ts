/// <reference types="node" />
/// <reference types="bn.js" />
/// <reference types="@solana/web3.js" />
export declare const AmmConfigLayout: import("../marshmallow").Structure<number | number[] | Buffer | import("@solana/web3.js").PublicKey | import("bn.js")[], "", {
    padding: number[] | import("bn.js")[];
    bump: number;
    index: number;
    protocolFeeRate: number;
    tradeFeeRate: number;
    tickSpacing: number;
    fundFeeRate: number;
    fundOwner: import("@solana/web3.js").PublicKey;
}>;
export declare const ObservationLayout: import("../marshmallow").Structure<number | import("bn.js") | import("bn.js")[], "", {
    sqrtPriceX64: import("bn.js");
    blockTimestamp: number;
    cumulativeTimePriceX64: import("bn.js");
}>;
export declare const ObservationInfoLayout: import("../marshmallow").Structure<boolean | Buffer | import("@solana/web3.js").PublicKey | import("bn.js")[] | {
    sqrtPriceX64: import("bn.js");
    blockTimestamp: number;
    cumulativeTimePriceX64: import("bn.js");
}[], "", {
    poolId: import("@solana/web3.js").PublicKey;
    initialized: boolean;
    observations: {
        sqrtPriceX64: import("bn.js");
        blockTimestamp: number;
        cumulativeTimePriceX64: import("bn.js");
    }[];
}>;
export declare const RewardInfo: import("../marshmallow").Structure<number | import("@solana/web3.js").PublicKey | import("bn.js"), "", {
    openTime: import("bn.js");
    endTime: import("bn.js");
    emissionsPerSecondX64: import("bn.js");
    rewardState: number;
    lastUpdateTime: import("bn.js");
    rewardTotalEmissioned: import("bn.js");
    rewardClaimed: import("bn.js");
    tokenMint: import("@solana/web3.js").PublicKey;
    tokenVault: import("@solana/web3.js").PublicKey;
    creator: import("@solana/web3.js").PublicKey;
    rewardGrowthGlobalX64: import("bn.js");
}>;
export declare const PoolInfoLayout: import("../marshmallow").Structure<number | number[] | Buffer | import("@solana/web3.js").PublicKey | import("bn.js") | import("bn.js")[] | {
    openTime: import("bn.js");
    endTime: import("bn.js");
    emissionsPerSecondX64: import("bn.js");
    rewardState: number;
    lastUpdateTime: import("bn.js");
    rewardTotalEmissioned: import("bn.js");
    rewardClaimed: import("bn.js");
    tokenMint: import("@solana/web3.js").PublicKey;
    tokenVault: import("@solana/web3.js").PublicKey;
    creator: import("@solana/web3.js").PublicKey;
    rewardGrowthGlobalX64: import("bn.js");
}[], "", {
    status: number;
    padding: import("bn.js")[];
    sqrtPriceX64: import("bn.js");
    startTime: import("bn.js");
    liquidity: import("bn.js");
    bump: number;
    tickSpacing: number;
    creator: import("@solana/web3.js").PublicKey;
    ammConfig: import("@solana/web3.js").PublicKey;
    mintA: import("@solana/web3.js").PublicKey;
    mintB: import("@solana/web3.js").PublicKey;
    vaultA: import("@solana/web3.js").PublicKey;
    vaultB: import("@solana/web3.js").PublicKey;
    observationId: import("@solana/web3.js").PublicKey;
    mintDecimalsA: number;
    mintDecimalsB: number;
    tickCurrent: number;
    observationIndex: number;
    observationUpdateDuration: number;
    feeGrowthGlobalX64A: import("bn.js");
    feeGrowthGlobalX64B: import("bn.js");
    protocolFeesTokenA: import("bn.js");
    protocolFeesTokenB: import("bn.js");
    swapInAmountTokenA: import("bn.js");
    swapOutAmountTokenB: import("bn.js");
    swapInAmountTokenB: import("bn.js");
    swapOutAmountTokenA: import("bn.js");
    rewardInfos: {
        openTime: import("bn.js");
        endTime: import("bn.js");
        emissionsPerSecondX64: import("bn.js");
        rewardState: number;
        lastUpdateTime: import("bn.js");
        rewardTotalEmissioned: import("bn.js");
        rewardClaimed: import("bn.js");
        tokenMint: import("@solana/web3.js").PublicKey;
        tokenVault: import("@solana/web3.js").PublicKey;
        creator: import("@solana/web3.js").PublicKey;
        rewardGrowthGlobalX64: import("bn.js");
    }[];
    tickArrayBitmap: import("bn.js")[];
    totalFeesTokenA: import("bn.js");
    totalFeesClaimedTokenA: import("bn.js");
    totalFeesTokenB: import("bn.js");
    totalFeesClaimedTokenB: import("bn.js");
    fundFeesTokenA: import("bn.js");
    fundFeesTokenB: import("bn.js");
}>;
export declare const PositionRewardInfoLayout: import("../marshmallow").Structure<import("bn.js"), "", {
    growthInsideLastX64: import("bn.js");
    rewardAmountOwed: import("bn.js");
}>;
export declare const PositionInfoLayout: import("../marshmallow").Structure<number | Buffer | import("@solana/web3.js").PublicKey | import("bn.js") | import("bn.js")[] | {
    growthInsideLastX64: import("bn.js");
    rewardAmountOwed: import("bn.js");
}[], "", {
    liquidity: import("bn.js");
    poolId: import("@solana/web3.js").PublicKey;
    bump: number;
    rewardInfos: {
        growthInsideLastX64: import("bn.js");
        rewardAmountOwed: import("bn.js");
    }[];
    nftMint: import("@solana/web3.js").PublicKey;
    tickLower: number;
    tickUpper: number;
    feeGrowthInsideLastX64A: import("bn.js");
    feeGrowthInsideLastX64B: import("bn.js");
    tokenFeesOwedA: import("bn.js");
    tokenFeesOwedB: import("bn.js");
}>;
export declare const ProtocolPositionLayout: import("../marshmallow").Structure<number | Buffer | import("@solana/web3.js").PublicKey | import("bn.js") | import("bn.js")[], "", {
    tickLowerIndex: number;
    tickUpperIndex: number;
    liquidity: import("bn.js");
    poolId: import("@solana/web3.js").PublicKey;
    bump: number;
    feeGrowthInsideLastX64A: import("bn.js");
    feeGrowthInsideLastX64B: import("bn.js");
    tokenFeesOwedA: import("bn.js");
    tokenFeesOwedB: import("bn.js");
    rewardGrowthInside: import("bn.js")[];
}>;
export declare const TickLayout: import("../marshmallow").Structure<number | number[] | import("bn.js") | import("bn.js")[], "", {
    tick: number;
    liquidityNet: import("bn.js");
    liquidityGross: import("bn.js");
    feeGrowthOutsideX64A: import("bn.js");
    feeGrowthOutsideX64B: import("bn.js");
    rewardGrowthsOutsideX64: import("bn.js")[];
}>;
export declare const TickArrayLayout: import("../marshmallow").Structure<number | number[] | Buffer | import("@solana/web3.js").PublicKey | {
    tick: number;
    liquidityNet: import("bn.js");
    liquidityGross: import("bn.js");
    feeGrowthOutsideX64A: import("bn.js");
    feeGrowthOutsideX64B: import("bn.js");
    rewardGrowthsOutsideX64: import("bn.js")[];
}[], "", {
    poolId: import("@solana/web3.js").PublicKey;
    startTickIndex: number;
    ticks: {
        tick: number;
        liquidityNet: import("bn.js");
        liquidityGross: import("bn.js");
        feeGrowthOutsideX64A: import("bn.js");
        feeGrowthOutsideX64B: import("bn.js");
        rewardGrowthsOutsideX64: import("bn.js")[];
    }[];
    initializedTickCount: number;
}>;
export declare const OperationLayout: import("../marshmallow").Structure<Buffer | import("@solana/web3.js").PublicKey[], "", {
    whitelistMints: import("@solana/web3.js").PublicKey[];
}>;
export declare const TickArrayBitmapExtensionLayout: import("../marshmallow").Structure<Buffer | import("@solana/web3.js").PublicKey | import("bn.js")[][], "", {
    poolId: import("@solana/web3.js").PublicKey;
    positiveTickArrayBitmap: import("bn.js")[][];
    negativeTickArrayBitmap: import("bn.js")[][];
}>;
//# sourceMappingURL=layout.d.ts.map