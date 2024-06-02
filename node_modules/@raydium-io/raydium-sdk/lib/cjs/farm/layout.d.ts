/// <reference types="node" />
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { GetStructureFromLayoutSchema, GetStructureSchema } from '../marshmallow';
import { poolTypeV6 } from './farm';
import { FarmVersion } from './type';
export declare const REAL_FARM_STATE_LAYOUT_V3: import("../marshmallow").Structure<PublicKey | BN, "", {
    nonce: BN;
    state: BN;
    lpVault: PublicKey;
    rewardVault: PublicKey;
    totalReward: BN;
    perShareReward: BN;
    lastSlot: BN;
    perSlotReward: BN;
}>;
export declare const REAL_FARM_STATE_LAYOUT_V5: import("../marshmallow").Structure<number | Buffer | PublicKey | BN, "", {
    option: number;
    nonce: BN;
    state: BN;
    lpVault: PublicKey;
    lastSlot: BN;
    rewardVaultA: PublicKey;
    totalRewardA: BN;
    perShareRewardA: BN;
    perSlotRewardA: BN;
    rewardVaultB: PublicKey;
    totalRewardB: BN;
    perShareRewardB: BN;
    perSlotRewardB: BN;
}>;
export declare const REAL_FARM_STATE_LAYOUT_V6: import("../marshmallow").Structure<PublicKey | BN | BN[] | {
    padding: BN[];
    rewardState: BN;
    rewardClaimed: BN;
    rewardVault: PublicKey;
    rewardMint: PublicKey;
    totalReward: BN;
    rewardOpenTime: BN;
    rewardEndTime: BN;
    rewardLastUpdateTime: BN;
    totalRewardEmissioned: BN;
    rewardPerSecond: BN;
    accRewardPerShare: BN;
    rewardSender: PublicKey;
    rewardType: BN;
}[], "", {
    nonce: BN;
    state: BN;
    lpMint: PublicKey;
    lpVault: PublicKey;
    padding: BN[];
    creator: PublicKey;
    rewardInfos: {
        padding: BN[];
        rewardState: BN;
        rewardClaimed: BN;
        rewardVault: PublicKey;
        rewardMint: PublicKey;
        totalReward: BN;
        rewardOpenTime: BN;
        rewardEndTime: BN;
        rewardLastUpdateTime: BN;
        totalRewardEmissioned: BN;
        rewardPerSecond: BN;
        accRewardPerShare: BN;
        rewardSender: PublicKey;
        rewardType: BN;
    }[];
    validRewardTokenNum: BN;
    rewardMultiplier: BN;
    rewardPeriodMax: BN;
    rewardPeriodMin: BN;
    rewardPeriodExtend: BN;
}>;
export declare const FARM_STATE_LAYOUT_V3: GetStructureFromLayoutSchema<{
    version: 3;
    rewardInfos: {
        rewardVault: PublicKey;
        totalReward: BN;
        perSlotReward: BN;
        perShareReward: BN;
    }[];
} & {
    nonce: BN;
    state: BN;
    lpVault: PublicKey;
    rewardVault: PublicKey;
    totalReward: BN;
    perShareReward: BN;
    lastSlot: BN;
    perSlotReward: BN;
}>;
export declare const FARM_STATE_LAYOUT_V5: GetStructureFromLayoutSchema<{
    version: 5;
    rewardInfos: {
        rewardVault: PublicKey;
        totalReward: BN;
        perSlotReward: BN;
        perShareReward: BN;
    }[];
} & {
    option: number;
    nonce: BN;
    state: BN;
    lpVault: PublicKey;
    lastSlot: BN;
    rewardVaultA: PublicKey;
    totalRewardA: BN;
    perShareRewardA: BN;
    perSlotRewardA: BN;
    rewardVaultB: PublicKey;
    totalRewardB: BN;
    perShareRewardB: BN;
    perSlotRewardB: BN;
}>;
export declare const FARM_STATE_LAYOUT_V6: GetStructureFromLayoutSchema<{
    version: 6;
    rewardInfos: {
        rewardState: BN;
        rewardOpenTime: BN;
        rewardEndTime: BN;
        rewardLastUpdateTime: BN;
        totalReward: BN;
        totalRewardEmissioned: BN;
        rewardClaimed: BN;
        rewardPerSecond: BN;
        accRewardPerShare: BN;
        rewardVault: PublicKey;
        rewardMint: PublicKey;
        rewardSender: PublicKey;
        rewardType: keyof typeof poolTypeV6;
    }[];
} & {
    nonce: BN;
    state: BN;
    lpMint: PublicKey;
    lpVault: PublicKey;
    padding: BN[];
    creator: PublicKey;
    rewardInfos: {
        padding: BN[];
        rewardState: BN;
        rewardClaimed: BN;
        rewardVault: PublicKey;
        rewardMint: PublicKey;
        totalReward: BN;
        rewardOpenTime: BN;
        rewardEndTime: BN;
        rewardLastUpdateTime: BN;
        totalRewardEmissioned: BN;
        rewardPerSecond: BN;
        accRewardPerShare: BN;
        rewardSender: PublicKey;
        rewardType: BN;
    }[];
    validRewardTokenNum: BN;
    rewardMultiplier: BN;
    rewardPeriodMax: BN;
    rewardPeriodMin: BN;
    rewardPeriodExtend: BN;
}>;
export type FarmStateLayoutV3 = typeof FARM_STATE_LAYOUT_V3;
export type FarmStateLayoutV5 = typeof FARM_STATE_LAYOUT_V5;
export type FarmStateLayoutV6 = typeof FARM_STATE_LAYOUT_V6;
export type FarmStateLayout = FarmStateLayoutV3 | FarmStateLayoutV5 | FarmStateLayoutV6;
export type FarmStateV3 = GetStructureSchema<FarmStateLayoutV3>;
export type FarmStateV5 = GetStructureSchema<FarmStateLayoutV5>;
export type FarmStateV6 = GetStructureSchema<FarmStateLayoutV6>;
export type FarmState = FarmStateV3 | FarmStateV5 | FarmStateV6;
export declare const FARM_LEDGER_LAYOUT_V3_1: import("../marshmallow").Structure<PublicKey | BN | BN[], "", {
    owner: PublicKey;
    state: BN;
    id: PublicKey;
    deposited: BN;
    rewardDebts: BN[];
}>;
export declare const FARM_LEDGER_LAYOUT_V3_2: import("../marshmallow").Structure<PublicKey | BN | BN[], "", {
    owner: PublicKey;
    state: BN;
    id: PublicKey;
    deposited: BN;
    rewardDebts: BN[];
    voteLockedBalance: BN;
}>;
export declare const FARM_LEDGER_LAYOUT_V5_1: import("../marshmallow").Structure<PublicKey | BN | BN[], "", {
    owner: PublicKey;
    state: BN;
    id: PublicKey;
    deposited: BN;
    rewardDebts: BN[];
}>;
export declare const FARM_LEDGER_LAYOUT_V5_2: import("../marshmallow").Structure<PublicKey | BN | BN[], "", {
    owner: PublicKey;
    state: BN;
    id: PublicKey;
    deposited: BN;
    rewardDebts: BN[];
}>;
export declare const FARM_LEDGER_LAYOUT_V6_1: import("../marshmallow").Structure<PublicKey | BN | BN[], "", {
    owner: PublicKey;
    state: BN;
    id: PublicKey;
    deposited: BN;
    rewardDebts: BN[];
}>;
export type FarmLedgerLayoutV3_1 = typeof FARM_LEDGER_LAYOUT_V3_1;
export type FarmLedgerLayoutV3_2 = typeof FARM_LEDGER_LAYOUT_V3_2;
export type FarmLedgerLayoutV5_1 = typeof FARM_LEDGER_LAYOUT_V5_1;
export type FarmLedgerLayoutV5_2 = typeof FARM_LEDGER_LAYOUT_V5_2;
export type FarmLedgerLayoutV6_1 = typeof FARM_LEDGER_LAYOUT_V6_1;
export type FarmLedgerLayout = FarmLedgerLayoutV3_1 | FarmLedgerLayoutV3_2 | FarmLedgerLayoutV5_1 | FarmLedgerLayoutV5_2 | FarmLedgerLayoutV6_1;
export type FarmLedgerV3_1 = GetStructureSchema<FarmLedgerLayoutV3_1>;
export type FarmLedgerV3_2 = GetStructureSchema<FarmLedgerLayoutV3_2>;
export type FarmLedgerV5_1 = GetStructureSchema<FarmLedgerLayoutV5_1>;
export type FarmLedgerV5_2 = GetStructureSchema<FarmLedgerLayoutV5_2>;
export type FarmLedgerV6_1 = GetStructureSchema<FarmLedgerLayoutV6_1>;
export type FarmLedger = FarmLedgerV3_1 | FarmLedgerV3_2 | FarmLedgerV5_1 | FarmLedgerV5_2 | FarmLedgerV6_1;
export declare const FARM_VERSION_TO_STATE_LAYOUT: {
    [version in FarmVersion]?: FarmStateLayout;
} & {
    [version: number]: FarmStateLayout;
};
export declare const FARM_VERSION_TO_LEDGER_LAYOUT: {
    [version in FarmVersion]?: FarmLedgerLayout;
} & {
    [version: number]: FarmLedgerLayout;
};
export declare const VoterVotingMintConfig: import("../marshmallow").Structure<number[] | PublicKey | BN | BN[], "", {
    mint: PublicKey;
    grantAuthority: PublicKey;
    baselineVoteWeightScaledFactor: BN;
    maxExtraLockupVoteWeightScaledFactor: BN;
    lockupSaturationSecs: BN;
    digitShift: BN;
    reserved1: number[];
    reserved2: BN[];
}>;
export declare const VoterRegistrar: import("../marshmallow").Structure<number | number[] | Buffer | PublicKey | BN | BN[] | {
    mint: PublicKey;
    grantAuthority: PublicKey;
    baselineVoteWeightScaledFactor: BN;
    maxExtraLockupVoteWeightScaledFactor: BN;
    lockupSaturationSecs: BN;
    digitShift: BN;
    reserved1: number[];
    reserved2: BN[];
}[], "", {
    bump: number;
    reserved1: number[];
    reserved2: number[];
    governanceProgramId: PublicKey;
    realm: PublicKey;
    realmGoverningTokenMint: PublicKey;
    realmAuthority: PublicKey;
    votingMints: {
        mint: PublicKey;
        grantAuthority: PublicKey;
        baselineVoteWeightScaledFactor: BN;
        maxExtraLockupVoteWeightScaledFactor: BN;
        lockupSaturationSecs: BN;
        digitShift: BN;
        reserved1: number[];
        reserved2: BN[];
    }[];
    timeOffset: BN;
    reserved3: BN[];
}>;
export declare const VoterLockup: import("../marshmallow").Structure<number | number[] | BN, "", {
    startTime: BN;
    endTime: BN;
    kind: number;
    reserved: number[];
}>;
export declare const VoterDepositEntry: import("../marshmallow").Structure<number | boolean | number[] | BN | {
    startTime: BN;
    endTime: BN;
    kind: number;
    reserved: number[];
}[], "", {
    allowClawback: boolean;
    reserved: number[];
    lockup: {
        startTime: BN;
        endTime: BN;
        kind: number;
        reserved: number[];
    }[];
    amountDeposited_native: BN;
    amountInitiallyLockedNative: BN;
    isUsed: boolean;
    votingMintConfigIdx: number;
}>;
export declare const Voter: import("../marshmallow").Structure<number | number[] | Buffer | PublicKey | {
    allowClawback: boolean;
    reserved: number[];
    lockup: {
        startTime: BN;
        endTime: BN;
        kind: number;
        reserved: number[];
    }[];
    amountDeposited_native: BN;
    amountInitiallyLockedNative: BN;
    isUsed: boolean;
    votingMintConfigIdx: number;
}[], "", {
    voterBump: number;
    reserved: number[];
    voterAuthority: PublicKey;
    registrar: PublicKey;
    deposits: {
        allowClawback: boolean;
        reserved: number[];
        lockup: {
            startTime: BN;
            endTime: BN;
            kind: number;
            reserved: number[];
        }[];
        amountDeposited_native: BN;
        amountInitiallyLockedNative: BN;
        isUsed: boolean;
        votingMintConfigIdx: number;
    }[];
    voterWweightRecordBump: number;
}>;
