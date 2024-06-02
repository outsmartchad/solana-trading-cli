import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import {
  blob,
  bool,
  GetLayoutSchemaFromStructure,
  GetStructureFromLayoutSchema,
  GetStructureSchema,
  i64,
  i8,
  publicKey,
  seq,
  struct,
  u128,
  u64,
  u8,
} from '../marshmallow'

import { poolTypeV6 } from './farm'
import { FarmVersion } from './type'

/* ================= state layouts ================= */
export const REAL_FARM_STATE_LAYOUT_V3 = struct([
  u64('state'),
  u64('nonce'),
  publicKey('lpVault'),
  publicKey('rewardVault'),
  publicKey(),
  publicKey(),
  u64(),
  u64(),
  u64('totalReward'),
  u128('perShareReward'),
  u64('lastSlot'),
  u64('perSlotReward'),
])

export const REAL_FARM_STATE_LAYOUT_V5 = struct([
  u64('state'),
  u64('nonce'),
  publicKey('lpVault'),
  publicKey('rewardVaultA'),
  u64('totalRewardA'),
  u128('perShareRewardA'),
  u64('perSlotRewardA'),
  u8('option'),
  publicKey('rewardVaultB'),
  blob(7),
  u64('totalRewardB'),
  u128('perShareRewardB'),
  u64('perSlotRewardB'),
  u64('lastSlot'),
  publicKey(),
])

const FARM_STATE_LAYOUT_V6_REWARD_INFO = struct([
  u64('rewardState'),
  u64('rewardOpenTime'),
  u64('rewardEndTime'),
  u64('rewardLastUpdateTime'),
  u64('totalReward'),
  u64('totalRewardEmissioned'),
  u64('rewardClaimed'),
  u64('rewardPerSecond'),
  u128('accRewardPerShare'),
  publicKey('rewardVault'),
  publicKey('rewardMint'),
  publicKey('rewardSender'),
  u64('rewardType'),
  seq(u64(), 15, 'padding'),
])

export const REAL_FARM_STATE_LAYOUT_V6 = struct([
  u64(),
  u64('state'),
  u64('nonce'),
  u64('validRewardTokenNum'),
  u128('rewardMultiplier'),
  u64('rewardPeriodMax'),
  u64('rewardPeriodMin'),
  u64('rewardPeriodExtend'),
  publicKey('lpMint'),
  publicKey('lpVault'),
  seq(FARM_STATE_LAYOUT_V6_REWARD_INFO, 5, 'rewardInfos'),
  publicKey('creator'),
  publicKey(),
  seq(u64(), 32, 'padding'),
])

export const FARM_STATE_LAYOUT_V3 = new Proxy(
  REAL_FARM_STATE_LAYOUT_V3 as GetStructureFromLayoutSchema<
    {
      version: 3
      rewardInfos: {
        rewardVault: PublicKey
        totalReward: BN
        perSlotReward: BN
        perShareReward: BN
      }[]
    } & GetLayoutSchemaFromStructure<typeof REAL_FARM_STATE_LAYOUT_V3>
  >,
  {
    get(target, p, receiver) {
      if (p === 'decode')
        return (...decodeParams: Parameters<(typeof target)['decode']>) => {
          const originalResult = target.decode(...decodeParams)
          return {
            ...originalResult,
            version: 3,
            rewardInfos: [
              {
                rewardVault: originalResult.rewardVault,
                totalReward: originalResult.totalReward,
                perSlotReward: originalResult.perSlotReward,
                perShareReward: originalResult.perShareReward,
              },
            ],
          }
        }
      else return Reflect.get(target, p, receiver)
    },
  },
)

