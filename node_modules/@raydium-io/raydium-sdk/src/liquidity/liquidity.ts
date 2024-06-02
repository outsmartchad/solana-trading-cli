import { Connection, PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import BN from 'bn.js'

import {
  BNDivCeil,
  Base,
  ComputeBudgetConfig,
  InnerTransaction,
  InstructionType,
  MakeInstructionOutType,
  TokenAccount,
  TxVersion,
} from '../base'
import { getATAAddress } from '../base/pda'
import { ApiPoolInfoItem } from '../baseInfo'
import { Clmm, ClmmPoolInfo } from '../clmm'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountMeta,
  AccountMetaReadonly,
  CacheLTA,
  GetMultipleAccountsInfoConfig,
  Logger,
  RENT_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  findProgramAddress,
  getMultipleAccountsInfo,
  parseSimulateLogToJson,
  parseSimulateValue,
  simulateMultipleInstruction,
  splitTxAndSigners,
} from '../common'
import {
  BigNumberish,
  Currency,
  CurrencyAmount,
  ONE,
  Percent,
  Price,
  Token,
  TokenAmount,
  ZERO,
  divCeil,
  parseBigNumberish,
} from '../entity'
import { Farm, FarmPoolKeys } from '../farm'
import { struct, u64, u8 } from '../marshmallow'
import { MARKET_STATE_LAYOUT_V3, Market, MarketState } from '../serum'

import { LIQUIDITY_VERSION_TO_STATE_LAYOUT, LiquidityStateV4, LiquidityStateV5 } from './layout'
import {
  ModelDataPubkey,
  StableModelLayout,
  formatLayout,
  getDxByDyBaseIn,
  getDyByDxBaseIn,
  getStablePrice,
} from './stable'

const logger = Logger.from('Liquidity')

let modelData: StableModelLayout = {
  accountType: 0,
  status: 0,
  multiplier: 0,
  validDataCount: 0,
  DataElement: [],
}

export async function initStableModelLayout(connection: Connection) {
  if (modelData.validDataCount === 0) {
    if (connection) {
      const acc = await connection.getAccountInfo(ModelDataPubkey)
      if (acc) modelData = formatLayout(acc?.data)
    }
  }
}

// buy: quote => base
// sell: base => quote
// export type TradeSide = "buy" | "sell";

export type SwapSide = 'in' | 'out'
export type LiquiditySide = 'a' | 'b'
// for inner instruction
export type AmountSide = 'base' | 'quote'

/* ================= pool keys ================= */
export type LiquidityPoolKeysV4 = {
  [T in keyof ApiPoolInfoItem]: string extends ApiPoolInfoItem[T] ? PublicKey : ApiPoolInfoItem[T]
}

/**
 * Full liquidity pool keys that build transaction need
 */
export type LiquidityPoolKeys = LiquidityPoolKeysV4

export interface LiquidityAssociatedPoolKeysV4
  extends Omit<
    LiquidityPoolKeysV4,
    'marketBaseVault' | 'marketQuoteVault' | 'marketBids' | 'marketAsks' | 'marketEventQueue'
  > {
  nonce: number
}

/**
 * Associated liquidity pool keys
 * @remarks
 * without partial markets keys
 */
export type LiquidityAssociatedPoolKeys = LiquidityAssociatedPoolKeysV4 & { configId: PublicKey }

export enum LiquidityPoolStatus {
  Uninitialized,
  Initialized,
  Disabled,
  RemoveLiquidityOnly,
  LiquidityOnly,
  OrderBook,
  Swap,
  WaitingForStart,
}

/* ================= pool info ================= */
/**
 * Liquidity pool info
 * @remarks
 * same data type with layouts
 */
export interface LiquidityPoolInfo {
  status: BN
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
  baseReserve: BN
  quoteReserve: BN
  lpSupply: BN
  startTime: BN
}

/* ================= user keys ================= */
/**
 * Full user keys that build transaction need
 */
export interface LiquidityUserKeys {
  baseTokenAccount: PublicKey
  quoteTokenAccount: PublicKey
  lpTokenAccount: PublicKey
  owner: PublicKey
}

// liquidity class
// export interface LiquidityLoadParams {
//   connection: Connection;
//   poolKeys: LiquidityPoolKeys;
//   poolInfo?: LiquidityPoolInfo;
// }

// export type LiquidityConstructParams = Required<LiquidityLoadParams>;

/* ================= make instruction and transaction ================= */
export interface LiquidityAddInstructionParamsV4 {
  poolKeys: LiquidityPoolKeys
  userKeys: LiquidityUserKeys
  baseAmountIn: BigNumberish
  quoteAmountIn: BigNumberish
  fixedSide: AmountSide
}

/**
 * Add liquidity instruction params
 */
export type LiquidityAddInstructionParams = LiquidityAddInstructionParamsV4

/**
 * Add liquidity transaction params
 */
export interface LiquidityAddInstructionSimpleParams {
  connection: Connection
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  amountInA: CurrencyAmount | TokenAmount
  amountInB: CurrencyAmount | TokenAmount
  fixedSide: LiquiditySide
  config?: {
    bypassAssociatedCheck?: boolean
    checkCreateATAOwner?: boolean
  }
}

export interface LiquidityRemoveInstructionParamsV4 {
  poolKeys: LiquidityPoolKeys
  userKeys: LiquidityUserKeys
  amountIn: BigNumberish
}

/**
 * Remove liquidity instruction params
 */
export type LiquidityRemoveInstructionParams = LiquidityRemoveInstructionParamsV4

/**
 * Remove liquidity transaction params
 */
export interface LiquidityRemoveInstructionSimpleParams {
  connection: Connection
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  amountIn: TokenAmount
  config?: {
    bypassAssociatedCheck?: boolean
    checkCreateATAOwner?: boolean
  }
}

export interface LiquiditySwapFixedInInstructionParamsV4 {
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccountIn: PublicKey
    tokenAccountOut: PublicKey
    owner: PublicKey
  }
  amountIn: BigNumberish
  // minimum amount out
  minAmountOut: BigNumberish
}

export interface LiquiditySwapFixedOutInstructionParamsV4 {
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccountIn: PublicKey
    tokenAccountOut: PublicKey
    owner: PublicKey
  }
  // maximum amount in
  maxAmountIn: BigNumberish
  amountOut: BigNumberish
}

/**
 * Swap instruction params
 */
export interface LiquiditySwapInstructionParams {
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccountIn: PublicKey
    tokenAccountOut: PublicKey
    owner: PublicKey
  }
  amountIn: BigNumberish
  amountOut: BigNumberish
  fixedSide: SwapSide
}

/**
 * Swap transaction params
 */
export interface LiquiditySwapInstructionSimpleParams {
  connection: Connection
  poolKeys: LiquidityPoolKeys
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  amountIn: CurrencyAmount | TokenAmount
  amountOut: CurrencyAmount | TokenAmount
  fixedSide: SwapSide
  config?: {
    bypassAssociatedCheck?: boolean
    checkCreateATAOwner?: boolean
  }
}

export interface LiquidityInitPoolInstructionParamsV4 {
  poolKeys: LiquidityAssociatedPoolKeysV4
  userKeys: {
    lpTokenAccount: PublicKey
    payer: PublicKey
  }
  startTime: BigNumberish
}

/**
 * Init pool instruction params
 */
export type LiquidityInitPoolInstructionParams = LiquidityInitPoolInstructionParamsV4

/**
 * Init pool transaction params
 */
export interface LiquidityInitPoolTransactionParams {
  connection: Connection
  poolKeys: LiquidityAssociatedPoolKeysV4
  userKeys: {
    tokenAccounts: TokenAccount[]
    owner: PublicKey
    payer?: PublicKey
  }
  baseAmount: CurrencyAmount | TokenAmount
  quoteAmount: CurrencyAmount | TokenAmount
  startTime?: BigNumberish
  config?: {
    bypassAssociatedCheck?: boolean
    checkCreateATAOwner?: boolean
  }
}

/* ================= fetch data ================= */
/**
 * Fetch liquidity pool info params
 */
export interface LiquidityFetchInfoParams {
  connection: Connection
  poolKeys: LiquidityPoolKeys
}

/**
 * Fetch liquidity multiple pool info params
 */
export interface LiquidityFetchMultipleInfoParams {
  connection: Connection
  pools: LiquidityPoolKeys[]
  config?: GetMultipleAccountsInfoConfig
}

/* ================= compute data ================= */
export interface LiquidityComputeAnotherAmountParams {
  poolKeys: LiquidityPoolKeys
  poolInfo: LiquidityPoolInfo
  amount: CurrencyAmount | TokenAmount
  anotherCurrency: Currency | Token
  slippage: Percent
}

export const LIQUIDITY_FEES_NUMERATOR = new BN(25)
export const LIQUIDITY_FEES_DENOMINATOR = new BN(10000)

