import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'

import { CacheLTA } from '../common'

export interface ComputeBudgetConfig {
  units?: number
  microLamports?: number
}

export interface InnerTransaction {
  instructionTypes: InstructionType[]
  instructions: TransactionInstruction[]
  signers: Signer[]

  lookupTableAddress?: PublicKey[]
}
export interface MakeInstructionOutType<
  T extends {
    [name: string]: PublicKey
  } = {
    [name: string]: PublicKey
  },
> {
  address: T
  innerTransaction: InnerTransaction
}

export type InnerSimpleTransaction = InnerSimpleLegacyTransaction | InnerSimpleV0Transaction

export interface InnerSimpleLegacyTransaction {
  instructionTypes: InstructionType[]
  instructions: TransactionInstruction[]
  signers: Signer[]
}
export interface InnerSimpleV0Transaction {
  instructionTypes: InstructionType[]
  instructions: TransactionInstruction[]
  signers: Signer[]

  lookupTableAddress?: CacheLTA
}

export enum TxVersion {
  'V0',
  'LEGACY',
}

export enum InstructionType {
  'createAccount',
  'initAccount',
  'createATA',
  'closeAccount',
  'transferAmount',
  'initMint',
  'mintTo',

  'initMarket', // create market main ins
  'util1216OwnerClaim', // owner claim token ins

  'setComputeUnitPrice', // addComputeBudget
  'setComputeUnitLimit', // addComputeBudget

  // CLMM
  'clmmCreatePool',
  'clmmOpenPosition',
  'clmmIncreasePosition',
  'clmmDecreasePosition',
  'clmmClosePosition',
  'clmmSwapBaseIn',
  'clmmSwapBaseOut',
  'clmmInitReward',
  'clmmSetReward',
  'clmmCollectReward',

  'ammV4Swap',
  'ammV4AddLiquidity',
  'ammV4RemoveLiquidity',
  'ammV4SimulatePoolInfo',
  'ammV4SwapBaseIn',
  'ammV4SwapBaseOut',
  'ammV4CreatePool',
  'ammV4InitPool',
  'ammV4CreatePoolV2',

  'ammV5AddLiquidity',
  'ammV5RemoveLiquidity',
  'ammV5SimulatePoolInfo',
  'ammV5SwapBaseIn',
  'ammV5SwapBaseOut',

  'routeSwap',
  'routeSwap1',
  'routeSwap2',

  'farmV3Deposit',
  'farmV3Withdraw',
  'farmV3CreateLedger',

  'farmV5Deposit',
  'farmV5Withdraw',
  'farmV5CreateLedger',

  'farmV6Deposit',
  'farmV6Withdraw',
  'farmV6Create',
  'farmV6Restart',
  'farmV6CreatorAddReward',
  'farmV6CreatorWithdraw',

  'test',
}