export const FARM_STATE_LAYOUT_V5 = new Proxy(
  REAL_FARM_STATE_LAYOUT_V5 as GetStructureFromLayoutSchema<
    {
      version: 5
      rewardInfos: {
        rewardVault: PublicKey
        totalReward: BN
        perSlotReward: BN
        perShareReward: BN
      }[]
    } & GetLayoutSchemaFromStructure<typeof REAL_FARM_STATE_LAYOUT_V5>
  >,
  {
    get(target, p, receiver) {
      if (p === 'decode')
        return (...decodeParams: Parameters<(typeof target)['decode']>) => {
          const originalResult = target.decode(...decodeParams)
          return {
            ...originalResult,
            version: 5,
            rewardInfos: [
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
            ],
          }
        }
      else return Reflect.get(target, p, receiver)
    },
  },
)

export const FARM_STATE_LAYOUT_V6 = new Proxy(
  REAL_FARM_STATE_LAYOUT_V6 as GetStructureFromLayoutSchema<
    {
      version: 6
      rewardInfos: {
        rewardState: BN
        rewardOpenTime: BN
        rewardEndTime: BN
        rewardLastUpdateTime: BN
        totalReward: BN
        totalRewardEmissioned: BN
        rewardClaimed: BN
        rewardPerSecond: BN
        accRewardPerShare: BN
        rewardVault: PublicKey
        rewardMint: PublicKey
        rewardSender: PublicKey
        rewardType: keyof typeof poolTypeV6
      }[]
    } & GetLayoutSchemaFromStructure<typeof REAL_FARM_STATE_LAYOUT_V6>
  >,
  {
    get(target, p, receiver) {
      if (p === 'decode')
        return (...decodeParams: Parameters<(typeof target)['decode']>) => {
          const originalResult = target.decode(...decodeParams)
          return {
            ...originalResult,
            version: 6,
            rewardInfos: originalResult.rewardInfos.map((item) => ({
              ...item,
              rewardType: (Object.entries(poolTypeV6).find((i) => String(i[1]) === item.rewardType.toString()) ?? [
                'Standard SPL',
              ])[0],
            })),
          }
        }
      else return Reflect.get(target, p, receiver)
    },
  },
)

export type FarmStateLayoutV3 = typeof FARM_STATE_LAYOUT_V3
export type FarmStateLayoutV5 = typeof FARM_STATE_LAYOUT_V5
export type FarmStateLayoutV6 = typeof FARM_STATE_LAYOUT_V6
export type FarmStateLayout = FarmStateLayoutV3 | FarmStateLayoutV5 | FarmStateLayoutV6

export type FarmStateV3 = GetStructureSchema<FarmStateLayoutV3>
export type FarmStateV5 = GetStructureSchema<FarmStateLayoutV5>
export type FarmStateV6 = GetStructureSchema<FarmStateLayoutV6>
export type FarmState = FarmStateV3 | FarmStateV5 | FarmStateV6

/* ================= ledger layouts ================= */
export const FARM_LEDGER_LAYOUT_V3_1 = struct([
  u64('state'),
  publicKey('id'),
  publicKey('owner'),
  u64('deposited'),
  seq(u64(), 1, 'rewardDebts'),
])

export const FARM_LEDGER_LAYOUT_V3_2 = struct([
  u64('state'),
  publicKey('id'),
  publicKey('owner'),
  u64('deposited'),
  seq(u128(), 1, 'rewardDebts'),
  u64(''),
  u64('voteLockedBalance'),
  seq(u64(), 15),
])

export const FARM_LEDGER_LAYOUT_V5_1 = struct([
  u64('state'),
  publicKey('id'),
  publicKey('owner'),
  u64('deposited'),
  seq(u64(), 2, 'rewardDebts'),
])

export const FARM_LEDGER_LAYOUT_V5_2 = struct([
  u64('state'),
  publicKey('id'),
  publicKey('owner'),
  u64('deposited'),
  seq(u128(), 2, 'rewardDebts'),
  seq(u64(), 17),
])

export const FARM_LEDGER_LAYOUT_V6_1 = struct([
  u64(),
  u64('state'),
  publicKey('id'),
  publicKey('owner'),
  u64('deposited'),
  seq(u128(), 5, 'rewardDebts'),
  seq(u64(), 16),
])

