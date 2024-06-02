import { getTransferFeeConfig, Mint, TransferFee, TransferFeeConfig, unpackMint } from '@solana/spl-token'
import {
  AddressLookupTableAccount,
  Connection,
  EpochInfo,
  Keypair,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import BN from 'bn.js'

import {
  CacheLTA,
  getMultipleAccountsInfoWithCustomFlags,
  getMultipleLookupTableInfo,
  splitTxAndSigners,
  TOKEN_PROGRAM_ID,
} from '../common'
import { CurrencyAmount, ONE, TokenAmount, ZERO } from '../entity'
import { Spl } from '../spl'
import { WSOL } from '../token'

import { TokenAccount } from './base'
import { InnerSimpleTransaction, InnerSimpleV0Transaction, InnerTransaction, InstructionType, TxVersion } from './type'

export function getWSOLAmount({ tokenAccounts }: { tokenAccounts: TokenAccount[] }) {
  const WSOL_MINT = new PublicKey(WSOL.mint)
  const amounts = tokenAccounts.filter((i) => i.accountInfo.mint.equals(WSOL_MINT)).map((i) => i.accountInfo.amount)
  const amount = amounts.reduce((a, b) => a.add(b), new BN(0))
  return amount
}

export async function unwarpSol({
  ownerInfo,
  tokenAccounts,
  makeTxVersion,
  connection,
}: {
  connection: Connection
  ownerInfo: {
    wallet: PublicKey
    payer: PublicKey
  }
  tokenAccounts: TokenAccount[]
  makeTxVersion: TxVersion
}) {
  const WSOL_MINT = new PublicKey(WSOL.mint)
  const instructionsInfo = tokenAccounts
    .filter((i) => i.accountInfo.mint.equals(WSOL_MINT))
    .map((i) => ({
      amount: i.accountInfo.amount,
      tx: Spl.makeCloseAccountInstruction({
        programId: TOKEN_PROGRAM_ID,
        tokenAccount: i.pubkey,
        owner: ownerInfo.wallet,
        payer: ownerInfo.payer,
        instructionsType: [],
      }),
    }))

  return {
    address: {},
    innerTransactions: await splitTxAndSigners({
      connection,
      makeTxVersion,
      payer: ownerInfo.payer,
      innerTransaction: instructionsInfo.map((i) => ({
        instructionTypes: [InstructionType.closeAccount],
        instructions: [i.tx],
        signers: [],
      })),
    }),
  }
}

export async function buildSimpleTransaction({
  connection,
  makeTxVersion,
  payer,
  innerTransactions,
  recentBlockhash,
  addLookupTableInfo,
}: {
  makeTxVersion: TxVersion
  payer: PublicKey
  connection: Connection
  innerTransactions: InnerSimpleTransaction[]
  recentBlockhash?: string | undefined
  addLookupTableInfo?: CacheLTA | undefined
}): Promise<(VersionedTransaction | Transaction)[]> {
  if (makeTxVersion !== TxVersion.V0 && makeTxVersion !== TxVersion.LEGACY) throw Error(' make tx version args error')

  const _recentBlockhash = recentBlockhash ?? (await connection.getLatestBlockhash()).blockhash

  const txList: (VersionedTransaction | Transaction)[] = []
  for (const itemIx of innerTransactions) {
    txList.push(
      _makeTransaction({
        makeTxVersion,
        instructions: itemIx.instructions,
        payer,
        recentBlockhash: _recentBlockhash,
        signers: itemIx.signers,
        lookupTableInfos: Object.values({
          ...(addLookupTableInfo ?? {}),
          ...((itemIx as InnerSimpleV0Transaction).lookupTableAddress ?? {}),
        }),
      }),
    )
  }
  return txList
}

export async function buildTransaction({
  connection,
  makeTxVersion,
  payer,
  innerTransactions,
  recentBlockhash,
  lookupTableCache,
}: {
  makeTxVersion: TxVersion
  payer: PublicKey
  connection: Connection
  innerTransactions: InnerTransaction[]
  recentBlockhash?: string | undefined
  lookupTableCache?: CacheLTA
}): Promise<(VersionedTransaction | Transaction)[]> {
  if (makeTxVersion !== TxVersion.V0 && makeTxVersion !== TxVersion.LEGACY) throw Error(' make tx version args error')

  const _recentBlockhash = recentBlockhash ?? (await connection.getLatestBlockhash()).blockhash
  const _lookupTableCache = lookupTableCache ?? {}

  const lta = [
    ...new Set<string>([
      ...innerTransactions
        .map((i) => i.lookupTableAddress ?? [])
        .flat()
        .map((i) => i.toString()),
    ]),
  ]
  const needCacheLTA = []
  for (const item of lta) {
    if (_lookupTableCache[item] === undefined) {
      needCacheLTA.push(new PublicKey(item))
    }
  }
  const lookupTableAccountsCache =
    needCacheLTA.length > 0 ? await getMultipleLookupTableInfo({ connection, address: needCacheLTA }) : {}
  for (const [key, value] of Object.entries(lookupTableAccountsCache)) {
    _lookupTableCache[key] = value
  }

  const txList: (VersionedTransaction | Transaction)[] = []
  for (const itemIx of innerTransactions) {
    const _itemLTA: CacheLTA = {}
    if (makeTxVersion === TxVersion.V0) {
      for (const item of itemIx.lookupTableAddress ?? []) {
        _itemLTA[item.toString()] = _lookupTableCache[item.toString()]
      }
    }

    txList.push(
      _makeTransaction({
        makeTxVersion,
        instructions: itemIx.instructions,
        payer,
        recentBlockhash: _recentBlockhash,
        signers: itemIx.signers,
        lookupTableInfos: Object.values(_itemLTA),
      }),
    )
  }
  return txList
}

function _makeTransaction({
  makeTxVersion,
  instructions,
  payer,
  recentBlockhash,
  signers,
  lookupTableInfos,
}: {
  makeTxVersion: TxVersion
  instructions: TransactionInstruction[]
  payer: PublicKey
  recentBlockhash: string
  signers: (Signer | Keypair)[]
  lookupTableInfos?: AddressLookupTableAccount[]
}): VersionedTransaction | Transaction {
  if (makeTxVersion === TxVersion.LEGACY) {
    const tx = new Transaction()
    tx.add(...instructions)
    tx.feePayer = payer
    tx.recentBlockhash = recentBlockhash
    if (signers.length > 0) tx.sign(...signers)
    return tx
  } else if (makeTxVersion === TxVersion.V0) {
    const transactionMessage = new TransactionMessage({
      payerKey: payer,
      recentBlockhash,
      instructions,
    })
    const itemV = new VersionedTransaction(transactionMessage.compileToV0Message(lookupTableInfos))
    itemV.sign(signers)
    return itemV
  } else {
    throw Error(' make tx version check error ')
  }
}

export interface TransferAmountFee {
  amount: TokenAmount | CurrencyAmount
  fee: TokenAmount | CurrencyAmount | undefined
  expirationTime: number | undefined
}
export interface GetTransferAmountFee {
  amount: BN
  fee: BN | undefined
  expirationTime: number | undefined
}
const POINT = 10_000
export function getTransferAmountFee(
  amount: BN,
  feeConfig: TransferFeeConfig | undefined,
  epochInfo: EpochInfo,
  addFee: boolean,
): GetTransferAmountFee {
  if (feeConfig === undefined) {
    return {
      amount,
      fee: undefined,
      expirationTime: undefined,
    }
  }

  const nowFeeConfig: TransferFee =
    epochInfo.epoch < feeConfig.newerTransferFee.epoch ? feeConfig.olderTransferFee : feeConfig.newerTransferFee
  const maxFee = new BN(nowFeeConfig.maximumFee.toString())
  const expirationTime: number | undefined =
    epochInfo.epoch < feeConfig.newerTransferFee.epoch
      ? ((Number(feeConfig.newerTransferFee.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400) / 1000
      : undefined

  if (addFee) {
    if (nowFeeConfig.transferFeeBasisPoints === POINT) {
      const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString())
      return {
        amount: amount.add(nowMaxFee),
        fee: nowMaxFee,
        expirationTime,
      }
    } else {
      const _TAmount = BNDivCeil(amount.mul(new BN(POINT)), new BN(POINT - nowFeeConfig.transferFeeBasisPoints))

      const nowMaxFee = new BN(nowFeeConfig.maximumFee.toString())
      const TAmount = _TAmount.sub(amount).gt(nowMaxFee) ? amount.add(nowMaxFee) : _TAmount

      const _fee = BNDivCeil(TAmount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT))
      const fee = _fee.gt(maxFee) ? maxFee : _fee
      return {
        amount: TAmount,
        fee,
        expirationTime,
      }
    }
  } else {
    const _fee = BNDivCeil(amount.mul(new BN(nowFeeConfig.transferFeeBasisPoints)), new BN(POINT))
    const fee = _fee.gt(maxFee) ? maxFee : _fee

    return {
      amount,
      fee,
      expirationTime,
    }
  }
}

export function minExpirationTime(
  expirationTime1: number | undefined,
  expirationTime2: number | undefined,
): number | undefined {
  if (expirationTime1 === undefined) return expirationTime2
  if (expirationTime2 === undefined) return expirationTime1

  return Math.min(expirationTime1, expirationTime2)
}

export type ReturnTypeFetchMultipleMintInfo = Mint & { feeConfig: TransferFeeConfig | undefined }
export interface ReturnTypeFetchMultipleMintInfos {
  [mint: string]: ReturnTypeFetchMultipleMintInfo
}

export async function fetchMultipleMintInfos({ connection, mints }: { connection: Connection; mints: PublicKey[] }) {
  if (mints.length === 0) return {}
  const mintInfos = await getMultipleAccountsInfoWithCustomFlags(
    connection,
    mints.map((i) => ({ pubkey: i })),
  )

  const mintK: ReturnTypeFetchMultipleMintInfos = {}
  for (const i of mintInfos) {
    const t = unpackMint(i.pubkey, i.accountInfo, i.accountInfo?.owner)
    mintK[i.pubkey.toString()] = {
      ...t,
      feeConfig: getTransferFeeConfig(t) ?? undefined,
    }
  }

  return mintK
}

export function BNDivCeil(bn1: BN, bn2: BN) {
  const { div, mod } = bn1.divmod(bn2)

  if (mod.gt(ZERO)) {
    return div.add(ONE)
  } else {
    return div
  }
}
