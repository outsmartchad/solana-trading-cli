import { JsonFileMetaData } from '../common'
import { LpTokenInfo, SplTokenInfo } from '../token'

export type FarmVersion = 3 | 4 | 5 | 6

export interface FarmPoolBaseInfo {
  readonly id: string
  readonly lp: LpTokenInfo | SplTokenInfo
  readonly version: number
}

/* ================= json file ================= */
export interface FarmPoolJsonInfoV1 {
  readonly id: string
  readonly lpMint: string
  readonly rewardMints: string[]

  readonly version: number
  readonly programId: string

  readonly authority: string
  readonly lpVault: string
  readonly rewardVaults: string[]
}
interface RewardInfoV3V4V5 {
  readonly rewardMint: string
  readonly rewardVault: string
}
interface RewardInfoV6 {
  readonly rewardMint: string
  readonly rewardVault: string
  readonly rewardOpenTime: number
  readonly rewardEndTime: number
  readonly rewardPerSecond: number
  readonly rewardSender: string
  readonly rewardType: string
}
export interface FarmPoolJsonInfoV3V4V5 {
  readonly id: string
  readonly lpMint: string
  readonly version: 3 | 4 | 5
  readonly programId: string
  readonly authority: string
  readonly lpVault: string
  readonly upcoming: boolean
  readonly rewardInfos: RewardInfoV3V4V5[]
}
export interface FarmPoolJsonInfoV6 {
  readonly id: string
  readonly lpMint: string
  readonly version: 6
  readonly programId: string
  readonly authority: string
  readonly lpVault: string
  readonly rewardPeriodMax: number
  readonly rewardPeriodMin: number
  readonly rewardPeriodExtend: number
  readonly creator: string
  readonly upcoming: boolean
  readonly rewardInfos: RewardInfoV6[]
}

export type FarmPoolJsonInfo = FarmPoolJsonInfoV3V4V5 | FarmPoolJsonInfoV6

export interface FarmPoolsJsonFile extends JsonFileMetaData {
  readonly official: FarmPoolJsonInfoV1[]
}
