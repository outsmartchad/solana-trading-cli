import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  METADATA_PROGRAM_ID,
  RENT_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../common'
import { ZERO, parseBigNumberish } from '../entity'
import { bool, s32, struct, u128, u64, u8 } from '../marshmallow'

const anchorDataBuf = {
  createPool: [233, 146, 209, 142, 207, 104, 64, 188],
  initReward: [95, 135, 192, 196, 242, 129, 230, 68],
  setRewardEmissions: [112, 52, 167, 75, 32, 201, 211, 137],
  openPosition: [77, 184, 74, 214, 112, 86, 241, 199],
  closePosition: [123, 134, 81, 0, 49, 68, 98, 98],
  increaseLiquidity: [133, 29, 89, 223, 69, 238, 176, 10],
  decreaseLiquidity: [58, 127, 188, 62, 79, 82, 196, 96],
  swap: [43, 4, 237, 11, 26, 201, 30, 98], // [248, 198, 158, 145, 225, 117, 135, 200],
  collectReward: [18, 237, 166, 197, 34, 16, 213, 144],
}

export function createPoolInstruction(
  programId: PublicKey,
  poolId: PublicKey,
  poolCreator: PublicKey,
  ammConfigId: PublicKey,
  observationId: PublicKey,
  mintA: PublicKey,
  mintVaultA: PublicKey,
  mintProgramIdA: PublicKey,
  mintB: PublicKey,
  mintVaultB: PublicKey,
  mintProgramIdB: PublicKey,
  exTickArrayBitmap: PublicKey,
  sqrtPriceX64: BN,
  startTime: BN,
) {
  const dataLayout = struct([u128('sqrtPriceX64'), u64('startTime')])

  const keys = [
    { pubkey: poolCreator, isSigner: true, isWritable: true },
    { pubkey: ammConfigId, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: mintA, isSigner: false, isWritable: false },
    { pubkey: mintB, isSigner: false, isWritable: false },
    { pubkey: mintVaultA, isSigner: false, isWritable: true },
    { pubkey: mintVaultB, isSigner: false, isWritable: true },
    { pubkey: observationId, isSigner: false, isWritable: false },
    { pubkey: exTickArrayBitmap, isSigner: false, isWritable: true },
    { pubkey: mintProgramIdA, isSigner: false, isWritable: false },
    { pubkey: mintProgramIdB, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      sqrtPriceX64,
      startTime,
    },
    data,
  )
  const aData = Buffer.from([...anchorDataBuf.createPool, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function openPositionFromLiquidityInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftMint: PublicKey,
  positionNftAccount: PublicKey,
  metadataAccount: PublicKey,
  protocolPosition: PublicKey,
  tickArrayLower: PublicKey,
  tickArrayUpper: PublicKey,
  personalPosition: PublicKey,
  ownerTokenAccountA: PublicKey,
  ownerTokenAccountB: PublicKey,
  tokenVaultA: PublicKey,
  tokenVaultB: PublicKey,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey,

  tickLowerIndex: number,
  tickUpperIndex: number,
  tickArrayLowerStartIndex: number,
  tickArrayUpperStartIndex: number,
  liquidity: BN,
  amountMaxA: BN,
  amountMaxB: BN,
  withMetadata: 'create' | 'no-create',

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([
    s32('tickLowerIndex'),
    s32('tickUpperIndex'),
    s32('tickArrayLowerStartIndex'),
    s32('tickArrayUpperStartIndex'),
    u128('liquidity'),
    u64('amountMaxA'),
    u64('amountMaxB'),
    bool('withMetadata'),
    u8('optionBaseFlag'),
    bool('baseFlag'),
  ])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
  ]

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: positionNftOwner, isSigner: false, isWritable: false },
    { pubkey: positionNftMint, isSigner: true, isWritable: true },
    { pubkey: positionNftAccount, isSigner: false, isWritable: true },
    { pubkey: metadataAccount, isSigner: false, isWritable: true },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: protocolPosition, isSigner: false, isWritable: true },
    { pubkey: tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
    { pubkey: personalPosition, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: tokenVaultA, isSigner: false, isWritable: true },
    { pubkey: tokenVaultB, isSigner: false, isWritable: true },

    { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: tokenMintA, isSigner: false, isWritable: false },
    { pubkey: tokenMintB, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      tickLowerIndex,
      tickUpperIndex,
      tickArrayLowerStartIndex,
      tickArrayUpperStartIndex,
      liquidity,
      amountMaxA,
      amountMaxB,
      withMetadata: withMetadata === 'create',
      baseFlag: false,
      optionBaseFlag: 0,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.openPosition, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function openPositionFromBaseInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftMint: PublicKey,
  positionNftAccount: PublicKey,
  metadataAccount: PublicKey,
  protocolPosition: PublicKey,
  tickArrayLower: PublicKey,
  tickArrayUpper: PublicKey,
  personalPosition: PublicKey,
  ownerTokenAccountA: PublicKey,
  ownerTokenAccountB: PublicKey,
  tokenVaultA: PublicKey,
  tokenVaultB: PublicKey,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey,

  tickLowerIndex: number,
  tickUpperIndex: number,
  tickArrayLowerStartIndex: number,
  tickArrayUpperStartIndex: number,

  withMetadata: 'create' | 'no-create',
  base: 'MintA' | 'MintB',
  baseAmount: BN,

  otherAmountMax: BN,

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([
    s32('tickLowerIndex'),
    s32('tickUpperIndex'),
    s32('tickArrayLowerStartIndex'),
    s32('tickArrayUpperStartIndex'),
    u128('liquidity'),
    u64('amountMaxA'),
    u64('amountMaxB'),
    bool('withMetadata'),
    u8('optionBaseFlag'),
    bool('baseFlag'),
  ])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
  ]

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: positionNftOwner, isSigner: false, isWritable: false },
    { pubkey: positionNftMint, isSigner: true, isWritable: true },
    { pubkey: positionNftAccount, isSigner: false, isWritable: true },
    { pubkey: metadataAccount, isSigner: false, isWritable: true },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: protocolPosition, isSigner: false, isWritable: true },
    { pubkey: tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
    { pubkey: personalPosition, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: tokenVaultA, isSigner: false, isWritable: true },
    { pubkey: tokenVaultB, isSigner: false, isWritable: true },

    { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: tokenMintA, isSigner: false, isWritable: false },
    { pubkey: tokenMintB, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      tickLowerIndex,
      tickUpperIndex,
      tickArrayLowerStartIndex,
      tickArrayUpperStartIndex,
      liquidity: ZERO,
      amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
      amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
      withMetadata: withMetadata === 'create',
      baseFlag: base === 'MintA',
      optionBaseFlag: 1,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.openPosition, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function closePositionInstruction(
  programId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftMint: PublicKey,
  positionNftAccount: PublicKey,
  personalPosition: PublicKey,
) {
  const dataLayout = struct([])

  const keys = [
    { pubkey: positionNftOwner, isSigner: true, isWritable: true },
    { pubkey: positionNftMint, isSigner: false, isWritable: true },
    { pubkey: positionNftAccount, isSigner: false, isWritable: true },
    { pubkey: personalPosition, isSigner: false, isWritable: true },

    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode({}, data)

  const aData = Buffer.from([...anchorDataBuf.closePosition, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function increasePositionFromLiquidityInstruction(
  programId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftAccount: PublicKey,
  personalPosition: PublicKey,

  poolId: PublicKey,
  protocolPosition: PublicKey,
  tickArrayLower: PublicKey,
  tickArrayUpper: PublicKey,
  ownerTokenAccountA: PublicKey,
  ownerTokenAccountB: PublicKey,
  mintVaultA: PublicKey,
  mintVaultB: PublicKey,
  mintMintA: PublicKey,
  mintMintB: PublicKey,

  liquidity: BN,
  amountMaxA: BN,
  amountMaxB: BN,

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([
    u128('liquidity'),
    u64('amountMaxA'),
    u64('amountMaxB'),
    u8('optionBaseFlag'),
    bool('baseFlag'),
  ])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
  ]

  const keys = [
    { pubkey: positionNftOwner, isSigner: true, isWritable: false },
    { pubkey: positionNftAccount, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: protocolPosition, isSigner: false, isWritable: true },
    { pubkey: personalPosition, isSigner: false, isWritable: true },
    { pubkey: tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: mintVaultA, isSigner: false, isWritable: true },
    { pubkey: mintVaultB, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: mintMintA, isSigner: false, isWritable: false },
    { pubkey: mintMintB, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      liquidity,
      amountMaxA,
      amountMaxB,
      optionBaseFlag: 0,
      baseFlag: false,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function increasePositionFromBaseInstruction(
  programId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftAccount: PublicKey,
  personalPosition: PublicKey,

  poolId: PublicKey,
  protocolPosition: PublicKey,
  tickArrayLower: PublicKey,
  tickArrayUpper: PublicKey,
  ownerTokenAccountA: PublicKey,
  ownerTokenAccountB: PublicKey,
  mintVaultA: PublicKey,
  mintVaultB: PublicKey,
  mintMintA: PublicKey,
  mintMintB: PublicKey,

  base: 'MintA' | 'MintB',
  baseAmount: BN,

  otherAmountMax: BN,

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([
    u128('liquidity'),
    u64('amountMaxA'),
    u64('amountMaxB'),
    u8('optionBaseFlag'),
    bool('baseFlag'),
  ])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
  ]

  const keys = [
    { pubkey: positionNftOwner, isSigner: true, isWritable: false },
    { pubkey: positionNftAccount, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: protocolPosition, isSigner: false, isWritable: true },
    { pubkey: personalPosition, isSigner: false, isWritable: true },
    { pubkey: tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: tickArrayUpper, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: mintVaultA, isSigner: false, isWritable: true },
    { pubkey: mintVaultB, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: mintMintA, isSigner: false, isWritable: false },
    { pubkey: mintMintB, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      liquidity: ZERO,
      amountMaxA: base === 'MintA' ? baseAmount : otherAmountMax,
      amountMaxB: base === 'MintA' ? otherAmountMax : baseAmount,
      baseFlag: base === 'MintA',
      optionBaseFlag: 1,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.increaseLiquidity, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function decreaseLiquidityInstruction(
  programId: PublicKey,
  positionNftOwner: PublicKey,
  positionNftAccount: PublicKey,
  personalPosition: PublicKey,

  poolId: PublicKey,
  protocolPosition: PublicKey,
  tickArrayLower: PublicKey,
  tickArrayUpper: PublicKey,
  ownerTokenAccountA: PublicKey,
  ownerTokenAccountB: PublicKey,
  mintVaultA: PublicKey,
  mintVaultB: PublicKey,
  mintMintA: PublicKey,
  mintMintB: PublicKey,
  rewardAccounts: {
    poolRewardVault: PublicKey
    ownerRewardVault: PublicKey
    rewardMint: PublicKey
  }[],

  liquidity: BN,
  amountMinA: BN,
  amountMinB: BN,

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([u128('liquidity'), u64('amountMinA'), u64('amountMinB')])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ...rewardAccounts
      .map((i) => [
        { pubkey: i.poolRewardVault, isSigner: false, isWritable: true },
        { pubkey: i.ownerRewardVault, isSigner: false, isWritable: true },
        { pubkey: i.rewardMint, isSigner: false, isWritable: false },
      ])
      .flat(),
  ]

  const keys = [
    { pubkey: positionNftOwner, isSigner: true, isWritable: false },
    { pubkey: positionNftAccount, isSigner: false, isWritable: false },
    { pubkey: personalPosition, isSigner: false, isWritable: true },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: protocolPosition, isSigner: false, isWritable: true },
    { pubkey: mintVaultA, isSigner: false, isWritable: true },
    { pubkey: mintVaultB, isSigner: false, isWritable: true },
    { pubkey: tickArrayLower, isSigner: false, isWritable: true },
    { pubkey: tickArrayUpper, isSigner: false, isWritable: true },

    { pubkey: ownerTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccountB, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: mintMintA, isSigner: false, isWritable: false },
    { pubkey: mintMintB, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      liquidity,
      amountMinA,
      amountMinB,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.decreaseLiquidity, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function swapInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,
  ammConfigId: PublicKey,
  inputTokenAccount: PublicKey,
  outputTokenAccount: PublicKey,
  inputVault: PublicKey,
  outputVault: PublicKey,
  inputMint: PublicKey,
  outputMint: PublicKey,
  tickArray: PublicKey[],
  observationId: PublicKey,

  amount: BN,
  otherAmountThreshold: BN,
  sqrtPriceLimitX64: BN,
  isBaseInput: boolean,

  exTickArrayBitmap?: PublicKey,
) {
  const dataLayout = struct([
    u64('amount'),
    u64('otherAmountThreshold'),
    u128('sqrtPriceLimitX64'),
    bool('isBaseInput'),
  ])

  const remainingAccounts = [
    ...(exTickArrayBitmap ? [{ pubkey: exTickArrayBitmap, isSigner: false, isWritable: true }] : []),
    ...tickArray.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
  ]

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: false },
    { pubkey: ammConfigId, isSigner: false, isWritable: false },

    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: inputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: outputTokenAccount, isSigner: false, isWritable: true },
    { pubkey: inputVault, isSigner: false, isWritable: true },
    { pubkey: outputVault, isSigner: false, isWritable: true },

    { pubkey: observationId, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: inputMint, isSigner: false, isWritable: false },
    { pubkey: outputMint, isSigner: false, isWritable: false },

    ...remainingAccounts,
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      amount,
      otherAmountThreshold,
      sqrtPriceLimitX64,
      isBaseInput,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.swap, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function initRewardInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,
  operationId: PublicKey,
  ammConfigId: PublicKey,

  ownerTokenAccount: PublicKey,
  rewardProgramId: PublicKey,
  rewardMint: PublicKey,
  rewardVault: PublicKey,

  openTime: number,
  endTime: number,
  emissionsPerSecondX64: BN,
) {
  const dataLayout = struct([u64('openTime'), u64('endTime'), u128('emissionsPerSecondX64')])

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: ammConfigId, isSigner: false, isWritable: false },

    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: operationId, isSigner: false, isWritable: true },
    { pubkey: rewardMint, isSigner: false, isWritable: false },
    { pubkey: rewardVault, isSigner: false, isWritable: true },

    { pubkey: rewardProgramId, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      openTime: parseBigNumberish(openTime),
      endTime: parseBigNumberish(endTime),
      emissionsPerSecondX64,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.initReward, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function setRewardInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,
  operationId: PublicKey,
  ammConfigId: PublicKey,

  ownerTokenAccount: PublicKey,
  rewardVault: PublicKey,
  rewardMint: PublicKey,

  rewardIndex: number,
  openTime: number,
  endTime: number,
  emissionsPerSecondX64: BN,
) {
  const dataLayout = struct([u8('rewardIndex'), u128('emissionsPerSecondX64'), u64('openTime'), u64('endTime')])

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ammConfigId, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: operationId, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },

    { pubkey: rewardVault, isSigner: false, isWritable: true },
    { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: rewardMint, isSigner: false, isWritable: true },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      rewardIndex,
      emissionsPerSecondX64,
      openTime: parseBigNumberish(openTime),
      endTime: parseBigNumberish(endTime),
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.setRewardEmissions, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}

export function collectRewardInstruction(
  programId: PublicKey,
  payer: PublicKey,
  poolId: PublicKey,

  ownerTokenAccount: PublicKey,
  rewardVault: PublicKey,
  rewardMint: PublicKey,

  rewardIndex: number,
) {
  const dataLayout = struct([u8('rewardIndex')])

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: ownerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolId, isSigner: false, isWritable: true },
    { pubkey: rewardVault, isSigner: false, isWritable: true },
    { pubkey: rewardMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: MEMO_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      rewardIndex,
    },
    data,
  )

  const aData = Buffer.from([...anchorDataBuf.collectReward, ...data])

  return new TransactionInstruction({
    keys,
    programId,
    data: aData,
  })
}