export interface LiquidityComputeAmountOutParams {
  poolKeys: LiquidityPoolKeys
  poolInfo: LiquidityPoolInfo
  amountIn: CurrencyAmount | TokenAmount
  currencyOut: Currency | Token
  slippage: Percent
}

export interface LiquidityComputeAmountInParams
  extends Omit<LiquidityComputeAmountOutParams, 'amountIn' | 'currencyOut'> {
  amountOut: CurrencyAmount | TokenAmount
  currencyIn: Currency | Token
}

export class Liquidity extends Base {
  // public connection: Connection;
  // public poolKeys: LiquidityPoolKeys;
  // public poolInfo: LiquidityPoolInfo;

  // constructor({ connection, poolKeys, poolInfo }: LiquidityConstructParams) {
  //   this.connection = connection;
  //   this.poolKeys = poolKeys;
  //   this.poolInfo = poolInfo;
  // }

  // static async load({ connection, poolKeys, poolInfo }: LiquidityLoadParams) {
  //   const _poolInfo = poolInfo || (await this.fetchInfo({ connection, poolKeys }));

  //   return new Liquidity({ connection, poolKeys, poolInfo: _poolInfo });
  // }

  /* ================= get version and program id ================= */
  // static getProgramId(version: number) {
  //   const programId = LIQUIDITY_VERSION_TO_PROGRAMID[version];
  //   logger.assertArgument(!!programId, "invalid version", "version", version);

  //   return programId;
  // }

  // static getVersion(programId: PublicKey) {
  //   const programIdString = programId.toBase58();

  //   const version = LIQUIDITY_PROGRAMID_TO_VERSION[programIdString];
  //   logger.assertArgument(!!version, "invalid program id", "programId", programIdString);

  //   return version;
  // }

  // static getSerumVersion(version: number) {
  //   const serumVersion = LIQUIDITY_VERSION_TO_SERUM_VERSION[version];
  //   logger.assertArgument(!!serumVersion, "invalid version", "version", version);

  //   return serumVersion;
  // }

  /* ================= get layout ================= */
  static getStateLayout(version: number) {
    const STATE_LAYOUT = LIQUIDITY_VERSION_TO_STATE_LAYOUT[version]
    logger.assertArgument(!!STATE_LAYOUT, 'invalid version', 'version', version)

    return STATE_LAYOUT
  }

  static getLayouts(version: number) {
    return { state: this.getStateLayout(version) }
  }

  /* ================= get key ================= */
  static getAssociatedId({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedAuthority({ programId }: { programId: PublicKey }) {
    return findProgramAddress(
      // new Uint8Array(Buffer.from('amm authority'.replace('\u00A0', ' '), 'utf-8'))
      [Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])],
      programId,
    )
  }

