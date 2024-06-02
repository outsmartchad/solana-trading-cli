"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Voter = exports.VoterDepositEntry = exports.VoterLockup = exports.VoterRegistrar = exports.VoterVotingMintConfig = exports.FARM_VERSION_TO_LEDGER_LAYOUT = exports.FARM_VERSION_TO_STATE_LAYOUT = exports.FARM_LEDGER_LAYOUT_V6_1 = exports.FARM_LEDGER_LAYOUT_V5_2 = exports.FARM_LEDGER_LAYOUT_V5_1 = exports.FARM_LEDGER_LAYOUT_V3_2 = exports.FARM_LEDGER_LAYOUT_V3_1 = exports.FARM_STATE_LAYOUT_V6 = exports.FARM_STATE_LAYOUT_V5 = exports.FARM_STATE_LAYOUT_V3 = exports.REAL_FARM_STATE_LAYOUT_V6 = exports.REAL_FARM_STATE_LAYOUT_V5 = exports.REAL_FARM_STATE_LAYOUT_V3 = void 0;
const marshmallow_1 = require("../marshmallow");
const farm_1 = require("./farm");
/* ================= state layouts ================= */
exports.REAL_FARM_STATE_LAYOUT_V3 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.u64)('nonce'),
    (0, marshmallow_1.publicKey)('lpVault'),
    (0, marshmallow_1.publicKey)('rewardVault'),
    (0, marshmallow_1.publicKey)(),
    (0, marshmallow_1.publicKey)(),
    (0, marshmallow_1.u64)(),
    (0, marshmallow_1.u64)(),
    (0, marshmallow_1.u64)('totalReward'),
    (0, marshmallow_1.u128)('perShareReward'),
    (0, marshmallow_1.u64)('lastSlot'),
    (0, marshmallow_1.u64)('perSlotReward'),
]);
exports.REAL_FARM_STATE_LAYOUT_V5 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.u64)('nonce'),
    (0, marshmallow_1.publicKey)('lpVault'),
    (0, marshmallow_1.publicKey)('rewardVaultA'),
    (0, marshmallow_1.u64)('totalRewardA'),
    (0, marshmallow_1.u128)('perShareRewardA'),
    (0, marshmallow_1.u64)('perSlotRewardA'),
    (0, marshmallow_1.u8)('option'),
    (0, marshmallow_1.publicKey)('rewardVaultB'),
    (0, marshmallow_1.blob)(7),
    (0, marshmallow_1.u64)('totalRewardB'),
    (0, marshmallow_1.u128)('perShareRewardB'),
    (0, marshmallow_1.u64)('perSlotRewardB'),
    (0, marshmallow_1.u64)('lastSlot'),
    (0, marshmallow_1.publicKey)(),
]);
const FARM_STATE_LAYOUT_V6_REWARD_INFO = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('rewardState'),
    (0, marshmallow_1.u64)('rewardOpenTime'),
    (0, marshmallow_1.u64)('rewardEndTime'),
    (0, marshmallow_1.u64)('rewardLastUpdateTime'),
    (0, marshmallow_1.u64)('totalReward'),
    (0, marshmallow_1.u64)('totalRewardEmissioned'),
    (0, marshmallow_1.u64)('rewardClaimed'),
    (0, marshmallow_1.u64)('rewardPerSecond'),
    (0, marshmallow_1.u128)('accRewardPerShare'),
    (0, marshmallow_1.publicKey)('rewardVault'),
    (0, marshmallow_1.publicKey)('rewardMint'),
    (0, marshmallow_1.publicKey)('rewardSender'),
    (0, marshmallow_1.u64)('rewardType'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 15, 'padding'),
]);
exports.REAL_FARM_STATE_LAYOUT_V6 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)(),
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.u64)('nonce'),
    (0, marshmallow_1.u64)('validRewardTokenNum'),
    (0, marshmallow_1.u128)('rewardMultiplier'),
    (0, marshmallow_1.u64)('rewardPeriodMax'),
    (0, marshmallow_1.u64)('rewardPeriodMin'),
    (0, marshmallow_1.u64)('rewardPeriodExtend'),
    (0, marshmallow_1.publicKey)('lpMint'),
    (0, marshmallow_1.publicKey)('lpVault'),
    (0, marshmallow_1.seq)(FARM_STATE_LAYOUT_V6_REWARD_INFO, 5, 'rewardInfos'),
    (0, marshmallow_1.publicKey)('creator'),
    (0, marshmallow_1.publicKey)(),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 32, 'padding'),
]);
exports.FARM_STATE_LAYOUT_V3 = new Proxy(exports.REAL_FARM_STATE_LAYOUT_V3, {
    get(target, p, receiver) {
        if (p === 'decode')
            return (...decodeParams) => {
                const originalResult = target.decode(...decodeParams);
                return Object.assign(Object.assign({}, originalResult), { version: 3, rewardInfos: [
                        {
                            rewardVault: originalResult.rewardVault,
                            totalReward: originalResult.totalReward,
                            perSlotReward: originalResult.perSlotReward,
                            perShareReward: originalResult.perShareReward,
                        },
                    ] });
            };
        else
            return Reflect.get(target, p, receiver);
    },
});
exports.FARM_STATE_LAYOUT_V5 = new Proxy(exports.REAL_FARM_STATE_LAYOUT_V5, {
    get(target, p, receiver) {
        if (p === 'decode')
            return (...decodeParams) => {
                const originalResult = target.decode(...decodeParams);
                return Object.assign(Object.assign({}, originalResult), { version: 5, rewardInfos: [
                        {
                            rewardVault: originalResult.rewardVaultA,
                            totalReward: originalResult.totalRewardA,
                            perSlotReward: originalResult.perSlotRewardA,
                            perShareReward: originalResult.perShareRewardA,
                        },
                        {
                            rewardVault: originalResult.rewardVaultB,
                            totalReward: originalResult.totalRewardB,
                            perSlotReward: originalResult.perSlotRewardB,
                            perShareReward: originalResult.perShareRewardB,
                        },
                    ] });
            };
        else
            return Reflect.get(target, p, receiver);
    },
});
exports.FARM_STATE_LAYOUT_V6 = new Proxy(exports.REAL_FARM_STATE_LAYOUT_V6, {
    get(target, p, receiver) {
        if (p === 'decode')
            return (...decodeParams) => {
                const originalResult = target.decode(...decodeParams);
                return Object.assign(Object.assign({}, originalResult), { version: 6, rewardInfos: originalResult.rewardInfos.map((item) => {
                        var _a;
                        return (Object.assign(Object.assign({}, item), { rewardType: ((_a = Object.entries(farm_1.poolTypeV6).find((i) => String(i[1]) === item.rewardType.toString())) !== null && _a !== void 0 ? _a : [
                                'Standard SPL',
                            ])[0] }));
                    }) });
            };
        else
            return Reflect.get(target, p, receiver);
    },
});
/* ================= ledger layouts ================= */
exports.FARM_LEDGER_LAYOUT_V3_1 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.publicKey)('id'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('deposited'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 1, 'rewardDebts'),
]);
exports.FARM_LEDGER_LAYOUT_V3_2 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.publicKey)('id'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('deposited'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 1, 'rewardDebts'),
    (0, marshmallow_1.u64)(''),
    (0, marshmallow_1.u64)('voteLockedBalance'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 15),
]);
exports.FARM_LEDGER_LAYOUT_V5_1 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.publicKey)('id'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('deposited'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 2, 'rewardDebts'),
]);
exports.FARM_LEDGER_LAYOUT_V5_2 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.publicKey)('id'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('deposited'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 2, 'rewardDebts'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 17),
]);
exports.FARM_LEDGER_LAYOUT_V6_1 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.u64)(),
    (0, marshmallow_1.u64)('state'),
    (0, marshmallow_1.publicKey)('id'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('deposited'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u128)(), 5, 'rewardDebts'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 16),
]);
/* ================= index ================= */
// version => farm state layout
exports.FARM_VERSION_TO_STATE_LAYOUT = {
    3: exports.FARM_STATE_LAYOUT_V3,
    5: exports.FARM_STATE_LAYOUT_V5,
    6: exports.FARM_STATE_LAYOUT_V6,
};
// version => farm ledger layout
exports.FARM_VERSION_TO_LEDGER_LAYOUT = {
    3: exports.FARM_LEDGER_LAYOUT_V3_2,
    5: exports.FARM_LEDGER_LAYOUT_V5_2,
    6: exports.FARM_LEDGER_LAYOUT_V6_1,
};
exports.VoterVotingMintConfig = (0, marshmallow_1.struct)([
    (0, marshmallow_1.publicKey)('mint'),
    (0, marshmallow_1.publicKey)('grantAuthority'),
    (0, marshmallow_1.u64)('baselineVoteWeightScaledFactor'),
    (0, marshmallow_1.u64)('maxExtraLockupVoteWeightScaledFactor'),
    (0, marshmallow_1.u64)('lockupSaturationSecs'),
    (0, marshmallow_1.i8)('digitShift'), // TODO
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 7, 'reserved1'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 7, 'reserved2'),
]);
exports.VoterRegistrar = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.publicKey)('governanceProgramId'),
    (0, marshmallow_1.publicKey)('realm'),
    (0, marshmallow_1.publicKey)('realmGoverningTokenMint'),
    (0, marshmallow_1.publicKey)('realmAuthority'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 32, 'reserved1'),
    (0, marshmallow_1.seq)(exports.VoterVotingMintConfig, 4, 'votingMints'),
    (0, marshmallow_1.i64)('timeOffset'),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 7, 'reserved2'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 11, 'reserved3'),
]);
exports.VoterLockup = (0, marshmallow_1.struct)([(0, marshmallow_1.i64)('startTime'), (0, marshmallow_1.i64)('endTime'), (0, marshmallow_1.u8)('kind'), (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 15, 'reserved')]);
exports.VoterDepositEntry = (0, marshmallow_1.struct)([
    (0, marshmallow_1.seq)(exports.VoterLockup, 1, 'lockup'),
    (0, marshmallow_1.u64)('amountDeposited_native'),
    (0, marshmallow_1.u64)('amountInitiallyLockedNative'),
    (0, marshmallow_1.bool)('isUsed'),
    (0, marshmallow_1.bool)('allowClawback'),
    (0, marshmallow_1.u8)('votingMintConfigIdx'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 29, 'reserved'),
]);
exports.Voter = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.publicKey)('voterAuthority'),
    (0, marshmallow_1.publicKey)('registrar'),
    (0, marshmallow_1.seq)(exports.VoterDepositEntry, 32, 'deposits'),
    (0, marshmallow_1.u8)('voterBump'),
    (0, marshmallow_1.u8)('voterWweightRecordBump'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u8)(), 94, 'reserved'),
]);
//# sourceMappingURL=layout.js.map