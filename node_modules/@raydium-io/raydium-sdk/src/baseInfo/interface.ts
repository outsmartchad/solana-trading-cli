export interface ApiTime {
  offset: number
}
export interface ApiInfo {
  tvl: number
  volume24h: number
  totalvolume: number
}

export interface ApiPairsItem {
  name: string
  ammId: string
  lpMint: string
  market: string
  liquidity: number
  volume24h: number
  volume24hQuote: number
  fee24h: number
  fee24hQuote: number
  volume7d: number
  volume7dQuote: number
  fee7d: number
  fee7dQuote: number
  volume30d: number
  volume30dQuote: number
  fee30d: number
  fee30dQuote: number
  price: number
  lpPrice: number
  tokenAmountCoin: number
  tokenAmountPc: number
  tokenAmountLp: number
  apr24h: number
  apr7d: number
  apr30d: number
}

export type ApiPairs = ApiPairsItem[]

export interface ApiPrice {
  [mint: string]: number
}

export interface ApiRpcsItem {
  url: string
  weight: number
  batch: boolean
  name: string
}
export interface ApiRpcs {
  rpcs: ApiRpcsItem[]
  strategy: 'weight' | 'speed'
}

export interface ApiVersion {
  latest: string
  least: string
}

export interface ApiFarmAprV3 {
  name: string
  id: string
  version: 3
  apr: string
  aprA: null
  aprB: null
  aprC: null
  aprD: null
  aprE: null
  tvl: number
  lpPrice: number
}

export interface ApiFarmAprV5 {
  name: string
  id: string
  version: 5
  apr: string
  aprA: string
  aprB: string
  aprC: null
  aprD: null
  aprE: null
  tvl: number
  lpPrice: number
}

export interface ApiFarmAprV6 {
  name: string
  id: string
  version: 3
  apr: string
  aprA: string
  aprB: string
  aprC: string
  aprD: string
  aprE: string
  tvl: number
  lpPrice: number
}

export type ApiFarmApr = ApiFarmAprV3 | ApiFarmAprV5 | ApiFarmAprV6

export interface ApiFarmAprLinePoint {
  time: number
  apr: number
}

export interface ApiFarmAprLine {
  success: true
  data: ApiFarmAprLinePoint[]
}

export interface ApiTokenInfoItem {
  symbol: string
  name: string
  mint: string
  decimals: number
  extensions: { coingeckoId?: string; version?: 'TOKEN2022' }
  icon: string
  hasFreeze: 0 | 1
}

export interface ApiTokenInfo {
  official: ApiTokenInfoItem[]
  unOfficial: ApiTokenInfoItem[]
  unNamed: { mint: string; decimals: number; hasFreeze: 0 | 1; extensions: { version?: 'TOKEN2022' } }[]
  blacklist: string[]
}

export interface ApiPoolInfoV4 {
  id: string
  baseMint: string
  quoteMint: string
  lpMint: string
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
  version: 4
  programId: string
  authority: string
  openOrders: string
  targetOrders: string
  baseVault: string
  quoteVault: string
  withdrawQueue: string
  lpVault: string
  marketVersion: 3
  marketProgramId: string
  marketId: string
  marketAuthority: string
  marketBaseVault: string
  marketQuoteVault: string
  marketBids: string
  marketAsks: string
  marketEventQueue: string
  lookupTableAccount: string
}

export interface ApiPoolInfoV5 {
  id: string
  baseMint: string
  quoteMint: string
  lpMint: string
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
  version: 5
  programId: string
  authority: string
  openOrders: string
  targetOrders: string
  baseVault: string
  quoteVault: string
  withdrawQueue: string
  lpVault: string
  marketVersion: 3
  marketProgramId: string
  marketId: string
  marketAuthority: string
  marketBaseVault: string
  marketQuoteVault: string
  marketBids: string
  marketAsks: string
  marketEventQueue: string
  modelDataAccount: string
  lookupTableAccount: string
}
export type ApiPoolInfoItem = ApiPoolInfoV4 | ApiPoolInfoV5

export interface ApiPoolInfo {
  official: ApiPoolInfoItem[]
  unOfficial: ApiPoolInfoItem[]
}