  static getAssociatedBaseVault({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedQuoteVault({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedLpMint({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedLpVault({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('temp_lp_token_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedTargetOrders({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedWithdrawQueue({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('withdraw_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedOpenOrders({ programId, marketId }: { programId: PublicKey; marketId: PublicKey }) {
    const { publicKey } = findProgramAddress(
      [programId.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')],
      programId,
    )
    return publicKey
  }

  static getAssociatedConfigId({ programId }: { programId: PublicKey }) {
    const { publicKey } = findProgramAddress([Buffer.from('amm_config_account_seed', 'utf-8')], programId)
    return publicKey
  }

  static getAssociatedPoolKeys({
    version,
    marketVersion,
    marketId,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    programId,
    marketProgramId,
  }: {
    version: 4 | 5
    marketVersion: 3
    marketId: PublicKey
    baseMint: PublicKey
    quoteMint: PublicKey
    baseDecimals: number
    quoteDecimals: number
    programId: PublicKey
    marketProgramId: PublicKey
  }): LiquidityAssociatedPoolKeys {
    const id = this.getAssociatedId({ programId, marketId })
    const lpMint = this.getAssociatedLpMint({ programId, marketId })
    const { publicKey: authority, nonce } = this.getAssociatedAuthority({ programId })
    const baseVault = this.getAssociatedBaseVault({ programId, marketId })
    const quoteVault = this.getAssociatedQuoteVault({ programId, marketId })
    const lpVault = this.getAssociatedLpVault({ programId, marketId })
    const openOrders = this.getAssociatedOpenOrders({ programId, marketId })
    const targetOrders = this.getAssociatedTargetOrders({ programId, marketId })
    const withdrawQueue = this.getAssociatedWithdrawQueue({ programId, marketId })

    const { publicKey: marketAuthority } = Market.getAssociatedAuthority({
      programId: marketProgramId,
      marketId,
    })

    return {
      // base
      id,
      baseMint,
      quoteMint,
      lpMint,
      baseDecimals,
      quoteDecimals,
      lpDecimals: baseDecimals,
      // version
      version,
      programId,
      // keys
      authority,
      nonce,
      baseVault,
      quoteVault,
      lpVault,
      openOrders,
      targetOrders,
      withdrawQueue,
      // market version
      marketVersion,
      marketProgramId,
      // market keys
      marketId,
      marketAuthority,
      lookupTableAccount: PublicKey.default,
      configId: this.getAssociatedConfigId({ programId }),
    }
  }

  static async getCreatePoolFee({ connection, programId }: { connection: Connection; programId: PublicKey }) {
    const configId = this.getAssociatedConfigId({ programId })

    const layout = struct([u64('fee')])
    const account = await connection.getAccountInfo(configId, { dataSlice: { offset: 536, length: 8 } })
    if (account === null) throw Error('get config account error')

    return layout.decode(account.data).fee
  }

  /* ================= make instruction and transaction ================= */
  static makeAddLiquidityInstruction(params: LiquidityAddInstructionParams) {
    const { poolKeys, userKeys, baseAmountIn, quoteAmountIn, fixedSide } = params
    const { version } = poolKeys

    if (version === 4 || version === 5) {
      const LAYOUT = struct([u8('instruction'), u64('baseAmountIn'), u64('quoteAmountIn'), u64('fixedSide')])
      const data = Buffer.alloc(LAYOUT.span)
      LAYOUT.encode(
        {
          instruction: 3,
          baseAmountIn: parseBigNumberish(baseAmountIn),
          quoteAmountIn: parseBigNumberish(quoteAmountIn),
          fixedSide: parseBigNumberish(fixedSide === 'base' ? 0 : 1),
        },
        data,
      )

      const keys = [
        // system
        AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
        // amm
        AccountMeta(poolKeys.id, false),
        AccountMetaReadonly(poolKeys.authority, false),
        AccountMetaReadonly(poolKeys.openOrders, false),
        AccountMeta(poolKeys.targetOrders, false),
        AccountMeta(poolKeys.lpMint, false),
        AccountMeta(poolKeys.baseVault, false),
        AccountMeta(poolKeys.quoteVault, false),
      ]

      if (version === 5) {
        keys.push(AccountMeta(ModelDataPubkey, false))
      }

      keys.push(
        // serum
        AccountMetaReadonly(poolKeys.marketId, false),
        // user
        AccountMeta(userKeys.baseTokenAccount, false),
        AccountMeta(userKeys.quoteTokenAccount, false),
        AccountMeta(userKeys.lpTokenAccount, false),
        AccountMetaReadonly(userKeys.owner, true),
        AccountMetaReadonly(poolKeys.marketEventQueue, false),
      )

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
          lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(PublicKey.default)),
          instructionTypes: [version === 4 ? InstructionType.ammV4AddLiquidity : InstructionType.ammV5AddLiquidity],
        },
      }
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static async makeAddLiquidityInstructionSimple<T extends TxVersion>(
    params: LiquidityAddInstructionSimpleParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const {
      connection,
      poolKeys,
      userKeys,
      amountInA,
      amountInB,
      fixedSide,
      config,
      makeTxVersion,
      lookupTableCache,
      computeBudgetConfig,
    } = params
    const { lpMint } = poolKeys
    const { tokenAccounts, owner, payer = owner } = userKeys

    logger.debug('amountInA:', amountInA)
    logger.debug('amountInB:', amountInB)
    logger.assertArgument(
      !amountInA.isZero() && !amountInB.isZero(),
      'amounts must greater than zero',
      'amountInA & amountInB',
      {
        amountInA: amountInA.toFixed(),
        amountInB: amountInB.toFixed(),
      },
    )

    const { bypassAssociatedCheck, checkCreateATAOwner } = {
      // default
      ...{ bypassAssociatedCheck: false, checkCreateATAOwner: false },
      // custom
      ...config,
    }

    // handle currency a & b (convert SOL to WSOL)
    const tokenA = amountInA instanceof TokenAmount ? amountInA.token : Token.WSOL
    const tokenB = amountInB instanceof TokenAmount ? amountInB.token : Token.WSOL

    const tokenAccountA = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: tokenA.mint,
      owner,
      config: { associatedOnly: false },
    })
    const tokenAccountB = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: tokenB.mint,
      owner,
      config: { associatedOnly: false },
    })
    logger.assertArgument(
      !!tokenAccountA || !!tokenAccountB,
      'cannot found target token accounts',
      'tokenAccounts',
      tokenAccounts,
    )
    const lpTokenAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: lpMint,
      owner,
    })

    const tokens = [tokenA, tokenB]
    const _tokenAccounts = [tokenAccountA, tokenAccountB]
    const rawAmounts = [amountInA.raw, amountInB.raw]

    // handle amount a & b and direction
    const [sideA] = this._getAmountsSide(amountInA, amountInB, poolKeys)
    let _fixedSide: AmountSide = 'base'
    if (sideA === 'quote') {
      // reverse
      tokens.reverse()
      _tokenAccounts.reverse()
      rawAmounts.reverse()

      if (fixedSide === 'a') _fixedSide = 'quote'
      else if (fixedSide === 'b') _fixedSide = 'base'
      else return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide)
    } else if (sideA === 'base') {
      if (fixedSide === 'a') _fixedSide = 'base'
      else if (fixedSide === 'b') _fixedSide = 'quote'
      else return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide)
    } else return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide)

    const [baseToken, quoteToken] = tokens
    const [baseTokenAccount, quoteTokenAccount] = _tokenAccounts
    const [baseAmountRaw, quoteAmountRaw] = rawAmounts

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const _baseTokenAccount = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'in',
      amount: baseAmountRaw,
      mint: baseToken.mint,
      tokenAccount: baseTokenAccount,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      endInstructionsType,
      checkCreateATAOwner,
    })
    const _quoteTokenAccount = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'in',
      amount: quoteAmountRaw,
      mint: quoteToken.mint,
      tokenAccount: quoteTokenAccount,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      endInstructionsType,
      checkCreateATAOwner,
    })
    const _lpTokenAccount = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'out',
      amount: 0,
      mint: lpMint,
      tokenAccount: lpTokenAccount,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      endInstructionsType,
      checkCreateATAOwner,
    })

    const ins = this.makeAddLiquidityInstruction({
      poolKeys,
      userKeys: {
        baseTokenAccount: _baseTokenAccount,
        quoteTokenAccount: _quoteTokenAccount,
        lpTokenAccount: _lpTokenAccount,
        owner,
      },
      baseAmountIn: baseAmountRaw,
      quoteAmountIn: quoteAmountRaw,
      fixedSide: _fixedSide,
    })

    return {
      address: {
        lpTokenAccount: _lpTokenAccount,
      },
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ins.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeRemoveLiquidityInstruction(params: LiquidityRemoveInstructionParams) {
    const { poolKeys, userKeys, amountIn } = params
    const { version } = poolKeys

    if (version === 4 || version === 5) {
      const LAYOUT = struct([u8('instruction'), u64('amountIn')])
      const data = Buffer.alloc(LAYOUT.span)
      LAYOUT.encode(
        {
          instruction: 4,
          amountIn: parseBigNumberish(amountIn),
        },
        data,
      )

      const keys = [
        // system
        AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
        // amm
        AccountMeta(poolKeys.id, false),
        AccountMetaReadonly(poolKeys.authority, false),
        AccountMeta(poolKeys.openOrders, false),
        AccountMeta(poolKeys.targetOrders, false),
        AccountMeta(poolKeys.lpMint, false),
        AccountMeta(poolKeys.baseVault, false),
        AccountMeta(poolKeys.quoteVault, false),
      ]

      if (version === 5) {
        keys.push(AccountMeta(ModelDataPubkey, false))
      } else {
        keys.push(AccountMeta(poolKeys.withdrawQueue, false))
        keys.push(AccountMeta(poolKeys.lpVault, false))
      }

      keys.push(
        // serum
        AccountMetaReadonly(poolKeys.marketProgramId, false),
        AccountMeta(poolKeys.marketId, false),
        AccountMeta(poolKeys.marketBaseVault, false),
        AccountMeta(poolKeys.marketQuoteVault, false),
        AccountMetaReadonly(poolKeys.marketAuthority, false),
        // user
        AccountMeta(userKeys.lpTokenAccount, false),
        AccountMeta(userKeys.baseTokenAccount, false),
        AccountMeta(userKeys.quoteTokenAccount, false),
        AccountMetaReadonly(userKeys.owner, true),
        // serum orderbook
        AccountMeta(poolKeys.marketEventQueue, false),
        AccountMeta(poolKeys.marketBids, false),
        AccountMeta(poolKeys.marketAsks, false),
      )

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
          lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(PublicKey.default)),
          instructionTypes: [
            version === 4 ? InstructionType.ammV4RemoveLiquidity : InstructionType.ammV5RemoveLiquidity,
          ],
        },
      }
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static async makeRemoveLiquidityInstructionSimple<T extends TxVersion>(
    params: LiquidityRemoveInstructionSimpleParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const { connection, poolKeys, userKeys, amountIn, config, makeTxVersion, lookupTableCache, computeBudgetConfig } =
      params
    const { baseMint, quoteMint, lpMint } = poolKeys
    const { tokenAccounts, owner, payer = owner } = userKeys

    logger.debug('amountIn:', amountIn)
    logger.assertArgument(!amountIn.isZero(), 'amount must greater than zero', 'amountIn', amountIn.toFixed())
    logger.assertArgument(
      amountIn instanceof TokenAmount && amountIn.token.mint.equals(lpMint),
      "amountIn's token not match lpMint",
      'amountIn',
      amountIn,
    )
    const lpTokenAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: lpMint,
      owner,
      config: { associatedOnly: false },
    })
    if (!lpTokenAccount) return logger.throwArgumentError('cannot found lpTokenAccount', 'tokenAccounts', tokenAccounts)

    const baseTokenAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: baseMint,
      owner,
    })
    const quoteTokenAccount = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: quoteMint,
      owner,
    })

    const { bypassAssociatedCheck, checkCreateATAOwner } = {
      // default
      ...{ bypassAssociatedCheck: false, checkCreateATAOwner: false },
      // custom
      ...config,
    }

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const _lpTokenAccount = lpTokenAccount
    const _baseTokenAccount = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'out',
      amount: 0,
      mint: baseMint,
      tokenAccount: baseTokenAccount,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      checkCreateATAOwner,
    })
    const _quoteTokenAccount = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'out',
      amount: 0,
      mint: quoteMint,
      tokenAccount: quoteTokenAccount,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      checkCreateATAOwner,
    })

    // frontInstructions.push(
    //   ComputeBudgetProgram.requestUnits({
    //     units: 400000,
    //     additionalFee: 0,
    //   }),
    // )

    const ins = this.makeRemoveLiquidityInstruction({
      poolKeys,
      userKeys: {
        lpTokenAccount: _lpTokenAccount,
        baseTokenAccount: _baseTokenAccount,
        quoteTokenAccount: _quoteTokenAccount,
        owner,
      },
      amountIn: amountIn.raw,
    })

    return {
      address: {
        lpTokenAccount: _lpTokenAccount,
      },
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ins.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeSwapInstruction(params: LiquiditySwapInstructionParams) {
    const { poolKeys, userKeys, amountIn, amountOut, fixedSide } = params
    const { version } = poolKeys

    if (version === 4 || version === 5) {
      if (fixedSide === 'in') {
        return this.makeSwapFixedInInstruction(
          {
            poolKeys,
            userKeys,
            amountIn,
            minAmountOut: amountOut,
          },
          version,
        )
      } else if (fixedSide === 'out') {
        return this.makeSwapFixedOutInstruction(
          {
            poolKeys,
            userKeys,
            maxAmountIn: amountIn,
            amountOut,
          },
          version,
        )
      }

      return logger.throwArgumentError('invalid params', 'params', params)
    }

    return logger.throwArgumentError('invalid version', 'poolKeys.version', version)
  }

  static makeSwapFixedInInstruction(
    { poolKeys, userKeys, amountIn, minAmountOut }: LiquiditySwapFixedInInstructionParamsV4,
    version: number,
  ) {
    const LAYOUT = struct([u8('instruction'), u64('amountIn'), u64('minAmountOut')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 9,
        amountIn: parseBigNumberish(amountIn),
        minAmountOut: parseBigNumberish(minAmountOut),
      },
      data,
    )

    const keys = [
      // system
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      // amm
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(poolKeys.openOrders, false),
    ]

    if (version === 4) {
      keys.push(AccountMeta(poolKeys.targetOrders, false))
    }

    keys.push(AccountMeta(poolKeys.baseVault, false), AccountMeta(poolKeys.quoteVault, false))

    if (version === 5) {
      keys.push(AccountMeta(ModelDataPubkey, false))
    }

    keys.push(
      // serum
      AccountMetaReadonly(poolKeys.marketProgramId, false),
      AccountMeta(poolKeys.marketId, false),
      AccountMeta(poolKeys.marketBids, false),
      AccountMeta(poolKeys.marketAsks, false),
      AccountMeta(poolKeys.marketEventQueue, false),
      AccountMeta(poolKeys.marketBaseVault, false),
      AccountMeta(poolKeys.marketQuoteVault, false),
      AccountMetaReadonly(poolKeys.marketAuthority, false),
      // user
      AccountMeta(userKeys.tokenAccountIn, false),
      AccountMeta(userKeys.tokenAccountOut, false),
      AccountMetaReadonly(userKeys.owner, true),
    )

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
        lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(PublicKey.default)),
        instructionTypes: [version === 4 ? InstructionType.ammV4SwapBaseIn : InstructionType.ammV5SwapBaseIn],
      },
    }
  }

  static makeSwapFixedOutInstruction(
    { poolKeys, userKeys, maxAmountIn, amountOut }: LiquiditySwapFixedOutInstructionParamsV4,
    version: number,
  ) {
    const LAYOUT = struct([u8('instruction'), u64('maxAmountIn'), u64('amountOut')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 11,
        maxAmountIn: parseBigNumberish(maxAmountIn),
        amountOut: parseBigNumberish(amountOut),
      },
      data,
    )

    const keys = [
      // system
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      // amm
      AccountMeta(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMeta(poolKeys.openOrders, false),
      AccountMeta(poolKeys.targetOrders, false),
      AccountMeta(poolKeys.baseVault, false),
      AccountMeta(poolKeys.quoteVault, false),
    ]

    if (version === 5) {
      keys.push(AccountMeta(ModelDataPubkey, false))
    }

    keys.push(
      // serum
      AccountMetaReadonly(poolKeys.marketProgramId, false),
      AccountMeta(poolKeys.marketId, false),
      AccountMeta(poolKeys.marketBids, false),
      AccountMeta(poolKeys.marketAsks, false),
      AccountMeta(poolKeys.marketEventQueue, false),
      AccountMeta(poolKeys.marketBaseVault, false),
      AccountMeta(poolKeys.marketQuoteVault, false),
      AccountMetaReadonly(poolKeys.marketAuthority, false),
      // user
      AccountMeta(userKeys.tokenAccountIn, false),
      AccountMeta(userKeys.tokenAccountOut, false),
      AccountMetaReadonly(userKeys.owner, true),
    )

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
        lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(PublicKey.default)),
        instructionTypes: [version === 4 ? InstructionType.ammV4SwapBaseOut : InstructionType.ammV5SwapBaseOut],
      },
    }
  }

  static async makeSwapInstructionSimple<T extends TxVersion>(
    params: LiquiditySwapInstructionSimpleParams & {
      makeTxVersion: T
      lookupTableCache?: CacheLTA
      computeBudgetConfig?: ComputeBudgetConfig
    },
  ) {
    const {
      connection,
      poolKeys,
      userKeys,
      amountIn,
      amountOut,
      fixedSide,
      config,
      makeTxVersion,
      lookupTableCache,
      computeBudgetConfig,
    } = params
    const { tokenAccounts, owner, payer = owner } = userKeys

    logger.debug('amountIn:', amountIn)
    logger.debug('amountOut:', amountOut)
    logger.assertArgument(
      !amountIn.isZero() && !amountOut.isZero(),
      'amounts must greater than zero',
      'currencyAmounts',
      {
        amountIn: amountIn.toFixed(),
        amountOut: amountOut.toFixed(),
      },
    )

    const { bypassAssociatedCheck, checkCreateATAOwner } = {
      // default
      ...{ bypassAssociatedCheck: false, checkCreateATAOwner: false },
      // custom
      ...config,
    }

    // handle currency in & out (convert SOL to WSOL)
    const tokenIn = amountIn instanceof TokenAmount ? amountIn.token : Token.WSOL
    const tokenOut = amountOut instanceof TokenAmount ? amountOut.token : Token.WSOL

    const tokenAccountIn = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: tokenIn.mint,
      owner,
      config: { associatedOnly: false },
    })
    const tokenAccountOut = this._selectTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      tokenAccounts,
      mint: tokenOut.mint,
      owner,
    })

    const [amountInRaw, amountOutRaw] = [amountIn.raw, amountOut.raw]

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const _tokenAccountIn = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'in',
      amount: amountInRaw,
      mint: tokenIn.mint,
      tokenAccount: tokenAccountIn,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      checkCreateATAOwner,
    })
    const _tokenAccountOut = await this._handleTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      connection,
      side: 'out',
      amount: 0,
      mint: tokenOut.mint,
      tokenAccount: tokenAccountOut,
      owner,
      payer,
      frontInstructions,
      endInstructions,
      signers,
      bypassAssociatedCheck,
      frontInstructionsType,
      checkCreateATAOwner,
    })

    const ins = this.makeSwapInstruction({
      poolKeys,
      userKeys: {
        tokenAccountIn: _tokenAccountIn,
        tokenAccountOut: _tokenAccountOut,
        owner,
      },
      amountIn: amountInRaw,
      amountOut: amountOutRaw,
      fixedSide,
    })

    return {
      address: {},
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ins.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeSimulatePoolInfoInstruction({ poolKeys }: { poolKeys: LiquidityPoolKeys }) {
    const LAYOUT = struct([u8('instruction'), u8('simulateType')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 12,
        simulateType: 0,
      },
      data,
    )

    const keys = [
      // amm
      AccountMetaReadonly(poolKeys.id, false),
      AccountMetaReadonly(poolKeys.authority, false),
      AccountMetaReadonly(poolKeys.openOrders, false),
      AccountMetaReadonly(poolKeys.baseVault, false),
      AccountMetaReadonly(poolKeys.quoteVault, false),
      AccountMetaReadonly(poolKeys.lpMint, false),
      // serum
      AccountMetaReadonly(poolKeys.marketId, false),
      AccountMetaReadonly(poolKeys.marketEventQueue, false),
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
        lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(PublicKey.default)),
        instructionTypes: [
          poolKeys.version === 4 ? InstructionType.ammV4SimulatePoolInfo : InstructionType.ammV5SimulatePoolInfo,
        ],
      },
    }
  }

  static isV4(lsl: any): lsl is LiquidityStateV4 {
    return lsl.withdrawQueue !== undefined
  }

  static async makeCreatePoolV4InstructionV2Simple<T extends TxVersion>({
    connection,
    programId,
    marketInfo,
    baseMintInfo,
    quoteMintInfo,
    baseAmount,
    quoteAmount,
    startTime,
    ownerInfo,
    associatedOnly = false,
    computeBudgetConfig,
    checkCreateATAOwner = false,
    makeTxVersion,
    lookupTableCache,
    feeDestinationId,
  }: {
    connection: Connection
    programId: PublicKey
    marketInfo: {
      marketId: PublicKey
      programId: PublicKey
    }
    baseMintInfo: {
      mint: PublicKey
      decimals: number
    }
    quoteMintInfo: {
      mint: PublicKey
      decimals: number
    }

    baseAmount: BN
    quoteAmount: BN
    startTime: BN

    ownerInfo: {
      feePayer: PublicKey
      wallet: PublicKey
      tokenAccounts: TokenAccount[]
      useSOLBalance?: boolean // if has WSOL mint
    }
    associatedOnly: boolean
    checkCreateATAOwner: boolean
    computeBudgetConfig?: ComputeBudgetConfig
  } & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
    feeDestinationId: PublicKey
  }) {
    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const mintAUseSOLBalance = ownerInfo.useSOLBalance && baseMintInfo.mint.equals(Token.WSOL.mint)
    const mintBUseSOLBalance = ownerInfo.useSOLBalance && quoteMintInfo.mint.equals(Token.WSOL.mint)

    const ownerTokenAccountBase = await this._selectOrCreateTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      mint: baseMintInfo.mint,
      tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
      owner: ownerInfo.wallet,

      createInfo: mintAUseSOLBalance
        ? {
            connection,
            payer: ownerInfo.feePayer,
            amount: baseAmount,

            frontInstructions,
            frontInstructionsType,
            endInstructions: mintAUseSOLBalance ? endInstructions : [],
            endInstructionsType: mintAUseSOLBalance ? endInstructionsType : [],
            signers,
          }
        : undefined,

      associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
      checkCreateATAOwner,
    })

    const ownerTokenAccountQuote = await this._selectOrCreateTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      mint: quoteMintInfo.mint,
      tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
      owner: ownerInfo.wallet,

      createInfo: mintBUseSOLBalance
        ? {
            connection,
            payer: ownerInfo.feePayer,
            amount: quoteAmount,

            frontInstructions,
            frontInstructionsType,
            endInstructions: mintBUseSOLBalance ? endInstructions : [],
            endInstructionsType: mintBUseSOLBalance ? endInstructionsType : [],
            signers,
          }
        : undefined,

      associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
      checkCreateATAOwner,
    })

    if (ownerTokenAccountBase === undefined || ownerTokenAccountQuote === undefined)
      throw Error("you don't has some token account")

    const poolInfo = Liquidity.getAssociatedPoolKeys({
      version: 4,
      marketVersion: 3,
      marketId: marketInfo.marketId,
      baseMint: baseMintInfo.mint,
      quoteMint: quoteMintInfo.mint,
      baseDecimals: baseMintInfo.decimals,
      quoteDecimals: quoteMintInfo.decimals,
      programId,
      marketProgramId: marketInfo.programId,
    })

    const ins = this.makeCreatePoolV4InstructionV2({
      programId,
      ammId: poolInfo.id,
      ammAuthority: poolInfo.authority,
      ammOpenOrders: poolInfo.openOrders,
      lpMint: poolInfo.lpMint,
      coinMint: poolInfo.baseMint,
      pcMint: poolInfo.quoteMint,
      coinVault: poolInfo.baseVault,
      pcVault: poolInfo.quoteVault,
      ammTargetOrders: poolInfo.targetOrders,
      marketProgramId: poolInfo.marketProgramId,
      marketId: poolInfo.marketId,
      userWallet: ownerInfo.wallet,
      userCoinVault: ownerTokenAccountBase,
      userPcVault: ownerTokenAccountQuote,
      userLpVault: getATAAddress(ownerInfo.wallet, poolInfo.lpMint, TOKEN_PROGRAM_ID).publicKey,
      ammConfigId: poolInfo.configId,
      feeDestinationId,

      nonce: poolInfo.nonce,
      openTime: startTime,
      coinAmount: baseAmount,
      pcAmount: quoteAmount,
    }).innerTransaction

    return {
      address: {
        programId,
        ammId: poolInfo.id,
        ammAuthority: poolInfo.authority,
        ammOpenOrders: poolInfo.openOrders,
        lpMint: poolInfo.lpMint,
        coinMint: poolInfo.baseMint,
        pcMint: poolInfo.quoteMint,
        coinVault: poolInfo.baseVault,
        pcVault: poolInfo.quoteVault,
        withdrawQueue: poolInfo.withdrawQueue,
        ammTargetOrders: poolInfo.targetOrders,
        poolTempLp: poolInfo.lpVault,
        marketProgramId: poolInfo.marketProgramId,
        marketId: poolInfo.marketId,
      },
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: ownerInfo.feePayer,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          ins,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  static makeCreatePoolV4InstructionV2({
    programId,
    ammId,
    ammAuthority,
    ammOpenOrders,
    lpMint,
    coinMint,
    pcMint,
    coinVault,
    pcVault,
    ammTargetOrders,
    marketProgramId,
    marketId,
    userWallet,
    userCoinVault,
    userPcVault,
    userLpVault,
    nonce,
    openTime,
    coinAmount,
    pcAmount,
    lookupTableAddress,
    ammConfigId,
    feeDestinationId,
  }: {
    programId: PublicKey
    ammId: PublicKey
    ammAuthority: PublicKey
    ammOpenOrders: PublicKey
    lpMint: PublicKey
    coinMint: PublicKey
    pcMint: PublicKey
    coinVault: PublicKey
    pcVault: PublicKey
    ammTargetOrders: PublicKey
    marketProgramId: PublicKey
    marketId: PublicKey
    userWallet: PublicKey
    userCoinVault: PublicKey
    userPcVault: PublicKey
    userLpVault: PublicKey

    lookupTableAddress?: PublicKey
    ammConfigId: PublicKey
    feeDestinationId: PublicKey

    nonce: number
    openTime: BN
    coinAmount: BN
    pcAmount: BN
  }): MakeInstructionOutType {
    const dataLayout = struct([u8('instruction'), u8('nonce'), u64('openTime'), u64('pcAmount'), u64('coinAmount')])

    const keys = [
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: RENT_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ammId, isSigner: false, isWritable: true },
      { pubkey: ammAuthority, isSigner: false, isWritable: false },
      { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
      { pubkey: lpMint, isSigner: false, isWritable: true },
      { pubkey: coinMint, isSigner: false, isWritable: false },
      { pubkey: pcMint, isSigner: false, isWritable: false },
      { pubkey: coinVault, isSigner: false, isWritable: true },
      { pubkey: pcVault, isSigner: false, isWritable: true },
      { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
      { pubkey: ammConfigId, isSigner: false, isWritable: false },
      { pubkey: feeDestinationId, isSigner: false, isWritable: true },
      { pubkey: marketProgramId, isSigner: false, isWritable: false },
      { pubkey: marketId, isSigner: false, isWritable: false },
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: userCoinVault, isSigner: false, isWritable: true },
      { pubkey: userPcVault, isSigner: false, isWritable: true },
      { pubkey: userLpVault, isSigner: false, isWritable: true },
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode({ instruction: 1, nonce, openTime, coinAmount, pcAmount }, data)

    const ins = new TransactionInstruction({
      keys,
      programId,
      data,
    })
    return {
      address: {},
      innerTransaction: {
        instructions: [ins],
        signers: [],
        lookupTableAddress: lookupTableAddress ? [lookupTableAddress] : undefined,
        instructionTypes: [InstructionType.ammV4CreatePoolV2],
      },
    }
  }

  static async makeRemoveAllLpAndCreateClmmPosition<T extends TxVersion>({
    connection,
    poolKeys,
    removeLpAmount,
    userKeys,
    clmmPoolKeys,
    createPositionInfo,
    farmInfo,
    computeBudgetConfig,
    checkCreateATAOwner = false,
    getEphemeralSigners,
    makeTxVersion,
    lookupTableCache,
  }: {
    connection: Connection
    poolKeys: LiquidityPoolKeys
    removeLpAmount: BN
    clmmPoolKeys: ClmmPoolInfo
    createPositionInfo: {
      tickLower: number
      tickUpper: number
      liquidity: BN
      amountMaxA: BN
      amountMaxB: BN
    }
    userKeys: {
      tokenAccounts: TokenAccount[]
      owner: PublicKey
      payer?: PublicKey
    }
    farmInfo?: {
      poolKeys: FarmPoolKeys
      amount: BN
    }
    computeBudgetConfig?: ComputeBudgetConfig
    checkCreateATAOwner: boolean

    getEphemeralSigners?: (k: number) => any
  } & {
    makeTxVersion: T
    lookupTableCache?: CacheLTA
  }) {
    if (!(poolKeys.baseMint.equals(clmmPoolKeys.mintA.mint) || poolKeys.baseMint.equals(clmmPoolKeys.mintB.mint)))
      throw Error('mint check error')
    if (!(poolKeys.quoteMint.equals(clmmPoolKeys.mintA.mint) || poolKeys.quoteMint.equals(clmmPoolKeys.mintB.mint)))
      throw Error('mint check error')

    const frontInstructions: TransactionInstruction[] = []
    const endInstructions: TransactionInstruction[] = []
    const frontInstructionsType: InstructionType[] = []
    const endInstructionsType: InstructionType[] = []
    const signers: Signer[] = []

    const mintToAccount: { [mint: string]: PublicKey } = {}
    for (const item of userKeys.tokenAccounts) {
      if (
        mintToAccount[item.accountInfo.mint.toString()] === undefined ||
        getATAAddress(userKeys.owner, item.accountInfo.mint, TOKEN_PROGRAM_ID).publicKey.equals(item.pubkey)
      ) {
        mintToAccount[item.accountInfo.mint.toString()] = item.pubkey
      }
    }

    const lpTokenAccount = mintToAccount[poolKeys.lpMint.toString()]
    if (lpTokenAccount === undefined) throw Error('find lp account error in trade accounts')

    const amountIn = removeLpAmount.add(farmInfo?.amount ?? new BN(0))

    const mintBaseUseSOLBalance = poolKeys.baseMint.equals(Token.WSOL.mint)
    const mintQuoteUseSOLBalance = poolKeys.quoteMint.equals(Token.WSOL.mint)

    const baseTokenAccount = await this._selectOrCreateTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      mint: poolKeys.baseMint,
      tokenAccounts: userKeys.tokenAccounts,
      owner: userKeys.owner,
      createInfo: {
        connection,
        payer: userKeys.payer ?? userKeys.owner,

        frontInstructions,
        frontInstructionsType,
        endInstructions: mintBaseUseSOLBalance ? endInstructions : [],
        endInstructionsType: mintBaseUseSOLBalance ? endInstructionsType : [],
        signers,
      },
      associatedOnly: true,
      checkCreateATAOwner,
    })

    const quoteTokenAccount = await this._selectOrCreateTokenAccount({
      programId: TOKEN_PROGRAM_ID,
      mint: poolKeys.quoteMint,
      tokenAccounts: userKeys.tokenAccounts,
      owner: userKeys.owner,

      createInfo: {
        connection,
        payer: userKeys.payer ?? userKeys.owner,
        amount: 0,

        frontInstructions,
        frontInstructionsType,
        endInstructions: mintQuoteUseSOLBalance ? endInstructions : [],
        endInstructionsType: mintQuoteUseSOLBalance ? endInstructionsType : [],
        signers,
      },

      associatedOnly: true,
      checkCreateATAOwner,
    })

    mintToAccount[poolKeys.baseMint.toString()] = baseTokenAccount
    mintToAccount[poolKeys.quoteMint.toString()] = quoteTokenAccount

    const removeIns = this.makeRemoveLiquidityInstruction({
      poolKeys,
      userKeys: {
        lpTokenAccount,
        baseTokenAccount,
        quoteTokenAccount,
        owner: userKeys.owner,
      },
      amountIn,
    })

    const [tokenAccountA, tokenAccountB] = poolKeys.baseMint.equals(clmmPoolKeys.mintA.mint)
      ? [baseTokenAccount, quoteTokenAccount]
      : [quoteTokenAccount, baseTokenAccount]
    const createPositionIns = await Clmm.makeOpenPositionFromLiquidityInstructions({
      poolInfo: clmmPoolKeys,
      ownerInfo: {
        feePayer: userKeys.payer ?? userKeys.owner,
        wallet: userKeys.owner,
        tokenAccountA,
        tokenAccountB,
      },
      withMetadata: 'create',
      ...createPositionInfo,
      getEphemeralSigners,
    })

    let withdrawFarmIns: InnerTransaction = {
      instructions: [],
      signers: [],
      instructionTypes: [],
    }
    if (farmInfo !== undefined) {
      const rewardTokenAccounts = []
      for (const item of farmInfo.poolKeys.rewardInfos) {
        const rewardIsWsol = item.rewardMint.equals(Token.WSOL.mint)
        rewardTokenAccounts.push(
          mintToAccount[item.rewardMint.toString()] ??
            (await this._selectOrCreateTokenAccount({
              programId: TOKEN_PROGRAM_ID,
              mint: item.rewardMint,
              tokenAccounts: userKeys.tokenAccounts,
              owner: userKeys.owner,
              createInfo: {
                connection,
                payer: userKeys.payer ?? userKeys.owner,

                frontInstructions,
                frontInstructionsType,
                endInstructions: rewardIsWsol ? endInstructions : [],
                endInstructionsType: rewardIsWsol ? endInstructionsType : [],
                signers,
              },
              associatedOnly: true,
              checkCreateATAOwner,
            })),
        )
      }
      withdrawFarmIns = Farm.makeWithdrawInstruction({
        poolKeys: farmInfo.poolKeys,
        amount: farmInfo.amount,
        userKeys: {
          ledger: Farm.getAssociatedLedgerAccount({
            programId: farmInfo.poolKeys.programId,
            poolId: farmInfo.poolKeys.id,
            owner: userKeys.owner,
            version: farmInfo.poolKeys.version as 3 | 5 | 6,
          }),
          lpTokenAccount,
          rewardTokenAccounts,
          owner: userKeys.owner,
        },
      }).innerTransaction
    }

    return {
      address: { ...removeIns.address, ...createPositionIns.address },
      innerTransactions: await splitTxAndSigners({
        connection,
        makeTxVersion,
        computeBudgetConfig,
        payer: userKeys.payer ?? userKeys.owner,
        innerTransaction: [
          { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
          withdrawFarmIns,
          removeIns.innerTransaction,
          createPositionIns.innerTransaction,
          { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
        ],
        lookupTableCache,
      }),
    }
  }

  /* ================= fetch data ================= */
  /**
   * Fetch all pools keys from on-chain data
   */
  static async fetchAllPoolKeys(
    connection: Connection,
    programId: { 4: PublicKey; 5: PublicKey },
    config?: GetMultipleAccountsInfoConfig,
  ): Promise<LiquidityPoolKeys[]> {
    const allPools = (
      await Promise.all(
        Object.entries(LIQUIDITY_VERSION_TO_STATE_LAYOUT).map(([version, layout]) => {
          try {
            return connection
              .getProgramAccounts(programId[Number(version) as 4 | 5], {
                filters: [{ dataSize: layout.span }],
              })
              .then((accounts) => {
                return accounts.map((info) => {
                  return {
                    id: info.pubkey,
                    version: Number(version) as 4 | 5,
                    programId: programId[Number(version) as 4 | 5],
                    ...layout.decode(info.account.data),
                  }
                })
              })
          } catch (error) {
            if (error instanceof Error) {
              return logger.throwError('failed to fetch pool info', Logger.errors.RPC_ERROR, {
                message: error.message,
              })
            }
          }
        }),
      )
    ).flat()

    const allMarketIds = allPools.map((i) => i!.marketId)
    const marketsInfo: { [marketId: string]: MarketState } = {}
    try {
      const _marketsInfo = await getMultipleAccountsInfo(connection, allMarketIds, config)
      for (const item of _marketsInfo) {
        if (item === null) continue

        const _i = { programId: item.owner, ...MARKET_STATE_LAYOUT_V3.decode(item.data) }
        marketsInfo[_i.ownAddress.toString()] = _i
      }
    } catch (error) {
      if (error instanceof Error) {
        return logger.throwError('failed to fetch markets', Logger.errors.RPC_ERROR, {
          message: error.message,
        })
      }
    }

    const authority: { [key: string]: PublicKey } = {}
    for (const [version, _programId] of Object.entries(programId))
      authority[version] = this.getAssociatedAuthority({ programId: _programId }).publicKey

    const formatPoolInfos: LiquidityPoolKeys[] = []
    for (const pool of allPools) {
      if (pool === undefined) continue
      if (pool.baseMint.equals(PublicKey.default)) continue
      const market = marketsInfo[pool.marketId.toString()]

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const marketProgramId = market.programId

      formatPoolInfos.push({
        id: pool.id,
        baseMint: pool.baseMint,
        quoteMint: pool.quoteMint,
        lpMint: pool.lpMint,
        baseDecimals: pool.baseDecimal.toNumber(),
        quoteDecimals: pool.quoteDecimal.toNumber(),
        lpDecimals:
          pool.id.toString() === '6kmMMacvoCKBkBrqssLEdFuEZu2wqtLdNQxh9VjtzfwT' ? 5 : pool.baseDecimal.toNumber(),
        version: pool.version,
        programId: pool.programId,
        authority: authority[pool.version],
        openOrders: pool.openOrders,
        targetOrders: pool.targetOrders,
        baseVault: pool.baseVault,
        quoteVault: pool.quoteVault,
        marketVersion: 3,
        marketProgramId,
        marketId: market.ownAddress,
        marketAuthority: Market.getAssociatedAuthority({
          programId: marketProgramId,
          marketId: market.ownAddress,
        }).publicKey,
        marketBaseVault: market.baseVault,
        marketQuoteVault: market.quoteVault,
        marketBids: market.bids,
        marketAsks: market.asks,
        marketEventQueue: market.eventQueue,
        ...(pool.version === 5
          ? {
              modelDataAccount: (pool as LiquidityStateV5).modelDataAccount,
              withdrawQueue: PublicKey.default,
              lpVault: PublicKey.default,
            }
          : {
              withdrawQueue: (pool as LiquidityStateV4).withdrawQueue,
              lpVault: (pool as LiquidityStateV4).lpVault,
            }),
        lookupTableAccount: PublicKey.default,
      })
    }
    return formatPoolInfos
  }

  /**
   * Fetch liquidity pool's info
   */
  static async fetchInfo({ connection, poolKeys }: LiquidityFetchInfoParams) {
    const info = await this.fetchMultipleInfo({ connection, pools: [poolKeys] })

    logger.assertArgument(info.length === 1, `fetchInfo failed, ${info.length} pools found`, 'poolKeys.id', poolKeys.id)

    return info[0]
  }

  /**
   * Fetch multiple info of liquidity pools
   */
  static async fetchMultipleInfo({
    connection,
    pools,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config,
  }: LiquidityFetchMultipleInfoParams): Promise<LiquidityPoolInfo[]> {
    await initStableModelLayout(connection)

    const instructions = pools.map((pool) => this.makeSimulatePoolInfoInstruction({ poolKeys: pool }))

    const logs = await simulateMultipleInstruction(
      connection,
      instructions.map((i) => i.innerTransaction.instructions).flat(),
      'GetPoolData',
    )

    const poolsInfo = logs.map((log) => {
      const json = parseSimulateLogToJson(log, 'GetPoolData')

      const status = new BN(parseSimulateValue(json, 'status'))
      const baseDecimals = Number(parseSimulateValue(json, 'coin_decimals'))
      const quoteDecimals = Number(parseSimulateValue(json, 'pc_decimals'))
      const lpDecimals = Number(parseSimulateValue(json, 'lp_decimals'))
      const baseReserve = new BN(parseSimulateValue(json, 'pool_coin_amount'))
      const quoteReserve = new BN(parseSimulateValue(json, 'pool_pc_amount'))
      const lpSupply = new BN(parseSimulateValue(json, 'pool_lp_supply'))
      // TODO fix it when split stable
      let startTime = '0'
      try {
        startTime = parseSimulateValue(json, 'pool_open_time')
      } catch (error) {
        //
      }

      return {
        status,
        baseDecimals,
        quoteDecimals,
        lpDecimals,
        baseReserve,
        quoteReserve,
        lpSupply,
        startTime: new BN(startTime),
      }
    })

    return poolsInfo
  }

  /* ================= compute data ================= */
  static getEnabledFeatures(poolInfo: LiquidityPoolInfo) {
    const { status } = poolInfo
    const _status = status.toNumber()

    if (_status === LiquidityPoolStatus.Uninitialized)
      return {
        swap: false,
        addLiquidity: false,
        removeLiquidity: false,
      }
    else if (_status === LiquidityPoolStatus.Initialized)
      return {
        swap: true,
        addLiquidity: true,
        removeLiquidity: true,
      }
    else if (_status === LiquidityPoolStatus.Disabled)
      return {
        swap: false,
        addLiquidity: false,
        removeLiquidity: false,
      }
    else if (_status === LiquidityPoolStatus.RemoveLiquidityOnly)
      return {
        swap: false,
        addLiquidity: false,
        removeLiquidity: true,
      }
    else if (_status === LiquidityPoolStatus.LiquidityOnly)
      return {
        swap: false,
        addLiquidity: true,
        removeLiquidity: true,
      }
    else if (_status === LiquidityPoolStatus.OrderBook)
      return {
        swap: false,
        addLiquidity: true,
        removeLiquidity: true,
      }
    else if (_status === LiquidityPoolStatus.Swap)
      return {
        swap: true,
        addLiquidity: true,
        removeLiquidity: true,
      }
    else if (_status === LiquidityPoolStatus.WaitingForStart) {
      // handle start time
      const { startTime } = poolInfo
      if (Date.now() / 1000 < startTime.toNumber())
        return {
          swap: false,
          addLiquidity: true,
          removeLiquidity: true,
        }

      return {
        swap: true,
        addLiquidity: true,
        removeLiquidity: true,
      }
    } else
      return {
        swap: false,
        addLiquidity: false,
        removeLiquidity: false,
      }
  }

  static includesToken(token: Token, poolKeys: LiquidityPoolKeys) {
    const { baseMint, quoteMint } = poolKeys

    return token.mint.equals(baseMint) || token.mint.equals(quoteMint)
  }

  /**
   * Get token side of liquidity pool
   * @param token - the token provided
   * @param poolKeys - the pool keys
   * @returns token side is `base` or `quote`
   */
  static _getTokenSide(token: Token, poolKeys: LiquidityPoolKeys): AmountSide {
    const { baseMint, quoteMint } = poolKeys

    if (token.mint.equals(baseMint)) return 'base'
    else if (token.mint.equals(quoteMint)) return 'quote'
    else
      return logger.throwArgumentError('token not match with pool', 'params', {
        token: token.mint,
        baseMint,
        quoteMint,
      })
  }

  /**
   * Get tokens side of liquidity pool
   * @param tokenA - the token provided
   * @param tokenB - the token provided
   * @param poolKeys - the pool keys
   * @returns tokens side array
   */
  static _getTokensSide(tokenA: Token, tokenB: Token, poolKeys: LiquidityPoolKeys): AmountSide[] {
    const { baseMint, quoteMint } = poolKeys

    const sideA = this._getTokenSide(tokenA, poolKeys)
    const sideB = this._getTokenSide(tokenB, poolKeys)

    logger.assertArgument(sideA !== sideB, 'tokens not match with pool', 'params', {
      tokenA: tokenA.mint,
      tokenB: tokenB.mint,
      baseMint,
      quoteMint,
    })
    return [sideA, sideB]
  }

  /**
   * Get currency amount side of liquidity pool
   * @param amount - the currency amount provided
   * @param poolKeys - the pool keys
   * @returns currency amount side is `base` or `quote`
   */
  static _getAmountSide(amount: CurrencyAmount | TokenAmount, poolKeys: LiquidityPoolKeys): AmountSide {
    const token = amount instanceof TokenAmount ? amount.token : Token.WSOL

    return this._getTokenSide(token, poolKeys)
  }

  /**
   * Get currencies amount side of liquidity pool
   * @param amountA - the currency amount provided
   * @param amountB - the currency amount provided
   * @param poolKeys - the pool keys
   * @returns currencies amount side array
   */
  static _getAmountsSide(
    amountA: CurrencyAmount | TokenAmount,
    amountB: CurrencyAmount | TokenAmount,
    poolKeys: LiquidityPoolKeys,
  ): AmountSide[] {
    const tokenA = amountA instanceof TokenAmount ? amountA.token : Token.WSOL
    const tokenB = amountB instanceof TokenAmount ? amountB.token : Token.WSOL

    return this._getTokensSide(tokenA, tokenB, poolKeys)
  }

  /**
   * Compute the another currency amount of add liquidity
   *
   * @param params - {@link LiquidityComputeAnotherAmountParams}
   *
   * @returns
   * anotherCurrencyAmount - currency amount without slippage
   * @returns
   * maxAnotherCurrencyAmount - currency amount with slippage
   *
   * @returns {@link CurrencyAmount}
   *
   * @example
   * ```
   * Liquidity.computeAnotherAmount({
   *   // 1%
   *   slippage: new Percent(1, 100)
   * })
   * ```
   */
  static computeAnotherAmount({
    poolKeys,
    poolInfo,
    amount,
    anotherCurrency,
    slippage,
  }: LiquidityComputeAnotherAmountParams):
    | { anotherAmount: CurrencyAmount; maxAnotherAmount: CurrencyAmount; liquidity: BN }
    | { anotherAmount: TokenAmount; maxAnotherAmount: TokenAmount; liquidity: BN } {
    const { baseReserve, quoteReserve } = poolInfo
    logger.debug('baseReserve:', baseReserve.toString())
    logger.debug('quoteReserve:', quoteReserve.toString())

    const currencyIn = amount instanceof TokenAmount ? amount.token : amount.currency
    logger.debug('currencyIn:', currencyIn)
    logger.debug('amount:', amount.toFixed())
    logger.debug('anotherCurrency:', anotherCurrency)
    logger.debug('slippage:', `${slippage.toSignificant()}%`)

    // input is fixed
    const input = this._getAmountSide(amount, poolKeys)
    logger.debug('input side:', input)

    // round up
    let amountRaw = ZERO
    if (!amount.isZero()) {
      amountRaw =
        input === 'base'
          ? divCeil(amount.raw.mul(quoteReserve), baseReserve)
          : divCeil(amount.raw.mul(baseReserve), quoteReserve)
    }

    const liquidity = divCeil(
      amount.raw.mul(poolInfo.lpSupply),
      input === 'base' ? poolInfo.baseReserve : poolInfo.quoteReserve,
    )

    const _slippage = new Percent(ONE).add(slippage)
    const slippageAdjustedAmount = _slippage.mul(amountRaw).quotient

    const _anotherAmount =
      anotherCurrency instanceof Token
        ? new TokenAmount(anotherCurrency, amountRaw)
        : new CurrencyAmount(anotherCurrency, amountRaw)
    const _maxAnotherAmount =
      anotherCurrency instanceof Token
        ? new TokenAmount(anotherCurrency, slippageAdjustedAmount)
        : new CurrencyAmount(anotherCurrency, slippageAdjustedAmount)
    logger.debug('anotheAmount:', _anotherAmount.toFixed())
    logger.debug('maxAnotheAmount:', _maxAnotherAmount.toFixed())

    return {
      anotherAmount: _anotherAmount,
      maxAnotherAmount: _maxAnotherAmount,
      liquidity,
    }
  }

  static _computePriceImpact(currentPrice: Price, amountIn: BN, amountOut: BN) {
    const exactQuote = currentPrice.raw.mul(amountIn)
    // calculate slippage := (exactQuote - outputAmount) / exactQuote
    const slippage = exactQuote.sub(amountOut).div(exactQuote)
    return new Percent(slippage.numerator, slippage.denominator)
  }

  static getRate(poolInfo: LiquidityPoolInfo) {
    const { baseReserve, quoteReserve, baseDecimals, quoteDecimals } = poolInfo
    const price = new Price(new Currency(baseDecimals), baseReserve, new Currency(quoteDecimals), quoteReserve)

    return price
  }

  /**
   * Compute output currency amount of swap
   *
   * @param params - {@link LiquidityComputeAmountOutParams}
   *
   * @returns
   * amountOut - currency amount without slippage
   * @returns
   * minAmountOut - currency amount with slippage
   */
  static computeAmountOut = ({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  }: LiquidityComputeAmountOutParams):
    | {
        amountOut: CurrencyAmount
        minAmountOut: CurrencyAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
        fee: CurrencyAmount
      }
    | {
        amountOut: TokenAmount
        minAmountOut: TokenAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
        fee: CurrencyAmount
      } => {
    const tokenIn = amountIn instanceof TokenAmount ? amountIn.token : Token.WSOL
    const tokenOut = currencyOut instanceof Token ? currencyOut : Token.WSOL
    logger.assertArgument(
      this.includesToken(tokenIn, poolKeys) && this.includesToken(tokenOut, poolKeys),
      'token not match with pool',
      'poolKeys',
      { poolKeys, tokenIn, tokenOut },
    )

    const { baseReserve, quoteReserve } = poolInfo
    logger.debug('baseReserve:', baseReserve.toString())
    logger.debug('quoteReserve:', quoteReserve.toString())

    const currencyIn = amountIn instanceof TokenAmount ? amountIn.token : amountIn.currency
    logger.debug('currencyIn:', currencyIn)
    logger.debug('amountIn:', amountIn.toFixed())
    logger.debug('currencyOut:', currencyOut)
    logger.debug('slippage:', `${slippage.toSignificant()}%`)

    const reserves = [baseReserve, quoteReserve]

    // input is fixed
    const input = this._getAmountSide(amountIn, poolKeys)
    if (input === 'quote') {
      reserves.reverse()
    }
    logger.debug('input side:', input)

    const [reserveIn, reserveOut] = reserves

    let currentPrice
    if (poolKeys.version === 4) {
      currentPrice = new Price(currencyIn, reserveIn, currencyOut, reserveOut)
    } else {
      const p = getStablePrice(modelData, baseReserve.toNumber(), quoteReserve.toNumber(), false)
      if (input === 'quote') currentPrice = new Price(currencyIn, new BN(p * 1e6), currencyOut, new BN(1e6))
      else currentPrice = new Price(currencyIn, new BN(1e6), currencyOut, new BN(p * 1e6))
    }

    logger.debug('currentPrice:', `1 ${currencyIn.symbol} ≈ ${currentPrice.toFixed()} ${currencyOut.symbol}`)
    logger.debug(
      'currentPrice invert:',
      `1 ${currencyOut.symbol} ≈ ${currentPrice.invert().toFixed()} ${currencyIn.symbol}`,
    )

    const amountInRaw = amountIn.raw
    let amountOutRaw = ZERO
    let feeRaw = ZERO

    if (!amountInRaw.isZero()) {
      if (poolKeys.version === 4) {
        feeRaw = BNDivCeil(amountInRaw.mul(LIQUIDITY_FEES_NUMERATOR), LIQUIDITY_FEES_DENOMINATOR)
        const amountInWithFee = amountInRaw.sub(feeRaw)

        const denominator = reserveIn.add(amountInWithFee)
        amountOutRaw = reserveOut.mul(amountInWithFee).div(denominator)
      } else {
        feeRaw = amountInRaw.mul(new BN(2)).div(new BN(10000))
        const amountInWithFee = amountInRaw.sub(feeRaw)
        if (input === 'quote')
          amountOutRaw = new BN(
            getDyByDxBaseIn(modelData, quoteReserve.toNumber(), baseReserve.toNumber(), amountInWithFee.toNumber()),
          )
        else {
          amountOutRaw = new BN(
            getDxByDyBaseIn(modelData, quoteReserve.toNumber(), baseReserve.toNumber(), amountInWithFee.toNumber()),
          )
        }
      }
    }

    const _slippage = new Percent(ONE).add(slippage)
    const minAmountOutRaw = _slippage.invert().mul(amountOutRaw).quotient

    const amountOut =
      currencyOut instanceof Token
        ? new TokenAmount(currencyOut, amountOutRaw)
        : new CurrencyAmount(currencyOut, amountOutRaw)
    const minAmountOut =
      currencyOut instanceof Token
        ? new TokenAmount(currencyOut, minAmountOutRaw)
        : new CurrencyAmount(currencyOut, minAmountOutRaw)
    logger.debug('amountOut:', amountOut.toFixed())
    logger.debug('minAmountOut:', minAmountOut.toFixed())

    let executionPrice = new Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw)
    if (!amountInRaw.isZero() && !amountOutRaw.isZero()) {
      executionPrice = new Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw)
      logger.debug('executionPrice:', `1 ${currencyIn.symbol} ≈ ${executionPrice.toFixed()} ${currencyOut.symbol}`)
      logger.debug(
        'executionPrice invert:',
        `1 ${currencyOut.symbol} ≈ ${executionPrice.invert().toFixed()} ${currencyIn.symbol}`,
      )
    }

    const priceImpactDenominator = executionPrice.denominator.mul(currentPrice.numerator)
    const priceImpactNumerator = executionPrice.numerator
      .mul(currentPrice.denominator)
      .sub(priceImpactDenominator)
      .abs()
    const priceImpact = new Percent(priceImpactNumerator, priceImpactDenominator)

    logger.debug('priceImpact:', `${priceImpact.toSignificant()}%`)

    const fee =
      currencyIn instanceof Token ? new TokenAmount(currencyIn, feeRaw) : new CurrencyAmount(currencyIn, feeRaw)

    return {
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    }
  }

  /**
   * Compute input currency amount of swap
   *
   * @param params - {@link ComputeCurrencyAmountInParams}
   *
   * @returns
   * amountIn - currency amount without slippage
   * @returns
   * maxAmountIn - currency amount with slippage
   */
  static computeAmountIn({ poolKeys, poolInfo, amountOut, currencyIn, slippage }: LiquidityComputeAmountInParams):
    | {
        amountIn: CurrencyAmount
        maxAmountIn: CurrencyAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
      }
    | {
        amountIn: TokenAmount
        maxAmountIn: TokenAmount
        currentPrice: Price
        executionPrice: Price | null
        priceImpact: Percent
      } {
    const { baseReserve, quoteReserve } = poolInfo
    logger.debug('baseReserve:', baseReserve.toString())
    logger.debug('quoteReserve:', quoteReserve.toString())

    const currencyOut = amountOut instanceof TokenAmount ? amountOut.token : amountOut.currency
    logger.debug('currencyOut:', currencyOut)
    logger.debug('amountOut:', amountOut.toFixed())
    logger.debug('currencyIn:', currencyIn)
    logger.debug('slippage:', `${slippage.toSignificant()}%`)

    const reserves = [baseReserve, quoteReserve]

    // output is fixed
    const output = this._getAmountSide(amountOut, poolKeys)
    if (output === 'base') {
      reserves.reverse()
    }
    logger.debug('output side:', output)

    const [reserveIn, reserveOut] = reserves

    const currentPrice = new Price(currencyIn, reserveIn, currencyOut, reserveOut)
    logger.debug('currentPrice:', `1 ${currencyIn.symbol} ≈ ${currentPrice.toFixed()} ${currencyOut.symbol}`)
    logger.debug(
      'currentPrice invert:',
      `1 ${currencyOut.symbol} ≈ ${currentPrice.invert().toFixed()} ${currencyIn.symbol}`,
    )

    let amountInRaw = ZERO
    let amountOutRaw = amountOut.raw
    if (!amountOutRaw.isZero()) {
      // if out > reserve, out = reserve - 1
      if (amountOutRaw.gt(reserveOut)) {
        amountOutRaw = reserveOut.sub(ONE)
      }

      const denominator = reserveOut.sub(amountOutRaw)
      const amountInWithoutFee = reserveIn.mul(amountOutRaw).div(denominator)

      amountInRaw = amountInWithoutFee
        .mul(LIQUIDITY_FEES_DENOMINATOR)
        .div(LIQUIDITY_FEES_DENOMINATOR.sub(LIQUIDITY_FEES_NUMERATOR))
    }

    const _slippage = new Percent(ONE).add(slippage)
    const maxAmountInRaw = _slippage.mul(amountInRaw).quotient

    const amountIn =
      currencyIn instanceof Token
        ? new TokenAmount(currencyIn, amountInRaw)
        : new CurrencyAmount(currencyIn, amountInRaw)
    const maxAmountIn =
      currencyIn instanceof Token
        ? new TokenAmount(currencyIn, maxAmountInRaw)
        : new CurrencyAmount(currencyIn, maxAmountInRaw)
    logger.debug('amountIn:', amountIn.toFixed())
    logger.debug('maxAmountIn:', maxAmountIn.toFixed())

    let executionPrice: Price | null = null
    if (!amountInRaw.isZero() && !amountOutRaw.isZero()) {
      executionPrice = new Price(currencyIn, amountInRaw, currencyOut, amountOutRaw)
      logger.debug('executionPrice:', `1 ${currencyIn.symbol} ≈ ${executionPrice.toFixed()} ${currencyOut.symbol}`)
      logger.debug(
        'executionPrice invert:',
        `1 ${currencyOut.symbol} ≈ ${executionPrice.invert().toFixed()} ${currencyIn.symbol}`,
      )
    }

    const priceImpact = this._computePriceImpact(currentPrice, amountInRaw, amountOutRaw)
    logger.debug('priceImpact:', `${priceImpact.toSignificant()}%`)

    return {
      amountIn,
      maxAmountIn,
      currentPrice,
      executionPrice,
      priceImpact,
    }
  }
}
