import { Connection, PublicKey, Signer, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

import {
  Base,
  ComputeBudgetConfig,
  generatePubKey,
  InnerTransaction,
  InstructionType,
  TokenAccount,
  TxVersion,
} from '../base'
import { getATAAddress } from '../base/pda'
import {
  AccountMeta,
  AccountMetaReadonly,
  CacheLTA,
  findProgramAddress,
  GetMultipleAccountsInfoConfig,
  getMultipleAccountsInfoWithCustomFlags,
  Logger,
  splitTxAndSigners,
  SYSTEM_PROGRAM_ID,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TOKEN_PROGRAM_ID,
} from '../common'
import { BigNumberish, parseBigNumberish, TEN, Token, ZERO } from '../entity'
import { seq, struct, u64, u8 } from '../marshmallow'
import { Spl, SPL_ACCOUNT_LAYOUT, SplAccount } from '../spl'
import { WSOL } from '../token'

import {
  governanceCreateTokenOwnerRecord,
  voterStakeRegistryCreateDepositEntry,
  voterStakeRegistryCreateVoter,
  voterStakeRegistryDeposit,
  voterStakeRegistryUpdateVoterWeightRecord,
  voterStakeRegistryWithdraw,
} from './importInstruction'
import {
  FARM_LEDGER_LAYOUT_V3_1,
  FARM_LEDGER_LAYOUT_V3_2,
  FARM_LEDGER_LAYOUT_V5_1,
  FARM_LEDGER_LAYOUT_V5_2,
  FARM_STATE_LAYOUT_V6,
  FARM_VERSION_TO_LEDGER_LAYOUT,
  FARM_VERSION_TO_STATE_LAYOUT,
  FarmLedger,
  FarmState,
  REAL_FARM_STATE_LAYOUT_V3,
  REAL_FARM_STATE_LAYOUT_V5,
  Voter,
  VoterRegistrar,
} from './layout'
import {
  getRegistrarAddress,
  getTokenOwnerRecordAddress,
  getVoterAddress,
  getVoterWeightRecordAddress,
  getVotingMintAuthority,
  getVotingTokenMint,
} from './pda'

const logger = Logger.from('Farm')

export const poolTypeV6 = { 'Standard SPL': 0, 'Option tokens': 1 } as const

/* ================= pool keys ================= */
export type FarmPoolKeys = {
  readonly id: PublicKey
  readonly lpMint: PublicKey
  readonly version: number
  readonly programId: PublicKey
  readonly authority: PublicKey
  readonly lpVault: PublicKey
  readonly upcoming: boolean
  readonly rewardInfos: (
    | {
        readonly rewardMint: PublicKey
        readonly rewardVault: PublicKey
      }
    | {
        readonly rewardMint: PublicKey
        readonly rewardVault: PublicKey
        readonly rewardOpenTime: number
        readonly rewardEndTime: number
        readonly rewardPerSecond: number
        readonly rewardType: keyof typeof poolTypeV6
      }
  )[]
}

/* ================= user keys ================= */
/**
 * Full user keys that build transaction need
 */
export interface FarmUserKeys {
  ledger: PublicKey
  auxiliaryLedgers?: PublicKey[]
  lpTokenAccount: PublicKey
  rewardTokenAccounts: PublicKey[]
  owner: PublicKey
}

export interface FarmRewardInfo {
  rewardMint: PublicKey
  rewardPerSecond: BigNumberish
  rewardOpenTime: BigNumberish
  rewardEndTime: BigNumberish
  rewardType: keyof typeof poolTypeV6
}
/* ================= make instruction and transaction ================= */
export interface FarmDepositInstructionParams {
  poolKeys: FarmPoolKeys
  userKeys: FarmUserKeys
  amount: BigNumberish
}

export type FarmWithdrawInstructionParams = FarmDepositInstructionParams

export interface FarmCreateAssociatedLedgerAccountInstructionParams {
  poolKeys: FarmPoolKeys
  userKeys: {
    ledger: PublicKey
    owner: PublicKey
  }
}

export interface FarmCreateInstructionParamsV6 {
  version: 6
  programId: PublicKey

  lpMint: PublicKey

  rewardInfos: {
    rewardMint: PublicKey
    rewardPerSecond: BigNumberish
    rewardOpenTime: BigNumberish
    rewardEndTime: BigNumberish
    rewardType: keyof typeof poolTypeV6
  }[]

  lockInfo: {
    lockMint: PublicKey
    lockVault: PublicKey
  }
}

export type FarmCreateInstructionParams = FarmCreateInstructionParamsV6

export interface FarmRestartInstructionParamsV6 {
  connection: Connection
  poolKeys: FarmPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }

  newRewardInfo: FarmRewardInfo
}

export type FarmRestartInstructionParams = FarmRestartInstructionParamsV6
export interface FarmCreatorWithdrawRewardInstructionParamsV6 {
  poolKeys: FarmPoolKeys
  userKeys: {
    userRewardToken: PublicKey
    owner: PublicKey
    payer?: PublicKey
  }

  withdrawMint: PublicKey
}

export type FarmCreatorWithdrawRewardInstructionParams = FarmCreatorWithdrawRewardInstructionParamsV6

export interface FarmCreatorWithdrawRewardInstructionSimpleParamsV6 {
  connection: Connection
  poolKeys: FarmPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }

  withdrawMint: PublicKey
}

export type FarmCreatorWithdrawRewardInstructionSimpleParams = FarmCreatorWithdrawRewardInstructionSimpleParamsV6

export interface FarmCreatorAddRewardTokenInstructionParamsV6 {
  connection: Connection
  poolKeys: FarmPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }

  newRewardInfo: FarmRewardInfo
}

export type FarmCreatorAddRewardTokenInstructionParams = FarmCreatorAddRewardTokenInstructionParamsV6

export interface MakeCreateFarmInstructionParamsV6 {
  connection: Connection
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  poolInfo: FarmCreateInstructionParams
}
export type makeCreateFarmInstructionParams = MakeCreateFarmInstructionParamsV6

export interface MakeCreateFarmInstructionParamsV6Simple {
  connection: Connection
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  poolInfo: FarmCreateInstructionParams
}
export type makeCreateFarmInstructionSimpleParams = MakeCreateFarmInstructionParamsV6Simple

/* ================= fetch data ================= */
export interface FarmFetchMultipleInfoParams {
  connection: Connection
  pools: FarmPoolKeys[]
  owner?: PublicKey
  config?: GetMultipleAccountsInfoConfig
  chainTime: number
}
export interface FarmFetchMultipleInfoReturnItem {
  apiPoolInfo: FarmPoolKeys
  state: FarmState
  lpVault: SplAccount
  ledger?: FarmLedger
  // wrapped data
  wrapped?: { pendingRewards: BN[] }
}
export interface FarmFetchMultipleInfoReturn {
  [id: string]: FarmFetchMultipleInfoReturnItem
}

export class Farm extends Base {
  /* ================= get layout ================= */
  static getStateLayout(version: number) {
    const STATE_LAYOUT = FARM_VERSION_TO_STATE_LAYOUT[version]
    logger.assertArgument(!!STATE_LAYOUT, 'invalid version', 'version', version)

    return STATE_LAYOUT
  }

  static getLedgerLayout(version: number) {
    const LEDGER_LAYOUT = FARM_VERSION_TO_LEDGER_LAYOUT[version]
    logger.assertArgument(!!LEDGER_LAYOUT, 'invalid version', 'version', version)

    return LEDGER_LAYOUT
  }

  static getLayouts(version: number) {
    return { state: this.getStateLayout(version), ledger: this.getLedgerLayout(version) }
  }

  /* ================= get key ================= */
  static getAssociatedAuthority({ programId, poolId }: { programId: PublicKey; poolId: PublicKey }) {
    return findProgramAddress([poolId.toBuffer()], programId)
  }

  static getAssociatedLedgerAccount({
    programId,
    poolId,
    owner,
    version,
  }: {
    programId: PublicKey
    poolId: PublicKey
    owner: PublicKey
    version: 6 | 5 | 3
  }) {
    const { publicKey } = findProgramAddress(
      [
        poolId.toBuffer(),
        owner.toBuffer(),
        Buffer.from(version === 6 ? 'farmer_info_associated_seed' : 'staker_info_v2_associated_seed', 'utf-8'),
      ],
      programId,
    )
    return publicKey
  }

  static getAssociatedLedgerPoolAccount({
    programId,
    poolId,
    mint,
    type,
  }: {
    programId: PublicKey
    poolId: PublicKey
    mint: PublicKey
    type: 'lpVault' | 'rewardVault'
  }) {
    const { publicKey } = findProgramAddress(
      [
        poolId.toBuffer(),
        mint.toBuffer(),
        Buffer.from(
          type === 'lpVault'
            ? 'lp_vault_associated_seed'
            : type === 'rewardVault'
            ? 'reward_vault_associated_seed'
            : '',
          'utf-8',
        ),
      ],
      programId,
    )
    return publicKey
  }