export type FarmLedgerLayoutV3_1 = typeof FARM_LEDGER_LAYOUT_V3_1
export type FarmLedgerLayoutV3_2 = typeof FARM_LEDGER_LAYOUT_V3_2
export type FarmLedgerLayoutV5_1 = typeof FARM_LEDGER_LAYOUT_V5_1
export type FarmLedgerLayoutV5_2 = typeof FARM_LEDGER_LAYOUT_V5_2
export type FarmLedgerLayoutV6_1 = typeof FARM_LEDGER_LAYOUT_V6_1
export type FarmLedgerLayout =
  | FarmLedgerLayoutV3_1
  | FarmLedgerLayoutV3_2
  | FarmLedgerLayoutV5_1
  | FarmLedgerLayoutV5_2
  | FarmLedgerLayoutV6_1

export type FarmLedgerV3_1 = GetStructureSchema<FarmLedgerLayoutV3_1>
export type FarmLedgerV3_2 = GetStructureSchema<FarmLedgerLayoutV3_2>
export type FarmLedgerV5_1 = GetStructureSchema<FarmLedgerLayoutV5_1>
export type FarmLedgerV5_2 = GetStructureSchema<FarmLedgerLayoutV5_2>
export type FarmLedgerV6_1 = GetStructureSchema<FarmLedgerLayoutV6_1>
export type FarmLedger = FarmLedgerV3_1 | FarmLedgerV3_2 | FarmLedgerV5_1 | FarmLedgerV5_2 | FarmLedgerV6_1

/* ================= index ================= */
// version => farm state layout
export const FARM_VERSION_TO_STATE_LAYOUT: {
  [version in FarmVersion]?: FarmStateLayout
} & {
  [version: number]: FarmStateLayout
} = {
  3: FARM_STATE_LAYOUT_V3,
  5: FARM_STATE_LAYOUT_V5,
  6: FARM_STATE_LAYOUT_V6,
}

// version => farm ledger layout
export const FARM_VERSION_TO_LEDGER_LAYOUT: {
  [version in FarmVersion]?: FarmLedgerLayout
} & {
  [version: number]: FarmLedgerLayout
} = {
  3: FARM_LEDGER_LAYOUT_V3_2,
  5: FARM_LEDGER_LAYOUT_V5_2,
  6: FARM_LEDGER_LAYOUT_V6_1,
}

export const VoterVotingMintConfig = struct([
  publicKey('mint'),
  publicKey('grantAuthority'),
  u64('baselineVoteWeightScaledFactor'),
  u64('maxExtraLockupVoteWeightScaledFactor'),
  u64('lockupSaturationSecs'),

  i8('digitShift'), // TODO
  seq(u8(), 7, 'reserved1'),
  seq(u64(), 7, 'reserved2'),
])

export const VoterRegistrar = struct([
  blob(8),
  publicKey('governanceProgramId'),
  publicKey('realm'),
  publicKey('realmGoverningTokenMint'),
  publicKey('realmAuthority'),

  seq(u8(), 32, 'reserved1'),
  seq(VoterVotingMintConfig, 4, 'votingMints'),

  i64('timeOffset'),
  u8('bump'),
  seq(u8(), 7, 'reserved2'),
  seq(u64(), 11, 'reserved3'),
])

export const VoterLockup = struct([i64('startTime'), i64('endTime'), u8('kind'), seq(u8(), 15, 'reserved')])

export const VoterDepositEntry = struct([
  seq(VoterLockup, 1, 'lockup'),
  u64('amountDeposited_native'),
  u64('amountInitiallyLockedNative'),
  bool('isUsed'),
  bool('allowClawback'),
  u8('votingMintConfigIdx'),
  seq(u8(), 29, 'reserved'),
])

export const Voter = struct([
  blob(8),
  publicKey('voterAuthority'),
  publicKey('registrar'),

  seq(VoterDepositEntry, 32, 'deposits'),

  u8('voterBump'),
  u8('voterWweightRecordBump'),
  seq(u8(), 94, 'reserved'),
])
