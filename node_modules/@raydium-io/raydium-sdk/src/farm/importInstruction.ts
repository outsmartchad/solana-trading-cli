import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

import {
  AccountMeta,
  AccountMetaReadonly,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  INSTRUCTION_PROGRAM_ID,
  RENT_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../common'
import { ZERO } from '../entity'
import { bool, struct, u32, u64, u8 } from '../marshmallow'

const anchorDataBuf = {
  voterStakeRegistryCreateVoter: Buffer.from([6, 24, 245, 52, 243, 255, 148, 25]), // CreateVoter
  voterStakeRegistryCreateDepositEntry: Buffer.from([185, 131, 167, 186, 159, 125, 19, 67]), // CreateDepositEntry
  voterStakeRegistryDeposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]), // Deposit
  voterStakeRegistryWithdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]), // Withdraw
  voterStakeRegistryUpdateVoterWeightRecord: Buffer.from([45, 185, 3, 36, 109, 190, 115, 169]), // UpdateVoterWeightRecord
}

export function governanceCreateTokenOwnerRecord(
  programId: PublicKey,
  realm: PublicKey,
  governingTokenOwner: PublicKey,
  governingTokenMint: PublicKey,
  payer: PublicKey,
  tokenOwnerRecordAddress: PublicKey,
) {
  const dataLayout = struct([u8('ins')])

  const keys = [
    AccountMetaReadonly(realm, false),
    AccountMetaReadonly(governingTokenOwner, false),
    AccountMeta(tokenOwnerRecordAddress, false),
    AccountMetaReadonly(governingTokenMint, false),
    AccountMeta(payer, true),
    AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode({ ins: 23 }, data)

  return new TransactionInstruction({
    keys,
    programId,
    data,
  })
}

export function voterStakeRegistryCreateVoter(
  programId: PublicKey,
  registrar: PublicKey,
  voter: PublicKey,
  voterWeightRecord: PublicKey,
  voterAuthority: PublicKey,
  payer: PublicKey,

  voterBump: number,
  voterWeightRecordBump: number,
) {
  const dataLayout = struct([u8('voterBump'), u8('voterWeightRecordBump')])

  const keys = [
    AccountMetaReadonly(registrar, false),
    AccountMeta(voter, false),
    AccountMetaReadonly(voterAuthority, true),
    AccountMeta(voterWeightRecord, false),
    AccountMeta(payer, true),
    AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
    AccountMetaReadonly(RENT_PROGRAM_ID, false),
    AccountMetaReadonly(INSTRUCTION_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode({ voterBump, voterWeightRecordBump }, data)
  const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryCreateVoter, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function voterStakeRegistryCreateDepositEntry(
  programId: PublicKey,
  registrar: PublicKey,
  voter: PublicKey,
  voterVault: PublicKey,
  voterAuthority: PublicKey,
  payer: PublicKey,
  depositMint: PublicKey,

  depositEntryIndex: number,
  kind: number,
  startTs: BN | undefined,
  periods: number,
  allowClawback: boolean,
) {
  const dataLayout = struct([
    u8('depositEntryIndex'),
    u8('kind'),
    u8('option'),
    u64('startTs'),
    u32('periods'),
    bool('allowClawback'),
  ])

  const keys = [
    AccountMetaReadonly(registrar, false),
    AccountMeta(voter, false),
    AccountMeta(voterVault, false),
    AccountMetaReadonly(voterAuthority, true),
    AccountMeta(payer, true),
    AccountMetaReadonly(depositMint, false),

    AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
    AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
    AccountMetaReadonly(ASSOCIATED_TOKEN_PROGRAM_ID, false),
    AccountMetaReadonly(RENT_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      depositEntryIndex,
      kind,
      option: startTs === undefined ? 0 : 1,
      startTs: startTs ?? ZERO,
      periods,
      allowClawback,
    },
    data,
  )
  const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryCreateDepositEntry, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function voterStakeRegistryDeposit(
  programId: PublicKey,
  registrar: PublicKey,
  voter: PublicKey,
  voterVault: PublicKey,
  depositToken: PublicKey,
  depositAuthority: PublicKey,

  userStakerInfoV2: PublicKey,
  pool: PublicKey,
  votingMint: PublicKey,
  votingMintAuthority: PublicKey,
  stakeProgramId: PublicKey,

  depositEntryIndex: number,
  amount: BN,
) {
  const dataLayout = struct([u8('depositEntryIndex'), u64('amount')])

  const keys = [
    AccountMetaReadonly(registrar, false),
    AccountMeta(voter, false),
    AccountMeta(voterVault, false),
    AccountMeta(depositToken, false),
    AccountMetaReadonly(depositAuthority, true),
    AccountMetaReadonly(TOKEN_PROGRAM_ID, false),

    AccountMeta(userStakerInfoV2, false),
    AccountMetaReadonly(pool, false),
    AccountMeta(votingMint, false),
    AccountMetaReadonly(votingMintAuthority, false),
    AccountMetaReadonly(stakeProgramId, false),
    AccountMetaReadonly(INSTRUCTION_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      depositEntryIndex,
      amount,
    },
    data,
  )
  const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryDeposit, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function voterStakeRegistryUpdateVoterWeightRecord(
  programId: PublicKey,
  registrar: PublicKey,
  voter: PublicKey,
  voterWeightRecord: PublicKey,
) {
  const dataLayout = struct([])

  const keys = [
    AccountMetaReadonly(registrar, false),
    AccountMetaReadonly(voter, false),
    AccountMeta(voterWeightRecord, false),
    AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode({}, data)
  const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryUpdateVoterWeightRecord, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function voterStakeRegistryWithdraw(
  programId: PublicKey,
  registrar: PublicKey,
  voter: PublicKey,
  voterAuthority: PublicKey,
  tokenOwnerRecord: PublicKey,
  voterWeightRecord: PublicKey,
  vault: PublicKey,
  destination: PublicKey,

  userStakerInfoV2: PublicKey,
  pool: PublicKey,
  votingMint: PublicKey,
  votingMintAuthority: PublicKey,
  stakeProgramId: PublicKey,

  depositEntryIndex: number,
  amount: BN,
) {
  const dataLayout = struct([u8('depositEntryIndex'), u64('amount')])

  const keys = [
    AccountMetaReadonly(registrar, false),
    AccountMeta(voter, false),
    AccountMetaReadonly(voterAuthority, true),
    AccountMetaReadonly(tokenOwnerRecord, false),
    AccountMeta(voterWeightRecord, false),
    AccountMeta(vault, false),
    AccountMeta(destination, false),
    AccountMetaReadonly(TOKEN_PROGRAM_ID, false),

    AccountMeta(userStakerInfoV2, false),
    AccountMetaReadonly(pool, false),
    AccountMeta(votingMint, false),
    AccountMetaReadonly(votingMintAuthority, false),
    AccountMetaReadonly(stakeProgramId, false),
    AccountMetaReadonly(INSTRUCTION_PROGRAM_ID, false),
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      depositEntryIndex,
      amount,
    },
    data,
  )
  const aData = Buffer.from([...anchorDataBuf.voterStakeRegistryWithdraw, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}