export interface ApiFarmInfoV3 {
  id: string
  symbol: string
  lpMint: string
  version: 3
  programId: string
  authority: string
  lpVault: string
  rewardInfos: [{ rewardMint: string; rewardVault: string }]
  upcoming: boolean
}

export interface ApiFarmInfoV5 {
  id: string
  symbol: string
  baseMint: string
  quoteMint: string
  lpMint: string
  version: 5
  programId: string
  authority: string
  lpVault: string
  rewardInfos: [
    {
      rewardMint: string
      rewardVault: string
    },
    {
      rewardMint: string
      rewardVault: string
    },
  ]
  upcoming: boolean
}

export interface ApiFarmInfoV6 {
  id: string
  symbol: string
  baseMint: string
  quoteMint: string
  lpMint: string
  version: 6
  programId: string
  authority: string
  lpVault: string
  rewardPeriodMax: number
  rewardPeriodMin: number
  rewardPeriodExtend: number
  creator: string
  rewardInfos: {
    rewardMint: string
    rewardVault: string
    rewardOpenTime: number
    rewardEndTime: number
    rewardPerSecond: number
    rewardSender: string
    rewardType: 'Standard SPL' | 'Option tokens'
  }[]
  upcoming: boolean
}

export interface ApiFarmInfo {
  stake: (ApiFarmInfoV3 | ApiFarmInfoV5 | ApiFarmInfoV6)[]
  raydium: (ApiFarmInfoV3 | ApiFarmInfoV5 | ApiFarmInfoV6)[]
  fusion: (ApiFarmInfoV3 | ApiFarmInfoV5 | ApiFarmInfoV6)[]
  ecosystem: (ApiFarmInfoV3 | ApiFarmInfoV5 | ApiFarmInfoV6)[]
}

export interface ApiIdoInfoItem {
  id: string
  authority: string
  projectName: string
  projectPosters: string
  projectDetailLink: string
  baseMint: string
  baseVault: string
  baseSymbol: string
  baseDecimals: number
  baseIcon: string
  quoteMint: string
  quoteVault: string
  quoteSymbol: string
  quoteDecimals: number
  quoteIcon: string
  startTime: number
  endTime: number
  startWithdrawTime: number
  withdrawTimeQuote: number
  stakeTimeEnd: number
  stakeMinSize: number
  price: number
  raise: number
  maxWinLotteries: number
  raisedLotteries: number
  isWinning: number
  luckyNumbers: {
    digits: number
    number: number
    endRange: number
  }[]
  version: 3
  snapshotVersion: 1
  programId: string
  snapshotProgramId: string
  seedId: string
}

export interface ApiIdoInfo {
  success: boolean
  data: ApiIdoInfoItem[]
}

export interface ApiIdoProjectInfo {
  info: ApiIdoInfoItem
  projectInfo: {
    projectDetails: string
    projectDocs: { [key: string]: string }
    projectSocials: { [key: string]: string }
  }
}

// CLMM
export interface ApiClmmConfigItem {
  id: string
  index: number
  protocolFeeRate: number
  tradeFeeRate: number
  tickSpacing: number
  fundFeeRate: number
  fundOwner: string
  description: string
}

export interface ApiClmmConfig {
  data: { [id: string]: ApiClmmConfigItem }
}

export interface ApiClmmPoolsItemStatistics {
  volume: number
  volumeFee: number
  feeA: number
  feeB: number
  feeApr: number
  rewardApr: {
    A: number
    B: number
    C: number
  }
  apr: number
  priceMin: number
  priceMax: number
}
export interface ApiClmmPoolsItem {
  id: string
  mintProgramIdA: string
  mintProgramIdB: string
  mintA: string
  mintB: string
  vaultA: string
  vaultB: string
  mintDecimalsA: number
  mintDecimalsB: number
  ammConfig: ApiClmmConfigItem
  rewardInfos: {
    mint: string
    programId: string
  }[]
  tvl: number
  day: ApiClmmPoolsItemStatistics
  week: ApiClmmPoolsItemStatistics
  month: ApiClmmPoolsItemStatistics
  lookupTableAccount: string | undefined
}

export interface ApiClmmPools {
  data: ApiClmmPoolsItem[]
}

export interface ApiClmmPositionLinePoint {
  price: number
  liquidity: number
}
export interface ApiClmmPositionLine {
  data: ApiClmmPositionLinePoint[]
}