  /* ================= make instruction and transaction ================= */
  static makeDepositInstruction(params: FarmDepositInstructionParams) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 3) {
      return this.makeDepositInstructionV3(params)
    } else if (version === 5) {
      return this.makeDepositInstructionV5(params)
    } else if (version === 6) {
      return this.makeDepositInstructionV6(params)
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static makeDepositInstructionV3({ poolKeys, userKeys, amount }: FarmDepositInstructionParams) {
    logger.assertArgument(
      poolKeys.rewardInfos.length === 1,
      'lengths not equal 1',
      'poolKeys.rewardInfos',
      poolKeys.rewardInfos,
    )
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === 1,
      'lengths not equal 1',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 10,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.rewardTokenAccounts[0], false),
      AccountMeta(poolKeys.rewardInfos[0].rewardVault, false),
      // system
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    ]

    if (userKeys.auxiliaryLedgers) {
      for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
        keys.push(AccountMeta(auxiliaryLedger, false))
      }
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV3Deposit],
      },
    }
  }

  static makeDepositInstructionV5({ poolKeys, userKeys, amount }: FarmDepositInstructionParams) {
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length,
      'lengths not equal with poolKeys.rewardInfos',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 11,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.rewardTokenAccounts[0], false),
      AccountMeta(poolKeys.rewardInfos[0].rewardVault, false),
      // system
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    ]

    for (let index = 1; index < poolKeys.rewardInfos.length; index++) {
      keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false))
      keys.push(AccountMeta(poolKeys.rewardInfos[index].rewardVault, false))
    }

    if (userKeys.auxiliaryLedgers) {
      for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
        keys.push(AccountMeta(auxiliaryLedger, false))
      }
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV5Deposit],
      },
    }
  }

  static makeDepositInstructionV6({ poolKeys, userKeys, amount }: FarmDepositInstructionParams) {
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length !== 0,
      'lengths equal zero',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length,
      'lengths not equal with poolKeys.rewardInfos',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 1,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
    ]

    for (let index = 0; index < poolKeys.rewardInfos.length; index++) {
      keys.push(AccountMeta(poolKeys.rewardInfos[index].rewardVault, false))
      keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false))
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV6Deposit],
      },
    }
  }

  static makeWithdrawInstruction(params: FarmWithdrawInstructionParams) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 3) {
      return this.makeWithdrawInstructionV3(params)
    } else if (version === 5) {
      return this.makeWithdrawInstructionV5(params)
    } else if (version === 6) {
      return this.makeWithdrawInstructionV6(params)
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static makeWithdrawInstructionV3({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams) {
    logger.assertArgument(
      poolKeys.rewardInfos.length === 1,
      'lengths not equal 1',
      'poolKeys.rewardInfos',
      poolKeys.rewardInfos,
    )
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === 1,
      'lengths not equal 1',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 11,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.rewardTokenAccounts[0], false),
      AccountMeta(poolKeys.rewardInfos[0].rewardVault, false),
      // system
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    ]

    if (userKeys.auxiliaryLedgers) {
      for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
        keys.push(AccountMeta(auxiliaryLedger, false))
      }
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV5Deposit],
      },
    }
  }

  static makeWithdrawInstructionV5({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams) {
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length,
      'lengths not equal with params.poolKeys.rewardInfos',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 12,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.rewardTokenAccounts[0], false),
      AccountMeta(poolKeys.rewardInfos[0].rewardVault, false),
      // system
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    ]

    for (let index = 1; index < poolKeys.rewardInfos.length; index++) {
      keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false))
      keys.push(AccountMeta(poolKeys.rewardInfos[index].rewardVault, false))
    }

    if (userKeys.auxiliaryLedgers) {
      for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
        keys.push(AccountMeta(auxiliaryLedger, false))
      }
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV5Withdraw],
      },
    }
  }

  static makeWithdrawInstructionV6({ poolKeys, userKeys, amount }: FarmWithdrawInstructionParams) {
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length !== 0,
      'lengths equal zero',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )
    logger.assertArgument(
      userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length,
      'lengths not equal with params.poolKeys.rewardInfos',
      'userKeys.rewardTokenAccounts',
      userKeys.rewardTokenAccounts,
    )

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 2,
        amount: parseBigNumberish(amount),
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),

      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(poolKeys.lpVault, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      AccountMeta(userKeys.lpTokenAccount, false),
    ]

    for (let index = 0; index < poolKeys.rewardInfos.length; index++) {
      keys.push(AccountMeta(poolKeys.rewardInfos[index].rewardVault, false))
      keys.push(AccountMeta(userKeys.rewardTokenAccounts[index], false))
    }

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV6Withdraw],
      },
    }
  }

  static makeCreateAssociatedLedgerAccountInstruction(params: FarmCreateAssociatedLedgerAccountInstructionParams) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 3) {
      return this.makeCreateAssociatedLedgerAccountInstructionV3(params)
    } else if (version === 5) {
      return this.makeCreateAssociatedLedgerAccountInstructionV5(params)
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static makeCreateAssociatedLedgerAccountInstructionV3({
    poolKeys,
    userKeys,
  }: FarmCreateAssociatedLedgerAccountInstructionParams) {
    const LAYOUT = struct([u8('instruction')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 9,
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      // system
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),
    ]

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV3CreateLedger],
      },
    }
  }

  static makeCreateAssociatedLedgerAccountInstructionV5({
    poolKeys,
    userKeys,
  }: FarmCreateAssociatedLedgerAccountInstructionParams) {
    const LAYOUT = struct([u8('instruction')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 10,
      },
      data,
    )

    const keys = [
      AccountMeta(poolKeys.id, false),
      AccountMeta(userKeys.ledger, false),
      AccountMetaReadonly(userKeys.owner, true),
      // system
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),
    ]

    return {
      address: {},
      innerTransaction: {
        instructions: [
          new TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
          }),
        ],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV5CreateLedger],
      },
    }
  }

  static makeCreateFarmInstruction({ connection, userKeys, poolInfo }: makeCreateFarmInstructionParams) {
    const { version } = poolInfo

    if (version === 6) {
      return this.makeCreateFarmInstructionV6({
        connection,
        userKeys,
        poolInfo,
      })
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static async makeCreateFarmInstructionV6({ connection, userKeys, poolInfo }: MakeCreateFarmInstructionParamsV6) {
    const payer = userKeys.payer ?? userKeys.owner
    const farmId = generatePubKey({ fromPublicKey: payer, programId: poolInfo.programId })
    const lamports = await connection.getMinimumBalanceForRentExemption(FARM_STATE_LAYOUT_V6.span)

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    frontInstructions.push(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer,
        basePubkey: payer,
        seed: farmId.seed,
        newAccountPubkey: farmId.publicKey,
        lamports,
        space: FARM_STATE_LAYOUT_V6.span,
        programId: poolInfo.programId,
      }),
    )

    const { publicKey: authority, nonce } = Farm.getAssociatedAuthority({
      programId: poolInfo.programId,
      poolId: farmId.publicKey,
    })

    const lpVault = Farm.getAssociatedLedgerPoolAccount({
      programId: poolInfo.programId,
      poolId: farmId.publicKey,
      mint: poolInfo.lpMint,
      type: 'lpVault',
    })

    const rewardInfoConfig: {
      isSet: BN
      rewardPerSecond: BN
      rewardOpenTime: BN
      rewardEndTime: BN
      rewardType: BN
    }[] = []
    const rewardInfoKey: {
      rewardMint: PublicKey
      rewardVault: PublicKey
      userRewardToken: PublicKey
    }[] = []

    for (const rewardInfo of poolInfo.rewardInfos) {
      logger.assertArgument(
        rewardInfo.rewardOpenTime < rewardInfo.rewardEndTime,
        'start time error',
        'rewardInfo.rewardOpenTime',
        rewardInfo.rewardOpenTime,
      )
      logger.assertArgument(
        poolTypeV6[rewardInfo.rewardType] !== undefined,
        'reward type error',
        'rewardInfo.rewardType',
        rewardInfo.rewardType,
      )
      logger.assertArgument(
        parseBigNumberish(rewardInfo.rewardPerSecond).gt(ZERO),
        'rewardPerSecond error',
        'rewardInfo.rewardPerSecond',
        rewardInfo.rewardPerSecond,
      )

      rewardInfoConfig.push({
        isSet: new BN(1),
        rewardPerSecond: parseBigNumberish(rewardInfo.rewardPerSecond),
        rewardOpenTime: parseBigNumberish(rewardInfo.rewardOpenTime),
        rewardEndTime: parseBigNumberish(rewardInfo.rewardEndTime),
        rewardType: parseBigNumberish(poolTypeV6[rewardInfo.rewardType]),
      })

      let userRewardToken
      if (rewardInfo.rewardMint.equals(PublicKey.default)) {
        // SOL
        userRewardToken = await Spl.insertCreateWrappedNativeAccount({
          connection,
          owner: userKeys.owner,
          payer: userKeys.payer ?? userKeys.owner,
          instructions: frontInstructions,
          signers,
          amount: parseBigNumberish(rewardInfo.rewardEndTime)
            .sub(parseBigNumberish(rewardInfo.rewardOpenTime))
            .mul(parseBigNumberish(rewardInfo.rewardPerSecond)),
          instructionsType: frontInstructionsType,
        })
        endInstructions.push(
          Spl.makeCloseAccountInstruction({
            programId: TOKEN_PROGRAM_ID,
            tokenAccount: userRewardToken,
            owner: userKeys.owner,
            payer: userKeys.payer ?? userKeys.owner,
            instructionsType: endInstructionsType,
          }),
        )
      } else {
        userRewardToken = this._selectTokenAccount({
          programId: TOKEN_PROGRAM_ID,
          tokenAccounts: userKeys.tokenAccounts,
          mint: rewardInfo.rewardMint,
          owner: userKeys.owner,
          config: { associatedOnly: false },
        })
      }

      logger.assertArgument(
        userRewardToken !== null,
        'cannot found target token accounts',
        'tokenAccounts',
        userKeys.tokenAccounts,
      )

      const rewardMint = rewardInfo.rewardMint.equals(PublicKey.default) ? Token.WSOL.mint : rewardInfo.rewardMint
      rewardInfoKey.push({
        rewardMint,
        rewardVault: Farm.getAssociatedLedgerPoolAccount({
          programId: poolInfo.programId,
          poolId: farmId.publicKey,
          mint: rewardMint,
          type: 'rewardVault',
        }),
        userRewardToken: userRewardToken!,
      })
    }

    const lockUserAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts: userKeys.tokenAccounts,
      mint: poolInfo.lockInfo.lockMint,
      owner: userKeys.owner,
      config: { associatedOnly: false },
    })

    logger.assertArgument(lockUserAccount !== null, 'cannot found lock vault', 'tokenAccounts', userKeys.tokenAccounts)

    const rewardTimeInfo = struct([
      u64('isSet'),
      u64('rewardPerSecond'),
      u64('rewardOpenTime'),
      u64('rewardEndTime'),
      u64('rewardType'),
    ])

    const LAYOUT = struct([u8('instruction'), u64('nonce'), seq(rewardTimeInfo, 5, 'rewardTimeInfo')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 0,
        nonce: new BN(nonce),
        rewardTimeInfo: rewardInfoConfig,
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),

      AccountMeta(farmId.publicKey, false),
      AccountMetaReadonly(authority, false),
      AccountMeta(lpVault, false),
      AccountMetaReadonly(poolInfo.lpMint, false),
      AccountMeta(poolInfo.lockInfo.lockVault, false),
      AccountMetaReadonly(poolInfo.lockInfo.lockMint, false),
      AccountMeta(lockUserAccount ?? PublicKey.default, false),
      AccountMetaReadonly(userKeys.owner, true),
    ]

    for (const item of rewardInfoKey) {
      keys.push(
        ...[
          { pubkey: item.rewardMint, isSigner: false, isWritable: false },
          { pubkey: item.rewardVault, isSigner: false, isWritable: true },
          { pubkey: item.userRewardToken, isSigner: false, isWritable: true },
        ],
      )
    }

    const ins = new TransactionInstruction({
      programId: poolInfo.programId,
      keys,
      data,
    })

    return {
      address: { farmId: farmId.publicKey },
      innerTransaction: {
        instructions: [...frontInstructions, ins, ...endInstructions],
        signers,
        lookupTableAddress: [],
        instructionTypes: [...frontInstructionsType, InstructionType.farmV6Create, ...endInstructionsType],
      },
    }
  }

  static makeCreatorWithdrawFarmRewardInstruction(params: FarmCreatorWithdrawRewardInstructionParams) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 6) {
      return this.makeCreatorWithdrawFarmRewardInstructionV6(params)
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static makeCreatorWithdrawFarmRewardInstructionV6({
    poolKeys,
    userKeys,
    withdrawMint,
  }: FarmCreatorWithdrawRewardInstructionParamsV6) {
    const rewardInfo = poolKeys.rewardInfos.find((item) =>
      item.rewardMint.equals(withdrawMint.equals(PublicKey.default) ? Token.WSOL.mint : withdrawMint),
    )

    logger.assertArgument(rewardInfo !== undefined, 'withdraw mint error', 'poolKeys.rewardInfos', poolKeys.rewardInfos)

    const rewardVault = rewardInfo?.rewardVault ?? PublicKey.default

    const LAYOUT = struct([u8('instruction')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode({ instruction: 5 }, data)

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),

      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMetaReadonly(poolKeys.lpVault, false),
      AccountMeta(rewardVault, false),
      AccountMeta(userKeys.userRewardToken, false),
      AccountMetaReadonly(userKeys.owner, true),
    ]

    const ins = new TransactionInstruction({
      programId: poolKeys.programId,
      keys,
      data,
    })

    return {
      address: {},
      innerTransaction: {
        instructions: [ins],
        signers: [],
        lookupTableAddress: [],
        instructionTypes: [InstructionType.farmV6CreatorWithdraw],
      },
    }
  }

  /* ================= fetch data ================= */
  static async fetchMultipleInfoAndUpdate({
    connection,
    pools,
    owner,
    config,
    chainTime,
  }: FarmFetchMultipleInfoParams): Promise<FarmFetchMultipleInfoReturn> {
    let hasNotV6Pool = false
    let hasV6Pool = false

    const publicKeys: {
      pubkey: PublicKey
      version: number
      key: 'state' | 'lpVault' | 'ledger'
      poolId: PublicKey
    }[] = []

    const apiPoolInfo: { [key: string]: FarmPoolKeys } = {}
    for (const pool of pools) {
      apiPoolInfo[pool.id.toString()] = pool

      if (pool.version === 6) hasV6Pool = true
      else hasNotV6Pool = true

      publicKeys.push({
        pubkey: pool.id,
        version: pool.version,
        key: 'state',
        poolId: pool.id,
      })

      publicKeys.push({
        pubkey: pool.lpVault,
        version: pool.version,
        key: 'lpVault',
        poolId: pool.id,
      })

      if (owner) {
        publicKeys.push({
          pubkey: this.getAssociatedLedgerAccount({
            programId: pool.programId,
            poolId: pool.id,
            owner,
            version: pool.version as 6 | 5 | 3,
          }),
          version: pool.version,
          key: 'ledger',
          poolId: pool.id,
        })
      }
    }

    const poolsInfo: FarmFetchMultipleInfoReturn = {}

    const accountsInfo = await getMultipleAccountsInfoWithCustomFlags(connection, publicKeys, config)
    for (const { pubkey, version, key, poolId, accountInfo } of accountsInfo) {
      const _poolId = poolId.toBase58()

      if (key === 'state') {
        const STATE_LAYOUT = this.getStateLayout(version)
        if (!accountInfo || !accountInfo.data || accountInfo.data.length !== STATE_LAYOUT.span) {
          return logger.throwArgumentError('invalid farm state account info', 'pools.id', pubkey)
        }

        poolsInfo[_poolId] = {
          ...poolsInfo[_poolId],
          ...{ apiPoolInfo: apiPoolInfo[_poolId] },
          ...{ state: STATE_LAYOUT.decode(accountInfo.data) },
        }
      } else if (key === 'lpVault') {
        if (!accountInfo || !accountInfo.data || accountInfo.data.length !== SPL_ACCOUNT_LAYOUT.span) {
          return logger.throwArgumentError('invalid farm lp vault account info', 'pools.lpVault', pubkey)
        }

        poolsInfo[_poolId] = {
          ...poolsInfo[_poolId],
          ...{ lpVault: SPL_ACCOUNT_LAYOUT.decode(accountInfo.data) },
        }
      } else if (key === 'ledger') {
        const LEDGER_LAYOUT = this.getLedgerLayout(version)
        if (accountInfo && accountInfo.data) {
          logger.assertArgument(
            accountInfo.data.length === LEDGER_LAYOUT.span,
            'invalid farm ledger account info',
            'ledger',
            pubkey,
          )

          poolsInfo[_poolId] = {
            ...poolsInfo[_poolId],
            ...{ ledger: LEDGER_LAYOUT.decode(accountInfo.data) },
          }
        }
      }
    }

    const slot = hasV6Pool || hasNotV6Pool ? await connection.getSlot() : 0

    for (const poolId of Object.keys(poolsInfo)) {
      if (poolsInfo[poolId] === undefined) continue
      poolsInfo[poolId].state = Farm.updatePoolInfo(poolsInfo[poolId].state, poolsInfo[poolId].lpVault, slot, chainTime)
    }

    // wrapped data
    for (const [poolId, { state, ledger }] of Object.entries(poolsInfo)) {
      if (ledger) {
        let multiplier: BN
        if (state.version === 6) {
          multiplier = state.rewardMultiplier
        } else {
          multiplier = state.rewardInfos.length === 1 ? TEN.pow(new BN(9)) : TEN.pow(new BN(15))
        }

        const pendingRewards = state.rewardInfos.map((rewardInfo, index) => {
          const rewardDebt = ledger.rewardDebts[index]
          const pendingReward = ledger.deposited
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .mul(state.version === 6 ? rewardInfo.accRewardPerShare : rewardInfo.perShareReward)
            .div(multiplier)
            .sub(rewardDebt)

          return pendingReward
        })

        poolsInfo[poolId].wrapped = {
          ...poolsInfo[poolId].wrapped,
          pendingRewards,
        }
      }
    }

    return poolsInfo
  }

  static updatePoolInfo(poolInfo: FarmState, lpVault: SplAccount, slot: number, chainTime: number) {
    if (poolInfo.version === 3 || poolInfo.version === 5) {
      if (poolInfo.lastSlot.gte(new BN(slot))) return poolInfo

      const spread = new BN(slot).sub(poolInfo.lastSlot)
      poolInfo.lastSlot = new BN(slot)

      for (const itemRewardInfo of poolInfo.rewardInfos) {
        if (lpVault.amount.eq(new BN(0))) continue

        const reward = itemRewardInfo.perSlotReward.mul(spread)
        itemRewardInfo.perShareReward = itemRewardInfo.perShareReward.add(
          reward.mul(new BN(10).pow(new BN(poolInfo.version === 3 ? 9 : 15))).div(lpVault.amount),
        )
        itemRewardInfo.totalReward = itemRewardInfo.totalReward.add(reward)
      }
    } else if (poolInfo.version === 6) {
      for (const itemRewardInfo of poolInfo.rewardInfos) {
        if (itemRewardInfo.rewardState.eq(new BN(0))) continue
        const updateTime = BN.min(new BN(chainTime), itemRewardInfo.rewardEndTime)
        if (itemRewardInfo.rewardOpenTime.gte(updateTime)) continue
        const spread = updateTime.sub(itemRewardInfo.rewardLastUpdateTime)
        let reward = spread.mul(itemRewardInfo.rewardPerSecond)
        const leftReward = itemRewardInfo.totalReward.sub(itemRewardInfo.totalRewardEmissioned)
        if (leftReward.lt(reward)) {
          reward = leftReward
          itemRewardInfo.rewardLastUpdateTime = itemRewardInfo.rewardLastUpdateTime.add(
            leftReward.div(itemRewardInfo.rewardPerSecond),
          )
        } else {
          itemRewardInfo.rewardLastUpdateTime = updateTime
        }
        if (lpVault.amount.eq(new BN(0))) continue
        itemRewardInfo.accRewardPerShare = itemRewardInfo.accRewardPerShare.add(
          reward.mul(poolInfo.rewardMultiplier).div(lpVault.amount),
        )
        itemRewardInfo.totalRewardEmissioned = itemRewardInfo.totalRewardEmissioned.add(reward)
      }
    }
    return poolInfo
  }

  /* ================= make instruction simple ================= */
  static makeCreatorWithdrawFarmRewardInstructionSimple<T extends TxVersion>(
    params: FarmCreatorWithdrawRewardInstructionSimpleParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 6) {
      return this.makeCreatorWithdrawFarmRewardInstructionV6Simple(params)
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static async makeCreatorWithdrawFarmRewardInstructionV6Simple<T extends TxVersion>({
    connection,
    poolKeys,
    userKeys,
    withdrawMint,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: FarmCreatorWithdrawRewardInstructionSimpleParamsV6 & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    let userRewardToken: PublicKey
    if (withdrawMint.equals(PublicKey.default)) {
      // SOL
      userRewardToken = await Spl.insertCreateWrappedNativeAccount({
        connection,
        owner: userKeys.owner,
        payer: userKeys.payer ?? userKeys.owner,
        instructions: frontInstructions,
        signers,
        amount: 0,
        instructionsType: frontInstructionsType,
      })
      endInstructions.push(
        Spl.makeCloseAccountInstruction({
          programId: TOKEN_PROGRAM_ID,
          tokenAccount: userRewardToken,
          owner: userKeys.owner,
          payer: userKeys.payer ?? userKeys.owner,
          instructionsType: endInstructionsType,
        }),
      )
    } else {
      const selectUserRewardToken = this._selectTokenAccount({
        programId: TOKEN_PROGRAM_ID,
        tokenAccounts: userKeys.tokenAccounts,
        mint: withdrawMint,
        owner: userKeys.owner,
      })
      if (selectUserRewardToken === null) {
        userRewardToken = getATAAddress(userKeys.owner, withdrawMint, TOKEN_PROGRAM_ID).publicKey
        frontInstructions.push(
          Spl.makeCreateAssociatedTokenAccountInstruction({
            programId: TOKEN_PROGRAM_ID,
            mint: withdrawMint,
            associatedAccount: userRewardToken,
            owner: userKeys.owner,
            payer: userKeys.payer ?? userKeys.owner,
            instructionsType: frontInstructionsType,
          }),
        )
      } else {
        userRewardToken = selectUserRewardToken
      }
    }

    const ins = this.makeCreatorWithdrawFarmRewardInstructionV6({
      poolKeys,
      userKeys: { userRewardToken, owner: userKeys.owner, payer: userKeys.payer },
      withdrawMint,
    })

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: userKeys.payer ?? userKeys.owner,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ins.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeCreateFarmInstructionSimple<T extends TxVersion>(
    params: makeCreateFarmInstructionSimpleParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const { version } = params.poolInfo

    if (version === 6) {
      return this.makeCreateFarmInstructionV6Simple(params)
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static async makeCreateFarmInstructionV6Simple<T extends TxVersion>({
    connection,
    userKeys,
    poolInfo,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: MakeCreateFarmInstructionParamsV6Simple & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const payer = userKeys.payer ?? userKeys.owner
    const farmId = generatePubKey({ fromPublicKey: payer, programId: poolInfo.programId })
    const lamports = await connection.getMinimumBalanceForRentExemption(FARM_STATE_LAYOUT_V6.span)

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    frontInstructions.push(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer,
        basePubkey: payer,
        seed: farmId.seed,
        newAccountPubkey: farmId.publicKey,
        lamports,
        space: FARM_STATE_LAYOUT_V6.span,
        programId: poolInfo.programId,
      }),
    )

    const { publicKey: authority, nonce } = Farm.getAssociatedAuthority({
      programId: poolInfo.programId,
      poolId: farmId.publicKey,
    })

    const lpVault = Farm.getAssociatedLedgerPoolAccount({
      programId: poolInfo.programId,
      poolId: farmId.publicKey,
      mint: poolInfo.lpMint,
      type: 'lpVault',
    })

    const rewardInfoConfig: {
      isSet: BN
      rewardPerSecond: BN
      rewardOpenTime: BN
      rewardEndTime: BN
      rewardType: BN
    }[] = []
    const rewardInfoKey: {
      rewardMint: PublicKey
      rewardVault: PublicKey
      userRewardToken: PublicKey
    }[] = []

    for (const rewardInfo of poolInfo.rewardInfos) {
      logger.assertArgument(
        rewardInfo.rewardOpenTime < rewardInfo.rewardEndTime,
        'start time error',
        'rewardInfo.rewardOpenTime',
        rewardInfo.rewardOpenTime,
      )
      logger.assertArgument(
        poolTypeV6[rewardInfo.rewardType] !== undefined,
        'reward type error',
        'rewardInfo.rewardType',
        rewardInfo.rewardType,
      )
      logger.assertArgument(
        parseBigNumberish(rewardInfo.rewardPerSecond).gt(ZERO),
        'rewardPerSecond error',
        'rewardInfo.rewardPerSecond',
        rewardInfo.rewardPerSecond,
      )

      rewardInfoConfig.push({
        isSet: new BN(1),
        rewardPerSecond: parseBigNumberish(rewardInfo.rewardPerSecond),
        rewardOpenTime: parseBigNumberish(rewardInfo.rewardOpenTime),
        rewardEndTime: parseBigNumberish(rewardInfo.rewardEndTime),
        rewardType: parseBigNumberish(poolTypeV6[rewardInfo.rewardType]),
      })

      let userRewardToken
      if (rewardInfo.rewardMint.equals(PublicKey.default)) {
        // SOL
        userRewardToken = await Spl.insertCreateWrappedNativeAccount({
          connection,
          owner: userKeys.owner,
          payer: userKeys.payer ?? userKeys.owner,
          instructions: frontInstructions,
          signers,
          amount: parseBigNumberish(rewardInfo.rewardEndTime)
            .sub(parseBigNumberish(rewardInfo.rewardOpenTime))
            .mul(parseBigNumberish(rewardInfo.rewardPerSecond)),
          instructionsType: frontInstructionsType,
        })
        endInstructions.push(
          Spl.makeCloseAccountInstruction({
            programId: TOKEN_PROGRAM_ID,
            tokenAccount: userRewardToken,
            owner: userKeys.owner,
            payer: userKeys.payer ?? userKeys.owner,
            instructionsType: endInstructionsType,
          }),
        )
      } else {
        userRewardToken = this._selectTokenAccount({
          programId: TOKEN_PROGRAM_ID,
          tokenAccounts: userKeys.tokenAccounts,
          mint: rewardInfo.rewardMint,
          owner: userKeys.owner,
          config: { associatedOnly: false },
        })
      }

      logger.assertArgument(
        userRewardToken !== null,
        'cannot found target token accounts',
        'tokenAccounts',
        userKeys.tokenAccounts,
      )
      if (userRewardToken === null) throw Error('cannot found target token accounts')

      const rewardMint = rewardInfo.rewardMint.equals(PublicKey.default) ? Token.WSOL.mint : rewardInfo.rewardMint
      rewardInfoKey.push({
        rewardMint,
        rewardVault: Farm.getAssociatedLedgerPoolAccount({
          programId: poolInfo.programId,
          poolId: farmId.publicKey,
          mint: rewardMint,
          type: 'rewardVault',
        }),
        userRewardToken,
      })
    }

    const lockUserAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts: userKeys.tokenAccounts,
      mint: poolInfo.lockInfo.lockMint,
      owner: userKeys.owner,
      config: { associatedOnly: false },
    })

    logger.assertArgument(lockUserAccount !== null, 'cannot found lock vault', 'tokenAccounts', userKeys.tokenAccounts)

    const rewardTimeInfo = struct([
      u64('isSet'),
      u64('rewardPerSecond'),
      u64('rewardOpenTime'),
      u64('rewardEndTime'),
      u64('rewardType'),
    ])

    const LAYOUT = struct([u8('instruction'), u64('nonce'), seq(rewardTimeInfo, 5, 'rewardTimeInfo')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 0,
        nonce: new BN(nonce),
        rewardTimeInfo: rewardInfoConfig,
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),

      AccountMeta(farmId.publicKey, false),
      AccountMetaReadonly(authority, false),
      AccountMeta(lpVault, false),
      AccountMetaReadonly(poolInfo.lpMint, false),
      AccountMeta(poolInfo.lockInfo.lockVault, false),
      AccountMetaReadonly(poolInfo.lockInfo.lockMint, false),
      AccountMeta(lockUserAccount ?? PublicKey.default, false),
      AccountMetaReadonly(userKeys.owner, true),
    ]

    for (const item of rewardInfoKey) {
      keys.push(
        ...[
          { pubkey: item.rewardMint, isSigner: false, isWritable: false },
          { pubkey: item.rewardVault, isSigner: false, isWritable: true },
          { pubkey: item.userRewardToken, isSigner: false, isWritable: true },
        ],
      )
    }

    const ins = new TransactionInstruction({
      programId: poolInfo.programId,
      keys,
      data,
    })

    return {
      address: { farmId: farmId.publicKey },
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: userKeys.payer ?? userKeys.owner,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          { instructionTypes: [InstructionType.farmV6Create], instructions: [ins], signers: [] },
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeRestartFarmInstructionSimple<T extends TxVersion>(
    params: FarmRestartInstructionParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 6) {
      return this.makeRestartFarmInstructionV6Simple(params)
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static async makeRestartFarmInstructionV6Simple<T extends TxVersion>({
    connection,
    poolKeys,
    userKeys,
    newRewardInfo,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: FarmRestartInstructionParamsV6 & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    logger.assertArgument(
      newRewardInfo.rewardOpenTime < newRewardInfo.rewardEndTime,
      'start time error',
      'newRewardInfo',
      newRewardInfo,
    )
    const rewardMint = newRewardInfo.rewardMint.equals(PublicKey.default) ? Token.WSOL.mint : newRewardInfo.rewardMint
    const rewardInfo = poolKeys.rewardInfos.find((item) => item.rewardMint.equals(rewardMint))

    logger.assertArgument(rewardInfo, 'configuration does not exist', 'rewardInfo', rewardInfo)

    const rewardVault = rewardInfo?.rewardVault ?? PublicKey.default

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    let userRewardToken
    if (newRewardInfo.rewardMint.equals(PublicKey.default)) {
      // SOL
      userRewardToken = await Spl.insertCreateWrappedNativeAccount({
        connection,
        owner: userKeys.owner,
        payer: userKeys.payer ?? userKeys.owner,
        instructions: frontInstructions,
        signers,
        amount: parseBigNumberish(newRewardInfo.rewardEndTime)
          .sub(parseBigNumberish(newRewardInfo.rewardOpenTime))
          .mul(parseBigNumberish(newRewardInfo.rewardPerSecond)),
        instructionsType: frontInstructionsType,
      })
      endInstructions.push(
        Spl.makeCloseAccountInstruction({
          programId: TOKEN_PROGRAM_ID,
          tokenAccount: userRewardToken,
          owner: userKeys.owner,
          payer: userKeys.payer ?? userKeys.owner,
          instructionsType: endInstructionsType,
        }),
      )
    } else {
      userRewardToken = this._selectTokenAccount({
        programId: TOKEN_PROGRAM_ID,
        tokenAccounts: userKeys.tokenAccounts,
        mint: newRewardInfo.rewardMint,
        owner: userKeys.owner,
        config: { associatedOnly: false },
      })
    }

    logger.assertArgument(
      userRewardToken !== null,
      'cannot found target token accounts',
      'tokenAccounts',
      userKeys.tokenAccounts,
    )
    if (userRewardToken === null) throw Error('cannot found target token accounts')

    const LAYOUT = struct([u8('instruction'), u64('rewardReopenTime'), u64('rewardEndTime'), u64('rewardPerSecond')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 3,
        rewardReopenTime: parseBigNumberish(newRewardInfo.rewardOpenTime),
        rewardEndTime: parseBigNumberish(newRewardInfo.rewardEndTime),
        rewardPerSecond: parseBigNumberish(newRewardInfo.rewardPerSecond),
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),

      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.lpVault, false),
      AccountMeta(rewardVault, false),
      AccountMeta(userRewardToken, false),
      AccountMetaReadonly(userKeys.owner, true),
    ]

    const ins = new TransactionInstruction({
      programId: poolKeys.programId,
      keys,
      data,
    })

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: userKeys.payer ?? userKeys.owner,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          { instructionTypes: [InstructionType.farmV6Restart], instructions: [ins], signers: [] },
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeFarmCreatorAddRewardTokenInstructionSimple<T extends TxVersion>(
    params: FarmCreatorAddRewardTokenInstructionParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const { poolKeys } = params
    const { version } = poolKeys

    if (version === 6) {
      return this.makeFarmCreatorAddRewardTokenInstructionV6Simple(params)
    }

    return logger.throwArgumentError('invalid version', 'version', version)
  }

  static async makeFarmCreatorAddRewardTokenInstructionV6Simple<T extends TxVersion>({
    connection,
    poolKeys,
    userKeys,
    newRewardInfo,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: FarmCreatorAddRewardTokenInstructionParamsV6 & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const rewardVault = Farm.getAssociatedLedgerPoolAccount({
      programId: poolKeys.programId,
      poolId: poolKeys.id,
      mint: newRewardInfo.rewardMint.equals(PublicKey.default) ? Token.WSOL.mint : newRewardInfo.rewardMint,
      type: 'rewardVault',
    })

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    let userRewardToken
    if (newRewardInfo.rewardMint.equals(PublicKey.default)) {
      // SOL
      userRewardToken = await Spl.insertCreateWrappedNativeAccount({
        connection,
        owner: userKeys.owner,
        payer: userKeys.payer ?? userKeys.owner,
        instructions: frontInstructions,
        signers,
        amount: parseBigNumberish(newRewardInfo.rewardEndTime)
          .sub(parseBigNumberish(newRewardInfo.rewardOpenTime))
          .mul(parseBigNumberish(newRewardInfo.rewardPerSecond)),
        instructionsType: frontInstructionsType,
      })
      endInstructions.push(
        Spl.makeCloseAccountInstruction({
          programId: TOKEN_PROGRAM_ID,
          tokenAccount: userRewardToken,
          owner: userKeys.owner,
          payer: userKeys.payer ?? userKeys.owner,
          instructionsType: endInstructionsType,
        }),
      )
    } else {
      userRewardToken = this._selectTokenAccount({
        programId: TOKEN_PROGRAM_ID,
        tokenAccounts: userKeys.tokenAccounts,
        mint: newRewardInfo.rewardMint,
        owner: userKeys.owner,
        config: { associatedOnly: false },
      })
    }

    logger.assertArgument(
      userRewardToken !== null,
      'cannot found target token accounts',
      'tokenAccounts',
      userKeys.tokenAccounts,
    )
    if (userRewardToken === null) throw Error('cannot found target token accounts')

    const rewardMint = newRewardInfo.rewardMint.equals(PublicKey.default) ? Token.WSOL.mint : newRewardInfo.rewardMint

    const LAYOUT = struct([
      u8('instruction'),
      u64('isSet'),
      u64('rewardPerSecond'),
      u64('rewardOpenTime'),
      u64('rewardEndTime'),
      u64('rewardType'),
    ])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 4,
        isSet: new BN(1),
        rewardPerSecond: parseBigNumberish(newRewardInfo.rewardPerSecond),
        rewardOpenTime: parseBigNumberish(newRewardInfo.rewardOpenTime),
        rewardEndTime: parseBigNumberish(newRewardInfo.rewardEndTime),
        rewardType: parseBigNumberish(poolTypeV6[newRewardInfo.rewardType]),
      },
      data,
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),

      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMetaReadonly(rewardMint, false),
      AccountMeta(rewardVault, false),
      AccountMeta(userRewardToken, false),
      AccountMetaReadonly(userKeys.owner, true),
    ]

    const ins = new TransactionInstruction({
      programId: poolKeys.programId,
      keys,
      data,
    })

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: userKeys.payer ?? userKeys.owner,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          { instructionTypes: [InstructionType.farmV6CreatorAddReward], instructions: [ins], signers: [] },
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static async makeDepositInstructionSimple<T extends TxVersion>({
    connection,
    poolKeys,
    fetchPoolInfo,
    ownerInfo,
    amount,
    associatedOnly = true,
    checkCreateATAOwner = false,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: {
    connection: Connection
    poolKeys: FarmPoolKeys
    fetchPoolInfo: FarmFetchMultipleInfoReturnItem
    ownerInfo: {
      feePayer: PublicKey
      wallet: PublicKey
      tokenAccounts: TokenAccount[]
      useSOLBalance?: boolean // if has WSOL mint
    }
    amount: BN
    associatedOnly?: boolean
    checkCreateATAOwner?: boolean
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const ownerMintToAccount: { [mint: string]: PublicKey } = {}
    for (const item of ownerInfo.tokenAccounts) {
      if (associatedOnly) {
        const ata = getATAAddress(ownerInfo.wallet, item.accountInfo.mint, item.programId).publicKey
        if (ata.equals(item.pubkey)) ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      } else {
        ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      }
    }

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const { lpVault, apiPoolInfo, ledger } = fetchPoolInfo

    const lpMint = lpVault.mint
    const ownerLpTokenAccount = ownerMintToAccount[lpMint.toString()]

    logger.assertArgument(ownerLpTokenAccount, "you don't have any lp", 'lp zero', ownerMintToAccount)

    const rewardAccounts: PublicKey[] = []
    for (const itemReward of apiPoolInfo.rewardInfos) {
      const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(Token.WSOL.mint)

      const ownerRewardAccount =
        ownerMintToAccount[itemReward.rewardMint.toString()] ??
        (await this._selectOrCreateTokenAccount({
          programId: TOKEN_PROGRAM_ID,
          mint: itemReward.rewardMint,
          tokenAccounts: rewardUseSOLBalance ? [] : ownerInfo.tokenAccounts,
          owner: ownerInfo.wallet,

          createInfo: {
            connection,
            payer: ownerInfo.feePayer,
            amount: 0,

            frontInstructions,
            frontInstructionsType,
            endInstructions: rewardUseSOLBalance ? endInstructions : [],
            endInstructionsType: rewardUseSOLBalance ? endInstructionsType : [],
            signers,
          },

          associatedOnly: rewardUseSOLBalance ? false : associatedOnly,
          checkCreateATAOwner,
        }))
      ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount
      rewardAccounts.push(ownerRewardAccount)
    }

    const ledgerAddress = await Farm.getAssociatedLedgerAccount({
      programId: new PublicKey(apiPoolInfo.programId),
      poolId: new PublicKey(apiPoolInfo.id),
      owner: ownerInfo.wallet,
      version: apiPoolInfo.version as 6 | 5 | 3,
    })

    if (apiPoolInfo.version < 6 && !ledger) {
      const ins = Farm.makeCreateAssociatedLedgerAccountInstruction({
        poolKeys,
        userKeys: {
          owner: ownerInfo.wallet,
          ledger: ledgerAddress,
        },
      })
      frontInstructions.push(...ins.innerTransaction.instructions)
      frontInstructionsType.push(...ins.innerTransaction.instructionTypes)
    }

    const depositInstruction = Farm.makeDepositInstruction({
      poolKeys,
      userKeys: {
        ledger: ledgerAddress,
        lpTokenAccount: ownerLpTokenAccount,
        owner: ownerInfo.wallet,
        rewardTokenAccounts: rewardAccounts,
      },
      amount,
    })
    return {
      address: depositInstruction.address,
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: ownerInfo.feePayer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          depositInstruction.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static async makeWithdrawInstructionSimple<T extends TxVersion>({
    connection,
    fetchPoolInfo,
    ownerInfo,
    amount,
    associatedOnly = true,
    checkCreateATAOwner = false,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: {
    connection: Connection
    fetchPoolInfo: FarmFetchMultipleInfoReturnItem
    ownerInfo: {
      feePayer: PublicKey
      wallet: PublicKey
      tokenAccounts: TokenAccount[]
      useSOLBalance?: boolean // if has WSOL mint
    }
    amount: BN
    associatedOnly?: boolean
    checkCreateATAOwner?: boolean
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const ownerMintToAccount: { [mint: string]: PublicKey } = {}
    for (const item of ownerInfo.tokenAccounts) {
      if (associatedOnly) {
        const ata = getATAAddress(ownerInfo.wallet, item.accountInfo.mint, item.programId).publicKey
        if (ata.equals(item.pubkey)) ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      } else {
        ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      }
    }

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const withdrawInstructions: TransactionInstruction[] = []
    const withdrawInstructionsType: InstructionType[] = []

    const signers: Signer[] = []

    const { lpVault, wrapped, apiPoolInfo } = fetchPoolInfo

    if (wrapped === undefined) throw Error('no lp')

    const lpMint = lpVault.mint
    const lpMintUseSOLBalance = ownerInfo.useSOLBalance && lpMint.equals(Token.WSOL.mint)
    const ownerLpTokenAccount =
      ownerMintToAccount[lpMint.toString()] ??
      (await this._selectOrCreateTokenAccount({
        programId: TOKEN_PROGRAM_ID,
        mint: lpMint,
        tokenAccounts: lpMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
        owner: ownerInfo.wallet,

        createInfo: {
          connection,
          payer: ownerInfo.feePayer,
          amount: 0,

          frontInstructions,
          frontInstructionsType,
          signers,
        },

        associatedOnly: lpMintUseSOLBalance ? false : associatedOnly,
        checkCreateATAOwner,
      }))
    ownerMintToAccount[lpMint.toString()] = ownerLpTokenAccount

    const rewardAccounts: PublicKey[] = []
    for (const itemReward of apiPoolInfo.rewardInfos) {
      const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(Token.WSOL.mint)

      const ownerRewardAccount =
        ownerMintToAccount[itemReward.rewardMint.toString()] ??
        (await this._selectOrCreateTokenAccount({
          programId: TOKEN_PROGRAM_ID,
          mint: itemReward.rewardMint,
          tokenAccounts: rewardUseSOLBalance ? [] : ownerInfo.tokenAccounts,
          owner: ownerInfo.wallet,

          createInfo: {
            connection,
            payer: ownerInfo.feePayer,
            amount: 0,

            frontInstructions,
            frontInstructionsType,
            endInstructions: rewardUseSOLBalance ? endInstructions : [],
            endInstructionsType: rewardUseSOLBalance ? endInstructionsType : [],
            signers,
          },

          associatedOnly: rewardUseSOLBalance ? false : associatedOnly,
          checkCreateATAOwner,
        }))
      ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount
      rewardAccounts.push(ownerRewardAccount)
    }

    const ins = this.makeWithdrawInstruction({
      poolKeys: apiPoolInfo,
      userKeys: {
        ledger: this.getAssociatedLedgerAccount({
          programId: apiPoolInfo.programId,
          poolId: apiPoolInfo.id,
          owner: ownerInfo.wallet,
          version: apiPoolInfo.version as 6 | 5 | 3,
        }),
        lpTokenAccount: ownerLpTokenAccount,
        rewardTokenAccounts: rewardAccounts,
        owner: ownerInfo.wallet,
      },
      amount,
    })

    withdrawInstructions.push(...ins.innerTransaction.instructions)
    withdrawInstructionsType.push(...ins.innerTransaction.instructionTypes)

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: ownerInfo.feePayer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          { instructionTypes: withdrawInstructionsType, instructions: withdrawInstructions, signers: [] },
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static async makeHarvestAllRewardInstructionSimple<T extends TxVersion>({
    connection,
    fetchPoolInfos,
    ownerInfo,
    associatedOnly = true,
    checkCreateATAOwner = false,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: {
    connection: Connection
    fetchPoolInfos: FarmFetchMultipleInfoReturn
    ownerInfo: {
      feePayer: PublicKey
      wallet: PublicKey
      tokenAccounts: TokenAccount[]
      useSOLBalance?: boolean // if has WSOL mint
    }
    associatedOnly?: boolean
    checkCreateATAOwner?: boolean
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const ownerMintToAccount: { [mint: string]: PublicKey } = {}
    for (const item of ownerInfo.tokenAccounts) {
      if (associatedOnly) {
        const ata = getATAAddress(ownerInfo.wallet, item.accountInfo.mint, item.programId).publicKey
        if (ata.equals(item.pubkey)) ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      } else {
        ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      }
    }

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const harvestInstructions: InnerTransaction[] = []

    const signers: Signer[] = []

    for (const { lpVault, wrapped, apiPoolInfo, ledger } of Object.values(fetchPoolInfos)) {
      if (
        wrapped === undefined ||
        ledger === undefined ||
        !(wrapped.pendingRewards.find((i) => i.gt(ZERO)) !== undefined || ledger.deposited.isZero())
      )
        continue

      const lpMint = lpVault.mint
      const lpMintUseSOLBalance = ownerInfo.useSOLBalance && lpMint.equals(Token.WSOL.mint)
      const ownerLpTokenAccount =
        ownerMintToAccount[lpMint.toString()] ??
        (await this._selectOrCreateTokenAccount({
          programId: TOKEN_PROGRAM_ID,
          mint: lpMint,
          tokenAccounts: lpMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
          owner: ownerInfo.wallet,

          createInfo: {
            connection,
            payer: ownerInfo.feePayer,
            amount: 0,

            frontInstructions,
            frontInstructionsType,
            signers,
          },

          associatedOnly: lpMintUseSOLBalance ? false : associatedOnly,
          checkCreateATAOwner,
        }))
      ownerMintToAccount[lpMint.toString()] = ownerLpTokenAccount

      const rewardAccounts: PublicKey[] = []
      for (const itemReward of apiPoolInfo.rewardInfos) {
        const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(Token.WSOL.mint)

        const ownerRewardAccount =
          ownerMintToAccount[itemReward.rewardMint.toString()] ??
          (await this._selectOrCreateTokenAccount({
            programId: TOKEN_PROGRAM_ID,
            mint: itemReward.rewardMint,
            tokenAccounts: rewardUseSOLBalance ? [] : ownerInfo.tokenAccounts,
            owner: ownerInfo.wallet,

            createInfo: {
              connection,
              payer: ownerInfo.feePayer,
              amount: 0,

              frontInstructions,
              frontInstructionsType,
              endInstructions: rewardUseSOLBalance ? endInstructions : [],
              endInstructionsType: rewardUseSOLBalance ? endInstructionsType : [],
              signers,
            },

            associatedOnly: rewardUseSOLBalance ? false : associatedOnly,
            checkCreateATAOwner,
          }))
        ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount
        rewardAccounts.push(ownerRewardAccount)
      }

      const ins = this.makeWithdrawInstruction({
        poolKeys: apiPoolInfo,
        userKeys: {
          ledger: this.getAssociatedLedgerAccount({
            programId: apiPoolInfo.programId,
            poolId: apiPoolInfo.id,
            owner: ownerInfo.wallet,
            version: apiPoolInfo.version as 6 | 5 | 3,
          }),
          lpTokenAccount: ownerLpTokenAccount,
          rewardTokenAccounts: rewardAccounts,
          owner: ownerInfo.wallet,
        },
        amount: 0,
      })

      harvestInstructions.push(ins.innerTransaction)
    }

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: ownerInfo.feePayer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ...harvestInstructions,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  /**
   * @deprecated the method is **DANGEROUS**, please don't use
   */
  static async makeV1InfoToV2PdaAndHarvestSimple<T extends TxVersion>({
    connection,
    wallet,
    tokenAccounts,
    programIdV3,
    programIdV5,
    makeTxVersion,
    lookupTableCache,
    computeBudgetConfig,
  }: {
    connection: Connection
    wallet: PublicKey
    tokenAccounts: TokenAccount[]
    programIdV3: PublicKey
    programIdV5: PublicKey
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    computeBudgetConfig?: ComputeBudgetConfig
  }) {
    const mintToAccount: { [mint: string]: PublicKey } = {}
    for (const item of tokenAccounts) {
      const mint = item.accountInfo.mint
      const ata = getATAAddress(wallet, mint, item.programId).publicKey
      if (ata.equals(item.pubkey)) mintToAccount[mint.toString()] = ata
      if (mintToAccount[mint.toString()] === undefined) mintToAccount[mint.toString()] = item.pubkey
    }

    const dataInfoV3 = await connection.getProgramAccounts(programIdV3, {
      filters: [{ memcmp: { offset: 40, bytes: wallet.toString() } }],
    })
    const dataInfoV5 = await connection.getProgramAccounts(programIdV5, {
      filters: [{ memcmp: { offset: 40, bytes: wallet.toString() } }],
    })

    const poolIdToAccountV3: { [id: string]: { pda: PublicKey | undefined; other: PublicKey[] } } = {}
    const poolIdToAccountV5: { [id: string]: { pda: PublicKey | undefined; other: PublicKey[] } } = {}

    for (const item of dataInfoV3) {
      const layout =
        item.account.data.length === FARM_LEDGER_LAYOUT_V3_1.span ? FARM_LEDGER_LAYOUT_V3_1 : FARM_LEDGER_LAYOUT_V3_2
      const info = layout.decode(item.account.data)
      const poolId = info.id.toString()

      const pda = this.getAssociatedLedgerAccount({
        programId: programIdV3,
        poolId: info.id,
        owner: wallet,
        version: 3,
      })

      if (poolIdToAccountV3[poolId] === undefined) {
        poolIdToAccountV3[poolId] = { pda: undefined, other: [] }
      }

      if (pda.equals(item.pubkey)) {
        poolIdToAccountV3[poolId].pda = item.pubkey
      } else {
        poolIdToAccountV3[poolId].other.push(item.pubkey)
      }
    }
    for (const item of dataInfoV5) {
      const layout =
        item.account.data.length === FARM_LEDGER_LAYOUT_V5_1.span ? FARM_LEDGER_LAYOUT_V5_1 : FARM_LEDGER_LAYOUT_V5_2
      const info = layout.decode(item.account.data)
      const poolId = info.id.toString()

      const pda = this.getAssociatedLedgerAccount({
        programId: programIdV5,
        poolId: info.id,
        owner: wallet,
        version: 5,
      })

      if (poolIdToAccountV5[poolId] === undefined) {
        poolIdToAccountV5[poolId] = { pda: undefined, other: [] }
      }

      if (pda.equals(item.pubkey)) {
        poolIdToAccountV5[poolId].pda = item.pubkey
      } else {
        poolIdToAccountV5[poolId].other.push(item.pubkey)
      }
    }

    const needCheckPoolId = [
      ...Object.entries(poolIdToAccountV3)
        .filter((i) => i[1].other.length > 0)
        .map((i) => i[0]),
      ...Object.entries(poolIdToAccountV5)
        .filter((i) => i[1].other.length > 0)
        .map((i) => i[0]),
    ]

    const allPoolInfo = await connection.getMultipleAccountsInfo(needCheckPoolId.map((i) => new PublicKey(i)))
    const poolIdToInfo: { [id: string]: Buffer } = {}
    for (let i = 0; i < needCheckPoolId.length; i++) {
      const id = needCheckPoolId[i]
      const info = allPoolInfo[i]
      if (info === null) continue
      poolIdToInfo[id] = info.data
    }

    const frontInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const instructions: InnerTransaction[] = []
    const endInstructions: TransactionInstruction[] = []
    const endInstructionsType: InstructionType[] = []

    for (const [poolId, info] of Object.entries(poolIdToAccountV3)) {
      if (info.other.length === 0) continue
      if (poolIdToInfo[poolId] === undefined) continue

      const poolInfo = REAL_FARM_STATE_LAYOUT_V3.decode(poolIdToInfo[poolId])

      const [_lpInfo, _rewardInfo] = await connection.getMultipleAccountsInfo([poolInfo.lpVault, poolInfo.rewardVault])
      if (_lpInfo === null || _rewardInfo === null) throw Error('get lp and reward info error')
      const lpInfo = SPL_ACCOUNT_LAYOUT.decode(_lpInfo.data)
      const rewardInfo = SPL_ACCOUNT_LAYOUT.decode(_rewardInfo.data)

      let lpAccount = mintToAccount[lpInfo.mint.toString()]
      if (lpAccount === undefined) {
        lpAccount = await this._selectOrCreateTokenAccount({
          programId: _lpInfo.owner,
          mint: lpInfo.mint,
          tokenAccounts: [],
          owner: wallet,
          createInfo: {
            connection,
            payer: wallet,
            amount: 0,
            frontInstructions,
            frontInstructionsType,
            endInstructions: [],
            endInstructionsType: [],
            signers: [],
          },
          associatedOnly: true,
          checkCreateATAOwner: true,
        })
        mintToAccount[lpInfo.mint.toString()] = lpAccount
      }

      let rewardAccount = mintToAccount[rewardInfo.mint.toString()]
      if (rewardAccount === undefined) {
        rewardAccount = await this._selectOrCreateTokenAccount({
          programId: _rewardInfo.owner,
          mint: rewardInfo.mint,
          tokenAccounts: [],
          owner: wallet,
          createInfo: {
            connection,
            payer: wallet,
            amount: 0,
            frontInstructions,
            frontInstructionsType,
            endInstructions: rewardInfo.mint.toString() === WSOL.mint ? endInstructions : [],
            endInstructionsType: rewardInfo.mint.toString() === WSOL.mint ? endInstructionsType : [],
            signers: [],
          },
          associatedOnly: true,
          checkCreateATAOwner: true,
        })
        mintToAccount[rewardInfo.mint.toString()] = rewardAccount
      }

      if (info.pda === undefined) {
        const _i = this.makeCreateAssociatedLedgerAccountInstructionV3({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          poolKeys: { programId: programIdV3, id: new PublicKey(poolId) },
          userKeys: {
            ledger: this.getAssociatedLedgerAccount({
              programId: programIdV3,
              poolId: new PublicKey(poolId),
              owner: wallet,
              version: 3,
            }),
            owner: wallet,
          },
        })
        instructions.push(_i.innerTransaction)
      }

      const _i = this.makeDepositInstructionV3({
        amount: 0,
        userKeys: {
          ledger: this.getAssociatedLedgerAccount({
            programId: programIdV3,
            poolId: new PublicKey(poolId),
            owner: wallet,
            version: 3,
          }),
          owner: wallet,
          lpTokenAccount: lpAccount,
          rewardTokenAccounts: [rewardAccount],
          auxiliaryLedgers: info.other,
        },
        poolKeys: {
          programId: programIdV3,
          id: new PublicKey(poolId),
          authority: this.getAssociatedAuthority({ programId: programIdV3, poolId: new PublicKey(poolId) }).publicKey,
          lpVault: poolInfo.lpVault,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          rewardInfos: [{ rewardVault: poolInfo.rewardVault }],
        },
      })

      instructions.push(_i.innerTransaction)
    }

    for (const [poolId, info] of Object.entries(poolIdToAccountV5)) {
      if (info.other.length === 0) continue
      if (poolIdToInfo[poolId] === undefined) continue

      const poolInfo = REAL_FARM_STATE_LAYOUT_V5.decode(poolIdToInfo[poolId])

      const [_lpInfo, _rewardInfoA, _rewardInfoB] = await connection.getMultipleAccountsInfo([
        poolInfo.lpVault,
        poolInfo.rewardVaultA,
        poolInfo.rewardVaultB,
      ])
      if (_lpInfo === null || _rewardInfoA === null || _rewardInfoB === null)
        throw Error('get lp and reward A / B info error')
      const lpInfo = SPL_ACCOUNT_LAYOUT.decode(_lpInfo.data)
      const rewardInfoA = SPL_ACCOUNT_LAYOUT.decode(_rewardInfoA.data)
      const rewardInfoB = SPL_ACCOUNT_LAYOUT.decode(_rewardInfoB.data)

      let lpAccount = mintToAccount[lpInfo.mint.toString()]
      if (lpAccount === undefined) {
        lpAccount = await this._selectOrCreateTokenAccount({
          programId: _lpInfo.owner,
          mint: lpInfo.mint,
          tokenAccounts: [],
          owner: wallet,
          createInfo: {
            connection,
            payer: wallet,
            amount: 0,
            frontInstructions,
            frontInstructionsType,
            endInstructions: [],
            endInstructionsType: [],
            signers: [],
          },
          associatedOnly: true,
          checkCreateATAOwner: true,
        })
        mintToAccount[lpInfo.mint.toString()] = lpAccount
      }

      let rewardAccountA = mintToAccount[rewardInfoA.mint.toString()]
      if (rewardAccountA === undefined) {
        rewardAccountA = await this._selectOrCreateTokenAccount({
          programId: _rewardInfoA.owner,
          mint: rewardInfoA.mint,
          tokenAccounts: [],
          owner: wallet,
          createInfo: {
            connection,
            payer: wallet,
            amount: 0,
            frontInstructions,
            frontInstructionsType,
            endInstructions: rewardInfoA.mint.toString() === WSOL.mint ? endInstructions : [],
            endInstructionsType: rewardInfoA.mint.toString() === WSOL.mint ? endInstructionsType : [],
            signers: [],
          },
          associatedOnly: true,
          checkCreateATAOwner: true,
        })
        mintToAccount[rewardInfoA.mint.toString()] = rewardAccountA
      }

      let rewardAccountB = mintToAccount[rewardInfoB.mint.toString()]
      if (rewardAccountB === undefined) {
        rewardAccountB = await this._selectOrCreateTokenAccount({
          programId: _rewardInfoB.owner,
          mint: rewardInfoB.mint,
          tokenAccounts: [],
          owner: wallet,
          createInfo: {
            connection,
            payer: wallet,
            amount: 0,
            frontInstructions,
            frontInstructionsType,
            endInstructions: rewardInfoB.mint.toString() === WSOL.mint ? endInstructions : [],
            endInstructionsType: rewardInfoB.mint.toString() === WSOL.mint ? endInstructionsType : [],
            signers: [],
          },
          associatedOnly: true,
          checkCreateATAOwner: true,
        })
        mintToAccount[rewardInfoB.mint.toString()] = rewardAccountB
      }

      if (info.pda === undefined) {
        const _i = this.makeCreateAssociatedLedgerAccountInstructionV5({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          poolKeys: { programId: programIdV5, id: new PublicKey(poolId) },
          userKeys: {
            ledger: this.getAssociatedLedgerAccount({
              programId: programIdV5,
              poolId: new PublicKey(poolId),
              owner: wallet,
              version: 5,
            }),
            owner: wallet,
          },
        })
        instructions.push(_i.innerTransaction)
      }

      const _i = this.makeDepositInstructionV5({
        amount: 0,
        userKeys: {
          ledger: this.getAssociatedLedgerAccount({
            programId: programIdV5,
            poolId: new PublicKey(poolId),
            owner: wallet,
            version: 5,
          }),
          owner: wallet,
          lpTokenAccount: lpAccount,
          rewardTokenAccounts: [rewardAccountA, rewardAccountB],
          auxiliaryLedgers: info.other,
        },
        poolKeys: {
          programId: programIdV5,
          id: new PublicKey(poolId),
          authority: this.getAssociatedAuthority({ programId: programIdV5, poolId: new PublicKey(poolId) }).publicKey,
          lpVault: poolInfo.lpVault,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          rewardInfos: [{ rewardVault: poolInfo.rewardVaultA }, { rewardVault: poolInfo.rewardVaultB }],
        },
      })

      instructions.push(_i.innerTransaction)
    }

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: wallet,
        innerTransaction: [
          {
            instructionTypes: frontInstructionsType.slice(0, 10),
            instructions: frontInstructions.slice(0, 10),
            signers: [],
          },
          ...(frontInstructions.length > 10
            ? [
                {
                  instructionTypes: frontInstructionsType.slice(10),
                  instructions: frontInstructions.slice(10),
                  signers: [],
                },
              ]
            : []),
          ...instructions,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static async makeDepositTokenInstruction({
    connection,
    programId,
    governanceProgramId,
    voteWeightAddinProgramId,
    realm,
    communityTokenMint,
    owner,
    poolId,
  }: {
    connection: Connection
    programId: PublicKey
    governanceProgramId: PublicKey
    voteWeightAddinProgramId: PublicKey
    realm: PublicKey
    communityTokenMint: PublicKey
    owner: PublicKey
    poolId: PublicKey
  }) {
    const registrar = getRegistrarAddress(voteWeightAddinProgramId, realm, communityTokenMint).publicKey
    const ownerPda = this.getAssociatedLedgerAccount({ programId, poolId, owner, version: 3 })
    const ownerAccountInfo = await connection.getAccountInfo(ownerPda)
    if (ownerAccountInfo === null) {
      throw Error('user is not staker')
    }
    const ownerInfo = FARM_LEDGER_LAYOUT_V3_2.decode(ownerAccountInfo.data)
    const mintAmount = ownerInfo.deposited.sub(ownerInfo.voteLockedBalance)
    if (mintAmount.eq(ZERO)) {
      throw Error('user do not has new stake amount')
    }

    const votingMint = getVotingTokenMint(programId, poolId).publicKey
    const votingMintAuthority = getVotingMintAuthority(programId, poolId).publicKey
    const { publicKey: voter, nonce: voterBump } = getVoterAddress(voteWeightAddinProgramId, registrar, owner)
    const voterVault = getATAAddress(voter, votingMint, TOKEN_PROGRAM_ID).publicKey

    const { publicKey: voterWeightRecord, nonce: voterWeightRecordBump } = getVoterWeightRecordAddress(
      voteWeightAddinProgramId,
      registrar,
      owner,
    )

    const tokenOwnerRecordAddress = getTokenOwnerRecordAddress(
      governanceProgramId,
      realm,
      communityTokenMint,
      owner,
    ).publicKey

    const instructions: TransactionInstruction[] = []

    const depositToken = getATAAddress(owner, votingMint, TOKEN_PROGRAM_ID).publicKey
    const depositTokenAccountInfo = await connection.getAccountInfo(depositToken)
    if (depositTokenAccountInfo === null) {
      instructions.push(
        Spl.makeCreateAssociatedTokenAccountInstruction({
          programId: TOKEN_PROGRAM_ID,
          mint: votingMint,
          associatedAccount: depositToken,
          owner,
          payer: owner,
          instructionsType: [],
        }),
      )
    }
    const voterAccountInfo = await connection.getAccountInfo(voter)
    if (voterAccountInfo === null) {
      const createTokenOwnerRecodeIns = governanceCreateTokenOwnerRecord(
        governanceProgramId,
        realm,
        owner,
        communityTokenMint,
        owner,
        tokenOwnerRecordAddress,
      )

      instructions.push(
        createTokenOwnerRecodeIns,
        voterStakeRegistryCreateVoter(
          voteWeightAddinProgramId,
          registrar,
          voter,
          voterWeightRecord,
          owner,
          owner,
          voterBump,
          voterWeightRecordBump,
        ),
      )
    }

    const { index: depositEntryIndex, isInit: depositEntryInit } = await getDepositEntryIndex(
      connection,
      registrar,
      voter,
      votingMint,
    )
    if (!depositEntryInit) {
      instructions.push(
        voterStakeRegistryCreateDepositEntry(
          voteWeightAddinProgramId,
          registrar,
          voter,
          voterVault,
          owner,
          owner,
          votingMint,

          depositEntryIndex,
          0,
          undefined,
          0,
          false,
        ),
      )
    }

    instructions.push(
      voterStakeRegistryDeposit(
        voteWeightAddinProgramId,
        registrar,
        voter,
        voterVault,
        depositToken,
        owner,

        ownerPda,
        poolId,
        votingMint,
        votingMintAuthority,
        programId,

        depositEntryIndex,
        mintAmount,
      ),
      voterStakeRegistryUpdateVoterWeightRecord(voteWeightAddinProgramId, registrar, voter, voterWeightRecord),
    )

    return {
      address: {},
      innerTransaction: {
        instructions,
        signers: [],
        lookupTableAddress: [],
        instructionTypes: Array(instructions.length).fill(InstructionType.test),
      },
    }
  }

  static async makeWithdrawTokenInstruction({
    connection,
    programId,
    governanceProgramId,
    voteWeightAddinProgramId,
    realm,
    communityTokenMint,
    owner,
    poolId,
  }: {
    connection: Connection
    programId: PublicKey

    governanceProgramId: PublicKey
    voteWeightAddinProgramId: PublicKey
    realm: PublicKey
    communityTokenMint: PublicKey
    owner: PublicKey
    poolId: PublicKey
  }) {
    const registrar = getRegistrarAddress(voteWeightAddinProgramId, realm, communityTokenMint).publicKey
    const ownerPda = this.getAssociatedLedgerAccount({ programId, poolId, owner, version: 3 })
    const ownerAccountInfo = await connection.getAccountInfo(ownerPda)
    if (ownerAccountInfo === null) {
      throw Error('user is not staker')
    }
    const ownerInfo = FARM_LEDGER_LAYOUT_V3_2.decode(ownerAccountInfo.data)
    if (ownerInfo.voteLockedBalance.eq(ZERO)) {
      throw Error('user has vote locked balance = 0')
    }

    const votingMint = getVotingTokenMint(programId, poolId).publicKey
    const votingMintAuthority = getVotingMintAuthority(programId, poolId).publicKey
    const { publicKey: voter } = getVoterAddress(voteWeightAddinProgramId, registrar, owner)
    const voterVault = getATAAddress(voter, votingMint, TOKEN_PROGRAM_ID).publicKey
    const { publicKey: voterWeightRecord } = getVoterWeightRecordAddress(voteWeightAddinProgramId, registrar, owner)

    const tokenOwnerRecordAddress = getTokenOwnerRecordAddress(
      governanceProgramId,
      realm,
      communityTokenMint,
      owner,
    ).publicKey

    const instructions: TransactionInstruction[] = []

    const { index: depositEntryIndex, isInit: depositEntryInit } = await getDepositEntryIndex(
      connection,
      registrar,
      voter,
      votingMint,
    )
    if (!depositEntryInit) throw Error('deposit entry index check error')

    instructions.push(
      voterStakeRegistryWithdraw(
        voteWeightAddinProgramId,
        registrar,
        voter,
        owner,
        tokenOwnerRecordAddress,
        voterWeightRecord,
        voterVault,
        getATAAddress(owner, votingMint, TOKEN_PROGRAM_ID).publicKey,
        ownerPda,
        poolId,
        votingMint,
        votingMintAuthority,
        programId,

        depositEntryIndex,
        ownerInfo.voteLockedBalance,
      ),
    )

    return {
      address: {},
      innerTransaction: {
        instructions,
        signers: [],
        lookupTableAddress: [],
        instructionTypes: Array(instructions.length).fill(InstructionType.test),
      },
    }
  }
}

async function getDepositEntryIndex(
  connection: Connection,
  registrar: PublicKey,
  voter: PublicKey,
  voterMint: PublicKey,
): Promise<{ index: number; isInit: boolean }> {
  const registrarAccountData = await connection.getAccountInfo(registrar)
  if (registrarAccountData === null) throw Error('registrar info check error')
  const registrarData = VoterRegistrar.decode(registrarAccountData.data)

  const votingMintConfigIndex = registrarData.votingMints.findIndex((i) => i.mint.equals(voterMint))

  if (votingMintConfigIndex === -1) throw Error('find voter mint error')

  const voterAccountData = await connection.getAccountInfo(voter)
  if (voterAccountData === null) return { index: votingMintConfigIndex, isInit: false } // throw Error('voter info check error')

  const voterData = Voter.decode(voterAccountData.data)

  const depositEntryIndex = voterData.deposits.findIndex(
    (i) => i.isUsed && i.votingMintConfigIdx === votingMintConfigIndex,
  )
  if (depositEntryIndex === -1) return { index: votingMintConfigIndex, isInit: false }
  else return { index: depositEntryIndex, isInit: true }
}
