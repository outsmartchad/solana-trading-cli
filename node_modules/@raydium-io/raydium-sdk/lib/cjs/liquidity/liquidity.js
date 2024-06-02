"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Liquidity = exports.LIQUIDITY_FEES_DENOMINATOR = exports.LIQUIDITY_FEES_NUMERATOR = exports.LiquidityPoolStatus = exports.initStableModelLayout = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const base_1 = require("../base");
const pda_1 = require("../base/pda");
const clmm_1 = require("../clmm");
const common_1 = require("../common");
const entity_1 = require("../entity");
const farm_1 = require("../farm");
const marshmallow_1 = require("../marshmallow");
const serum_1 = require("../serum");
const layout_1 = require("./layout");
const stable_1 = require("./stable");
const logger = common_1.Logger.from('Liquidity');
let modelData = {
    accountType: 0,
    status: 0,
    multiplier: 0,
    validDataCount: 0,
    DataElement: [],
};
function initStableModelLayout(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        if (modelData.validDataCount === 0) {
            if (connection) {
                const acc = yield connection.getAccountInfo(stable_1.ModelDataPubkey);
                if (acc)
                    modelData = (0, stable_1.formatLayout)(acc === null || acc === void 0 ? void 0 : acc.data);
            }
        }
    });
}
exports.initStableModelLayout = initStableModelLayout;
var LiquidityPoolStatus;
(function (LiquidityPoolStatus) {
    LiquidityPoolStatus[LiquidityPoolStatus["Uninitialized"] = 0] = "Uninitialized";
    LiquidityPoolStatus[LiquidityPoolStatus["Initialized"] = 1] = "Initialized";
    LiquidityPoolStatus[LiquidityPoolStatus["Disabled"] = 2] = "Disabled";
    LiquidityPoolStatus[LiquidityPoolStatus["RemoveLiquidityOnly"] = 3] = "RemoveLiquidityOnly";
    LiquidityPoolStatus[LiquidityPoolStatus["LiquidityOnly"] = 4] = "LiquidityOnly";
    LiquidityPoolStatus[LiquidityPoolStatus["OrderBook"] = 5] = "OrderBook";
    LiquidityPoolStatus[LiquidityPoolStatus["Swap"] = 6] = "Swap";
    LiquidityPoolStatus[LiquidityPoolStatus["WaitingForStart"] = 7] = "WaitingForStart";
})(LiquidityPoolStatus || (exports.LiquidityPoolStatus = LiquidityPoolStatus = {}));
exports.LIQUIDITY_FEES_NUMERATOR = new bn_js_1.default(25);
exports.LIQUIDITY_FEES_DENOMINATOR = new bn_js_1.default(10000);
class Liquidity extends base_1.Base {
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
    static getStateLayout(version) {
        const STATE_LAYOUT = layout_1.LIQUIDITY_VERSION_TO_STATE_LAYOUT[version];
        logger.assertArgument(!!STATE_LAYOUT, 'invalid version', 'version', version);
        return STATE_LAYOUT;
    }
    static getLayouts(version) {
        return { state: this.getStateLayout(version) };
    }
    /* ================= get key ================= */
    static getAssociatedId({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedAuthority({ programId }) {
        return (0, common_1.findProgramAddress)(
        // new Uint8Array(Buffer.from('amm authority'.replace('\u00A0', ' '), 'utf-8'))
        [Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])], programId);
    }
    static getAssociatedBaseVault({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedQuoteVault({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedLpMint({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedLpVault({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('temp_lp_token_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedTargetOrders({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedWithdrawQueue({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('withdraw_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedOpenOrders({ programId, marketId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([programId.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedConfigId({ programId }) {
        const { publicKey } = (0, common_1.findProgramAddress)([Buffer.from('amm_config_account_seed', 'utf-8')], programId);
        return publicKey;
    }
    static getAssociatedPoolKeys({ version, marketVersion, marketId, baseMint, quoteMint, baseDecimals, quoteDecimals, programId, marketProgramId, }) {
        const id = this.getAssociatedId({ programId, marketId });
        const lpMint = this.getAssociatedLpMint({ programId, marketId });
        const { publicKey: authority, nonce } = this.getAssociatedAuthority({ programId });
        const baseVault = this.getAssociatedBaseVault({ programId, marketId });
        const quoteVault = this.getAssociatedQuoteVault({ programId, marketId });
        const lpVault = this.getAssociatedLpVault({ programId, marketId });
        const openOrders = this.getAssociatedOpenOrders({ programId, marketId });
        const targetOrders = this.getAssociatedTargetOrders({ programId, marketId });
        const withdrawQueue = this.getAssociatedWithdrawQueue({ programId, marketId });
        const { publicKey: marketAuthority } = serum_1.Market.getAssociatedAuthority({
            programId: marketProgramId,
            marketId,
        });
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
            lookupTableAccount: web3_js_1.PublicKey.default,
            configId: this.getAssociatedConfigId({ programId }),
        };
    }
    static getCreatePoolFee({ connection, programId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const configId = this.getAssociatedConfigId({ programId });
            const layout = (0, marshmallow_1.struct)([(0, marshmallow_1.u64)('fee')]);
            const account = yield connection.getAccountInfo(configId, { dataSlice: { offset: 536, length: 8 } });
            if (account === null)
                throw Error('get config account error');
            return layout.decode(account.data).fee;
        });
    }
    /* ================= make instruction and transaction ================= */
    static makeAddLiquidityInstruction(params) {
        const { poolKeys, userKeys, baseAmountIn, quoteAmountIn, fixedSide } = params;
        const { version } = poolKeys;
        if (version === 4 || version === 5) {
            const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('baseAmountIn'), (0, marshmallow_1.u64)('quoteAmountIn'), (0, marshmallow_1.u64)('fixedSide')]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 3,
                baseAmountIn: (0, entity_1.parseBigNumberish)(baseAmountIn),
                quoteAmountIn: (0, entity_1.parseBigNumberish)(quoteAmountIn),
                fixedSide: (0, entity_1.parseBigNumberish)(fixedSide === 'base' ? 0 : 1),
            }, data);
            const keys = [
                // system
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                // amm
                (0, common_1.AccountMeta)(poolKeys.id, false),
                (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
                (0, common_1.AccountMetaReadonly)(poolKeys.openOrders, false),
                (0, common_1.AccountMeta)(poolKeys.targetOrders, false),
                (0, common_1.AccountMeta)(poolKeys.lpMint, false),
                (0, common_1.AccountMeta)(poolKeys.baseVault, false),
                (0, common_1.AccountMeta)(poolKeys.quoteVault, false),
            ];
            if (version === 5) {
                keys.push((0, common_1.AccountMeta)(stable_1.ModelDataPubkey, false));
            }
            keys.push(
            // serum
            (0, common_1.AccountMetaReadonly)(poolKeys.marketId, false), 
            // user
            (0, common_1.AccountMeta)(userKeys.baseTokenAccount, false), (0, common_1.AccountMeta)(userKeys.quoteTokenAccount, false), (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false), (0, common_1.AccountMetaReadonly)(userKeys.owner, true), (0, common_1.AccountMetaReadonly)(poolKeys.marketEventQueue, false));
            return {
                address: {},
                innerTransaction: {
                    instructions: [
                        new web3_js_1.TransactionInstruction({
                            programId: poolKeys.programId,
                            keys,
                            data,
                        }),
                    ],
                    signers: [],
                    lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                    instructionTypes: [version === 4 ? base_1.InstructionType.ammV4AddLiquidity : base_1.InstructionType.ammV5AddLiquidity],
                },
            };
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeAddLiquidityInstructionSimple(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connection, poolKeys, userKeys, amountInA, amountInB, fixedSide, config, makeTxVersion, lookupTableCache, computeBudgetConfig, } = params;
            const { lpMint } = poolKeys;
            const { tokenAccounts, owner, payer = owner } = userKeys;
            logger.debug('amountInA:', amountInA);
            logger.debug('amountInB:', amountInB);
            logger.assertArgument(!amountInA.isZero() && !amountInB.isZero(), 'amounts must greater than zero', 'amountInA & amountInB', {
                amountInA: amountInA.toFixed(),
                amountInB: amountInB.toFixed(),
            });
            const { bypassAssociatedCheck, checkCreateATAOwner } = Object.assign({ bypassAssociatedCheck: false, checkCreateATAOwner: false }, config);
            // handle currency a & b (convert SOL to WSOL)
            const tokenA = amountInA instanceof entity_1.TokenAmount ? amountInA.token : entity_1.Token.WSOL;
            const tokenB = amountInB instanceof entity_1.TokenAmount ? amountInB.token : entity_1.Token.WSOL;
            const tokenAccountA = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: tokenA.mint,
                owner,
                config: { associatedOnly: false },
            });
            const tokenAccountB = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: tokenB.mint,
                owner,
                config: { associatedOnly: false },
            });
            logger.assertArgument(!!tokenAccountA || !!tokenAccountB, 'cannot found target token accounts', 'tokenAccounts', tokenAccounts);
            const lpTokenAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: lpMint,
                owner,
            });
            const tokens = [tokenA, tokenB];
            const _tokenAccounts = [tokenAccountA, tokenAccountB];
            const rawAmounts = [amountInA.raw, amountInB.raw];
            // handle amount a & b and direction
            const [sideA] = this._getAmountsSide(amountInA, amountInB, poolKeys);
            let _fixedSide = 'base';
            if (sideA === 'quote') {
                // reverse
                tokens.reverse();
                _tokenAccounts.reverse();
                rawAmounts.reverse();
                if (fixedSide === 'a')
                    _fixedSide = 'quote';
                else if (fixedSide === 'b')
                    _fixedSide = 'base';
                else
                    return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide);
            }
            else if (sideA === 'base') {
                if (fixedSide === 'a')
                    _fixedSide = 'base';
                else if (fixedSide === 'b')
                    _fixedSide = 'quote';
                else
                    return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide);
            }
            else
                return logger.throwArgumentError('invalid fixedSide', 'fixedSide', fixedSide);
            const [baseToken, quoteToken] = tokens;
            const [baseTokenAccount, quoteTokenAccount] = _tokenAccounts;
            const [baseAmountRaw, quoteAmountRaw] = rawAmounts;
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const _baseTokenAccount = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            const _quoteTokenAccount = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            const _lpTokenAccount = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
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
            });
            return {
                address: {
                    lpTokenAccount: _lpTokenAccount,
                },
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeRemoveLiquidityInstruction(params) {
        const { poolKeys, userKeys, amountIn } = params;
        const { version } = poolKeys;
        if (version === 4 || version === 5) {
            const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amountIn')]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 4,
                amountIn: (0, entity_1.parseBigNumberish)(amountIn),
            }, data);
            const keys = [
                // system
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                // amm
                (0, common_1.AccountMeta)(poolKeys.id, false),
                (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
                (0, common_1.AccountMeta)(poolKeys.openOrders, false),
                (0, common_1.AccountMeta)(poolKeys.targetOrders, false),
                (0, common_1.AccountMeta)(poolKeys.lpMint, false),
                (0, common_1.AccountMeta)(poolKeys.baseVault, false),
                (0, common_1.AccountMeta)(poolKeys.quoteVault, false),
            ];
            if (version === 5) {
                keys.push((0, common_1.AccountMeta)(stable_1.ModelDataPubkey, false));
            }
            else {
                keys.push((0, common_1.AccountMeta)(poolKeys.withdrawQueue, false));
                keys.push((0, common_1.AccountMeta)(poolKeys.lpVault, false));
            }
            keys.push(
            // serum
            (0, common_1.AccountMetaReadonly)(poolKeys.marketProgramId, false), (0, common_1.AccountMeta)(poolKeys.marketId, false), (0, common_1.AccountMeta)(poolKeys.marketBaseVault, false), (0, common_1.AccountMeta)(poolKeys.marketQuoteVault, false), (0, common_1.AccountMetaReadonly)(poolKeys.marketAuthority, false), 
            // user
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false), (0, common_1.AccountMeta)(userKeys.baseTokenAccount, false), (0, common_1.AccountMeta)(userKeys.quoteTokenAccount, false), (0, common_1.AccountMetaReadonly)(userKeys.owner, true), 
            // serum orderbook
            (0, common_1.AccountMeta)(poolKeys.marketEventQueue, false), (0, common_1.AccountMeta)(poolKeys.marketBids, false), (0, common_1.AccountMeta)(poolKeys.marketAsks, false));
            return {
                address: {},
                innerTransaction: {
                    instructions: [
                        new web3_js_1.TransactionInstruction({
                            programId: poolKeys.programId,
                            keys,
                            data,
                        }),
                    ],
                    signers: [],
                    lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                    instructionTypes: [
                        version === 4 ? base_1.InstructionType.ammV4RemoveLiquidity : base_1.InstructionType.ammV5RemoveLiquidity,
                    ],
                },
            };
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeRemoveLiquidityInstructionSimple(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connection, poolKeys, userKeys, amountIn, config, makeTxVersion, lookupTableCache, computeBudgetConfig } = params;
            const { baseMint, quoteMint, lpMint } = poolKeys;
            const { tokenAccounts, owner, payer = owner } = userKeys;
            logger.debug('amountIn:', amountIn);
            logger.assertArgument(!amountIn.isZero(), 'amount must greater than zero', 'amountIn', amountIn.toFixed());
            logger.assertArgument(amountIn instanceof entity_1.TokenAmount && amountIn.token.mint.equals(lpMint), "amountIn's token not match lpMint", 'amountIn', amountIn);
            const lpTokenAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: lpMint,
                owner,
                config: { associatedOnly: false },
            });
            if (!lpTokenAccount)
                return logger.throwArgumentError('cannot found lpTokenAccount', 'tokenAccounts', tokenAccounts);
            const baseTokenAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: baseMint,
                owner,
            });
            const quoteTokenAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: quoteMint,
                owner,
            });
            const { bypassAssociatedCheck, checkCreateATAOwner } = Object.assign({ bypassAssociatedCheck: false, checkCreateATAOwner: false }, config);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const _lpTokenAccount = lpTokenAccount;
            const _baseTokenAccount = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            const _quoteTokenAccount = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
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
            });
            return {
                address: {
                    lpTokenAccount: _lpTokenAccount,
                },
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeSwapInstruction(params) {
        const { poolKeys, userKeys, amountIn, amountOut, fixedSide } = params;
        const { version } = poolKeys;
        if (version === 4 || version === 5) {
            if (fixedSide === 'in') {
                return this.makeSwapFixedInInstruction({
                    poolKeys,
                    userKeys,
                    amountIn,
                    minAmountOut: amountOut,
                }, version);
            }
            else if (fixedSide === 'out') {
                return this.makeSwapFixedOutInstruction({
                    poolKeys,
                    userKeys,
                    maxAmountIn: amountIn,
                    amountOut,
                }, version);
            }
            return logger.throwArgumentError('invalid params', 'params', params);
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeSwapFixedInInstruction({ poolKeys, userKeys, amountIn, minAmountOut }, version) {
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amountIn'), (0, marshmallow_1.u64)('minAmountOut')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 9,
            amountIn: (0, entity_1.parseBigNumberish)(amountIn),
            minAmountOut: (0, entity_1.parseBigNumberish)(minAmountOut),
        }, data);
        const keys = [
            // system
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
            // amm
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(poolKeys.openOrders, false),
        ];
        if (version === 4) {
            keys.push((0, common_1.AccountMeta)(poolKeys.targetOrders, false));
        }
        keys.push((0, common_1.AccountMeta)(poolKeys.baseVault, false), (0, common_1.AccountMeta)(poolKeys.quoteVault, false));
        if (version === 5) {
            keys.push((0, common_1.AccountMeta)(stable_1.ModelDataPubkey, false));
        }
        keys.push(
        // serum
        (0, common_1.AccountMetaReadonly)(poolKeys.marketProgramId, false), (0, common_1.AccountMeta)(poolKeys.marketId, false), (0, common_1.AccountMeta)(poolKeys.marketBids, false), (0, common_1.AccountMeta)(poolKeys.marketAsks, false), (0, common_1.AccountMeta)(poolKeys.marketEventQueue, false), (0, common_1.AccountMeta)(poolKeys.marketBaseVault, false), (0, common_1.AccountMeta)(poolKeys.marketQuoteVault, false), (0, common_1.AccountMetaReadonly)(poolKeys.marketAuthority, false), 
        // user
        (0, common_1.AccountMeta)(userKeys.tokenAccountIn, false), (0, common_1.AccountMeta)(userKeys.tokenAccountOut, false), (0, common_1.AccountMetaReadonly)(userKeys.owner, true));
        return {
            address: {},
            innerTransaction: {
                instructions: [
                    new web3_js_1.TransactionInstruction({
                        programId: poolKeys.programId,
                        keys,
                        data,
                    }),
                ],
                signers: [],
                lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                instructionTypes: [version === 4 ? base_1.InstructionType.ammV4SwapBaseIn : base_1.InstructionType.ammV5SwapBaseIn],
            },
        };
    }
    static makeSwapFixedOutInstruction({ poolKeys, userKeys, maxAmountIn, amountOut }, version) {
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('maxAmountIn'), (0, marshmallow_1.u64)('amountOut')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 11,
            maxAmountIn: (0, entity_1.parseBigNumberish)(maxAmountIn),
            amountOut: (0, entity_1.parseBigNumberish)(amountOut),
        }, data);
        const keys = [
            // system
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
            // amm
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(poolKeys.openOrders, false),
            (0, common_1.AccountMeta)(poolKeys.targetOrders, false),
            (0, common_1.AccountMeta)(poolKeys.baseVault, false),
            (0, common_1.AccountMeta)(poolKeys.quoteVault, false),
        ];
        if (version === 5) {
            keys.push((0, common_1.AccountMeta)(stable_1.ModelDataPubkey, false));
        }
        keys.push(
        // serum
        (0, common_1.AccountMetaReadonly)(poolKeys.marketProgramId, false), (0, common_1.AccountMeta)(poolKeys.marketId, false), (0, common_1.AccountMeta)(poolKeys.marketBids, false), (0, common_1.AccountMeta)(poolKeys.marketAsks, false), (0, common_1.AccountMeta)(poolKeys.marketEventQueue, false), (0, common_1.AccountMeta)(poolKeys.marketBaseVault, false), (0, common_1.AccountMeta)(poolKeys.marketQuoteVault, false), (0, common_1.AccountMetaReadonly)(poolKeys.marketAuthority, false), 
        // user
        (0, common_1.AccountMeta)(userKeys.tokenAccountIn, false), (0, common_1.AccountMeta)(userKeys.tokenAccountOut, false), (0, common_1.AccountMetaReadonly)(userKeys.owner, true));
        return {
            address: {},
            innerTransaction: {
                instructions: [
                    new web3_js_1.TransactionInstruction({
                        programId: poolKeys.programId,
                        keys,
                        data,
                    }),
                ],
                signers: [],
                lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                instructionTypes: [version === 4 ? base_1.InstructionType.ammV4SwapBaseOut : base_1.InstructionType.ammV5SwapBaseOut],
            },
        };
    }
    static makeSwapInstructionSimple(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connection, poolKeys, userKeys, amountIn, amountOut, fixedSide, config, makeTxVersion, lookupTableCache, computeBudgetConfig, } = params;
            const { tokenAccounts, owner, payer = owner } = userKeys;
            logger.debug('amountIn:', amountIn);
            logger.debug('amountOut:', amountOut);
            logger.assertArgument(!amountIn.isZero() && !amountOut.isZero(), 'amounts must greater than zero', 'currencyAmounts', {
                amountIn: amountIn.toFixed(),
                amountOut: amountOut.toFixed(),
            });
            const { bypassAssociatedCheck, checkCreateATAOwner } = Object.assign({ bypassAssociatedCheck: false, checkCreateATAOwner: false }, config);
            // handle currency in & out (convert SOL to WSOL)
            const tokenIn = amountIn instanceof entity_1.TokenAmount ? amountIn.token : entity_1.Token.WSOL;
            const tokenOut = amountOut instanceof entity_1.TokenAmount ? amountOut.token : entity_1.Token.WSOL;
            const tokenAccountIn = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: tokenIn.mint,
                owner,
                config: { associatedOnly: false },
            });
            const tokenAccountOut = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts,
                mint: tokenOut.mint,
                owner,
            });
            const [amountInRaw, amountOutRaw] = [amountIn.raw, amountOut.raw];
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const _tokenAccountIn = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            const _tokenAccountOut = yield this._handleTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
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
            });
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeSimulatePoolInfoInstruction({ poolKeys }) {
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u8)('simulateType')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 12,
            simulateType: 0,
        }, data);
        const keys = [
            // amm
            (0, common_1.AccountMetaReadonly)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.openOrders, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.baseVault, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.quoteVault, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.lpMint, false),
            // serum
            (0, common_1.AccountMetaReadonly)(poolKeys.marketId, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.marketEventQueue, false),
        ];
        return {
            address: {},
            innerTransaction: {
                instructions: [
                    new web3_js_1.TransactionInstruction({
                        programId: poolKeys.programId,
                        keys,
                        data,
                    }),
                ],
                signers: [],
                lookupTableAddress: [poolKeys.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                instructionTypes: [
                    poolKeys.version === 4 ? base_1.InstructionType.ammV4SimulatePoolInfo : base_1.InstructionType.ammV5SimulatePoolInfo,
                ],
            },
        };
    }
    static isV4(lsl) {
        return lsl.withdrawQueue !== undefined;
    }
    static makeCreatePoolV4InstructionV2Simple({ connection, programId, marketInfo, baseMintInfo, quoteMintInfo, baseAmount, quoteAmount, startTime, ownerInfo, associatedOnly = false, computeBudgetConfig, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, feeDestinationId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && baseMintInfo.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && quoteMintInfo.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountBase = yield this._selectOrCreateTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            const ownerTokenAccountQuote = yield this._selectOrCreateTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            });
            if (ownerTokenAccountBase === undefined || ownerTokenAccountQuote === undefined)
                throw Error("you don't has some token account");
            const poolInfo = _a.getAssociatedPoolKeys({
                version: 4,
                marketVersion: 3,
                marketId: marketInfo.marketId,
                baseMint: baseMintInfo.mint,
                quoteMint: quoteMintInfo.mint,
                baseDecimals: baseMintInfo.decimals,
                quoteDecimals: quoteMintInfo.decimals,
                programId,
                marketProgramId: marketInfo.programId,
            });
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
                userLpVault: (0, pda_1.getATAAddress)(ownerInfo.wallet, poolInfo.lpMint, common_1.TOKEN_PROGRAM_ID).publicKey,
                ammConfigId: poolInfo.configId,
                feeDestinationId,
                nonce: poolInfo.nonce,
                openTime: startTime,
                coinAmount: baseAmount,
                pcAmount: quoteAmount,
            }).innerTransaction;
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
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeCreatePoolV4InstructionV2({ programId, ammId, ammAuthority, ammOpenOrders, lpMint, coinMint, pcMint, coinVault, pcVault, ammTargetOrders, marketProgramId, marketId, userWallet, userCoinVault, userPcVault, userLpVault, nonce, openTime, coinAmount, pcAmount, lookupTableAddress, ammConfigId, feeDestinationId, }) {
        const dataLayout = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u8)('nonce'), (0, marshmallow_1.u64)('openTime'), (0, marshmallow_1.u64)('pcAmount'), (0, marshmallow_1.u64)('coinAmount')]);
        const keys = [
            { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: common_1.ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: common_1.SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: common_1.RENT_PROGRAM_ID, isSigner: false, isWritable: false },
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
        ];
        const data = Buffer.alloc(dataLayout.span);
        dataLayout.encode({ instruction: 1, nonce, openTime, coinAmount, pcAmount }, data);
        const ins = new web3_js_1.TransactionInstruction({
            keys,
            programId,
            data,
        });
        return {
            address: {},
            innerTransaction: {
                instructions: [ins],
                signers: [],
                lookupTableAddress: lookupTableAddress ? [lookupTableAddress] : undefined,
                instructionTypes: [base_1.InstructionType.ammV4CreatePoolV2],
            },
        };
    }
    static makeRemoveAllLpAndCreateClmmPosition({ connection, poolKeys, removeLpAmount, userKeys, clmmPoolKeys, createPositionInfo, farmInfo, computeBudgetConfig, checkCreateATAOwner = false, getEphemeralSigners, makeTxVersion, lookupTableCache, }) {
        var _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            if (!(poolKeys.baseMint.equals(clmmPoolKeys.mintA.mint) || poolKeys.baseMint.equals(clmmPoolKeys.mintB.mint)))
                throw Error('mint check error');
            if (!(poolKeys.quoteMint.equals(clmmPoolKeys.mintA.mint) || poolKeys.quoteMint.equals(clmmPoolKeys.mintB.mint)))
                throw Error('mint check error');
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintToAccount = {};
            for (const item of userKeys.tokenAccounts) {
                if (mintToAccount[item.accountInfo.mint.toString()] === undefined ||
                    (0, pda_1.getATAAddress)(userKeys.owner, item.accountInfo.mint, common_1.TOKEN_PROGRAM_ID).publicKey.equals(item.pubkey)) {
                    mintToAccount[item.accountInfo.mint.toString()] = item.pubkey;
                }
            }
            const lpTokenAccount = mintToAccount[poolKeys.lpMint.toString()];
            if (lpTokenAccount === undefined)
                throw Error('find lp account error in trade accounts');
            const amountIn = removeLpAmount.add((_b = farmInfo === null || farmInfo === void 0 ? void 0 : farmInfo.amount) !== null && _b !== void 0 ? _b : new bn_js_1.default(0));
            const mintBaseUseSOLBalance = poolKeys.baseMint.equals(entity_1.Token.WSOL.mint);
            const mintQuoteUseSOLBalance = poolKeys.quoteMint.equals(entity_1.Token.WSOL.mint);
            const baseTokenAccount = yield this._selectOrCreateTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                mint: poolKeys.baseMint,
                tokenAccounts: userKeys.tokenAccounts,
                owner: userKeys.owner,
                createInfo: {
                    connection,
                    payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                    frontInstructions,
                    frontInstructionsType,
                    endInstructions: mintBaseUseSOLBalance ? endInstructions : [],
                    endInstructionsType: mintBaseUseSOLBalance ? endInstructionsType : [],
                    signers,
                },
                associatedOnly: true,
                checkCreateATAOwner,
            });
            const quoteTokenAccount = yield this._selectOrCreateTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                mint: poolKeys.quoteMint,
                tokenAccounts: userKeys.tokenAccounts,
                owner: userKeys.owner,
                createInfo: {
                    connection,
                    payer: (_d = userKeys.payer) !== null && _d !== void 0 ? _d : userKeys.owner,
                    amount: 0,
                    frontInstructions,
                    frontInstructionsType,
                    endInstructions: mintQuoteUseSOLBalance ? endInstructions : [],
                    endInstructionsType: mintQuoteUseSOLBalance ? endInstructionsType : [],
                    signers,
                },
                associatedOnly: true,
                checkCreateATAOwner,
            });
            mintToAccount[poolKeys.baseMint.toString()] = baseTokenAccount;
            mintToAccount[poolKeys.quoteMint.toString()] = quoteTokenAccount;
            const removeIns = this.makeRemoveLiquidityInstruction({
                poolKeys,
                userKeys: {
                    lpTokenAccount,
                    baseTokenAccount,
                    quoteTokenAccount,
                    owner: userKeys.owner,
                },
                amountIn,
            });
            const [tokenAccountA, tokenAccountB] = poolKeys.baseMint.equals(clmmPoolKeys.mintA.mint)
                ? [baseTokenAccount, quoteTokenAccount]
                : [quoteTokenAccount, baseTokenAccount];
            const createPositionIns = yield clmm_1.Clmm.makeOpenPositionFromLiquidityInstructions(Object.assign(Object.assign({ poolInfo: clmmPoolKeys, ownerInfo: {
                    feePayer: (_e = userKeys.payer) !== null && _e !== void 0 ? _e : userKeys.owner,
                    wallet: userKeys.owner,
                    tokenAccountA,
                    tokenAccountB,
                }, withMetadata: 'create' }, createPositionInfo), { getEphemeralSigners }));
            let withdrawFarmIns = {
                instructions: [],
                signers: [],
                instructionTypes: [],
            };
            if (farmInfo !== undefined) {
                const rewardTokenAccounts = [];
                for (const item of farmInfo.poolKeys.rewardInfos) {
                    const rewardIsWsol = item.rewardMint.equals(entity_1.Token.WSOL.mint);
                    rewardTokenAccounts.push((_f = mintToAccount[item.rewardMint.toString()]) !== null && _f !== void 0 ? _f : (yield this._selectOrCreateTokenAccount({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        mint: item.rewardMint,
                        tokenAccounts: userKeys.tokenAccounts,
                        owner: userKeys.owner,
                        createInfo: {
                            connection,
                            payer: (_g = userKeys.payer) !== null && _g !== void 0 ? _g : userKeys.owner,
                            frontInstructions,
                            frontInstructionsType,
                            endInstructions: rewardIsWsol ? endInstructions : [],
                            endInstructionsType: rewardIsWsol ? endInstructionsType : [],
                            signers,
                        },
                        associatedOnly: true,
                        checkCreateATAOwner,
                    })));
                }
                withdrawFarmIns = farm_1.Farm.makeWithdrawInstruction({
                    poolKeys: farmInfo.poolKeys,
                    amount: farmInfo.amount,
                    userKeys: {
                        ledger: farm_1.Farm.getAssociatedLedgerAccount({
                            programId: farmInfo.poolKeys.programId,
                            poolId: farmInfo.poolKeys.id,
                            owner: userKeys.owner,
                            version: farmInfo.poolKeys.version,
                        }),
                        lpTokenAccount,
                        rewardTokenAccounts,
                        owner: userKeys.owner,
                    },
                }).innerTransaction;
            }
            return {
                address: Object.assign(Object.assign({}, removeIns.address), createPositionIns.address),
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: (_h = userKeys.payer) !== null && _h !== void 0 ? _h : userKeys.owner,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        withdrawFarmIns,
                        removeIns.innerTransaction,
                        createPositionIns.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    /* ================= fetch data ================= */
    /**
     * Fetch all pools keys from on-chain data
     */
    static fetchAllPoolKeys(connection, programId, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const allPools = (yield Promise.all(Object.entries(layout_1.LIQUIDITY_VERSION_TO_STATE_LAYOUT).map(([version, layout]) => {
                try {
                    return connection
                        .getProgramAccounts(programId[Number(version)], {
                        filters: [{ dataSize: layout.span }],
                    })
                        .then((accounts) => {
                        return accounts.map((info) => {
                            return Object.assign({ id: info.pubkey, version: Number(version), programId: programId[Number(version)] }, layout.decode(info.account.data));
                        });
                    });
                }
                catch (error) {
                    if (error instanceof Error) {
                        return logger.throwError('failed to fetch pool info', common_1.Logger.errors.RPC_ERROR, {
                            message: error.message,
                        });
                    }
                }
            }))).flat();
            const allMarketIds = allPools.map((i) => i.marketId);
            const marketsInfo = {};
            try {
                const _marketsInfo = yield (0, common_1.getMultipleAccountsInfo)(connection, allMarketIds, config);
                for (const item of _marketsInfo) {
                    if (item === null)
                        continue;
                    const _i = Object.assign({ programId: item.owner }, serum_1.MARKET_STATE_LAYOUT_V3.decode(item.data));
                    marketsInfo[_i.ownAddress.toString()] = _i;
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    return logger.throwError('failed to fetch markets', common_1.Logger.errors.RPC_ERROR, {
                        message: error.message,
                    });
                }
            }
            const authority = {};
            for (const [version, _programId] of Object.entries(programId))
                authority[version] = this.getAssociatedAuthority({ programId: _programId }).publicKey;
            const formatPoolInfos = [];
            for (const pool of allPools) {
                if (pool === undefined)
                    continue;
                if (pool.baseMint.equals(web3_js_1.PublicKey.default))
                    continue;
                const market = marketsInfo[pool.marketId.toString()];
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const marketProgramId = market.programId;
                formatPoolInfos.push(Object.assign(Object.assign({ id: pool.id, baseMint: pool.baseMint, quoteMint: pool.quoteMint, lpMint: pool.lpMint, baseDecimals: pool.baseDecimal.toNumber(), quoteDecimals: pool.quoteDecimal.toNumber(), lpDecimals: pool.id.toString() === '6kmMMacvoCKBkBrqssLEdFuEZu2wqtLdNQxh9VjtzfwT' ? 5 : pool.baseDecimal.toNumber(), version: pool.version, programId: pool.programId, authority: authority[pool.version], openOrders: pool.openOrders, targetOrders: pool.targetOrders, baseVault: pool.baseVault, quoteVault: pool.quoteVault, marketVersion: 3, marketProgramId, marketId: market.ownAddress, marketAuthority: serum_1.Market.getAssociatedAuthority({
                        programId: marketProgramId,
                        marketId: market.ownAddress,
                    }).publicKey, marketBaseVault: market.baseVault, marketQuoteVault: market.quoteVault, marketBids: market.bids, marketAsks: market.asks, marketEventQueue: market.eventQueue }, (pool.version === 5
                    ? {
                        modelDataAccount: pool.modelDataAccount,
                        withdrawQueue: web3_js_1.PublicKey.default,
                        lpVault: web3_js_1.PublicKey.default,
                    }
                    : {
                        withdrawQueue: pool.withdrawQueue,
                        lpVault: pool.lpVault,
                    })), { lookupTableAccount: web3_js_1.PublicKey.default }));
            }
            return formatPoolInfos;
        });
    }
    /**
     * Fetch liquidity pool's info
     */
    static fetchInfo({ connection, poolKeys }) {
        return __awaiter(this, void 0, void 0, function* () {
            const info = yield this.fetchMultipleInfo({ connection, pools: [poolKeys] });
            logger.assertArgument(info.length === 1, `fetchInfo failed, ${info.length} pools found`, 'poolKeys.id', poolKeys.id);
            return info[0];
        });
    }
    /**
     * Fetch multiple info of liquidity pools
     */
    static fetchMultipleInfo({ connection, pools, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config, }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield initStableModelLayout(connection);
            const instructions = pools.map((pool) => this.makeSimulatePoolInfoInstruction({ poolKeys: pool }));
            const logs = yield (0, common_1.simulateMultipleInstruction)(connection, instructions.map((i) => i.innerTransaction.instructions).flat(), 'GetPoolData');
            const poolsInfo = logs.map((log) => {
                const json = (0, common_1.parseSimulateLogToJson)(log, 'GetPoolData');
                const status = new bn_js_1.default((0, common_1.parseSimulateValue)(json, 'status'));
                const baseDecimals = Number((0, common_1.parseSimulateValue)(json, 'coin_decimals'));
                const quoteDecimals = Number((0, common_1.parseSimulateValue)(json, 'pc_decimals'));
                const lpDecimals = Number((0, common_1.parseSimulateValue)(json, 'lp_decimals'));
                const baseReserve = new bn_js_1.default((0, common_1.parseSimulateValue)(json, 'pool_coin_amount'));
                const quoteReserve = new bn_js_1.default((0, common_1.parseSimulateValue)(json, 'pool_pc_amount'));
                const lpSupply = new bn_js_1.default((0, common_1.parseSimulateValue)(json, 'pool_lp_supply'));
                // TODO fix it when split stable
                let startTime = '0';
                try {
                    startTime = (0, common_1.parseSimulateValue)(json, 'pool_open_time');
                }
                catch (error) {
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
                    startTime: new bn_js_1.default(startTime),
                };
            });
            return poolsInfo;
        });
    }
    /* ================= compute data ================= */
    static getEnabledFeatures(poolInfo) {
        const { status } = poolInfo;
        const _status = status.toNumber();
        if (_status === LiquidityPoolStatus.Uninitialized)
            return {
                swap: false,
                addLiquidity: false,
                removeLiquidity: false,
            };
        else if (_status === LiquidityPoolStatus.Initialized)
            return {
                swap: true,
                addLiquidity: true,
                removeLiquidity: true,
            };
        else if (_status === LiquidityPoolStatus.Disabled)
            return {
                swap: false,
                addLiquidity: false,
                removeLiquidity: false,
            };
        else if (_status === LiquidityPoolStatus.RemoveLiquidityOnly)
            return {
                swap: false,
                addLiquidity: false,
                removeLiquidity: true,
            };
        else if (_status === LiquidityPoolStatus.LiquidityOnly)
            return {
                swap: false,
                addLiquidity: true,
                removeLiquidity: true,
            };
        else if (_status === LiquidityPoolStatus.OrderBook)
            return {
                swap: false,
                addLiquidity: true,
                removeLiquidity: true,
            };
        else if (_status === LiquidityPoolStatus.Swap)
            return {
                swap: true,
                addLiquidity: true,
                removeLiquidity: true,
            };
        else if (_status === LiquidityPoolStatus.WaitingForStart) {
            // handle start time
            const { startTime } = poolInfo;
            if (Date.now() / 1000 < startTime.toNumber())
                return {
                    swap: false,
                    addLiquidity: true,
                    removeLiquidity: true,
                };
            return {
                swap: true,
                addLiquidity: true,
                removeLiquidity: true,
            };
        }
        else
            return {
                swap: false,
                addLiquidity: false,
                removeLiquidity: false,
            };
    }
    static includesToken(token, poolKeys) {
        const { baseMint, quoteMint } = poolKeys;
        return token.mint.equals(baseMint) || token.mint.equals(quoteMint);
    }
    /**
     * Get token side of liquidity pool
     * @param token - the token provided
     * @param poolKeys - the pool keys
     * @returns token side is `base` or `quote`
     */
    static _getTokenSide(token, poolKeys) {
        const { baseMint, quoteMint } = poolKeys;
        if (token.mint.equals(baseMint))
            return 'base';
        else if (token.mint.equals(quoteMint))
            return 'quote';
        else
            return logger.throwArgumentError('token not match with pool', 'params', {
                token: token.mint,
                baseMint,
                quoteMint,
            });
    }
    /**
     * Get tokens side of liquidity pool
     * @param tokenA - the token provided
     * @param tokenB - the token provided
     * @param poolKeys - the pool keys
     * @returns tokens side array
     */
    static _getTokensSide(tokenA, tokenB, poolKeys) {
        const { baseMint, quoteMint } = poolKeys;
        const sideA = this._getTokenSide(tokenA, poolKeys);
        const sideB = this._getTokenSide(tokenB, poolKeys);
        logger.assertArgument(sideA !== sideB, 'tokens not match with pool', 'params', {
            tokenA: tokenA.mint,
            tokenB: tokenB.mint,
            baseMint,
            quoteMint,
        });
        return [sideA, sideB];
    }
    /**
     * Get currency amount side of liquidity pool
     * @param amount - the currency amount provided
     * @param poolKeys - the pool keys
     * @returns currency amount side is `base` or `quote`
     */
    static _getAmountSide(amount, poolKeys) {
        const token = amount instanceof entity_1.TokenAmount ? amount.token : entity_1.Token.WSOL;
        return this._getTokenSide(token, poolKeys);
    }
    /**
     * Get currencies amount side of liquidity pool
     * @param amountA - the currency amount provided
     * @param amountB - the currency amount provided
     * @param poolKeys - the pool keys
     * @returns currencies amount side array
     */
    static _getAmountsSide(amountA, amountB, poolKeys) {
        const tokenA = amountA instanceof entity_1.TokenAmount ? amountA.token : entity_1.Token.WSOL;
        const tokenB = amountB instanceof entity_1.TokenAmount ? amountB.token : entity_1.Token.WSOL;
        return this._getTokensSide(tokenA, tokenB, poolKeys);
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
    static computeAnotherAmount({ poolKeys, poolInfo, amount, anotherCurrency, slippage, }) {
        const { baseReserve, quoteReserve } = poolInfo;
        logger.debug('baseReserve:', baseReserve.toString());
        logger.debug('quoteReserve:', quoteReserve.toString());
        const currencyIn = amount instanceof entity_1.TokenAmount ? amount.token : amount.currency;
        logger.debug('currencyIn:', currencyIn);
        logger.debug('amount:', amount.toFixed());
        logger.debug('anotherCurrency:', anotherCurrency);
        logger.debug('slippage:', `${slippage.toSignificant()}%`);
        // input is fixed
        const input = this._getAmountSide(amount, poolKeys);
        logger.debug('input side:', input);
        // round up
        let amountRaw = entity_1.ZERO;
        if (!amount.isZero()) {
            amountRaw =
                input === 'base'
                    ? (0, entity_1.divCeil)(amount.raw.mul(quoteReserve), baseReserve)
                    : (0, entity_1.divCeil)(amount.raw.mul(baseReserve), quoteReserve);
        }
        const liquidity = (0, entity_1.divCeil)(amount.raw.mul(poolInfo.lpSupply), input === 'base' ? poolInfo.baseReserve : poolInfo.quoteReserve);
        const _slippage = new entity_1.Percent(entity_1.ONE).add(slippage);
        const slippageAdjustedAmount = _slippage.mul(amountRaw).quotient;
        const _anotherAmount = anotherCurrency instanceof entity_1.Token
            ? new entity_1.TokenAmount(anotherCurrency, amountRaw)
            : new entity_1.CurrencyAmount(anotherCurrency, amountRaw);
        const _maxAnotherAmount = anotherCurrency instanceof entity_1.Token
            ? new entity_1.TokenAmount(anotherCurrency, slippageAdjustedAmount)
            : new entity_1.CurrencyAmount(anotherCurrency, slippageAdjustedAmount);
        logger.debug('anotheAmount:', _anotherAmount.toFixed());
        logger.debug('maxAnotheAmount:', _maxAnotherAmount.toFixed());
        return {
            anotherAmount: _anotherAmount,
            maxAnotherAmount: _maxAnotherAmount,
            liquidity,
        };
    }
    static _computePriceImpact(currentPrice, amountIn, amountOut) {
        const exactQuote = currentPrice.raw.mul(amountIn);
        // calculate slippage := (exactQuote - outputAmount) / exactQuote
        const slippage = exactQuote.sub(amountOut).div(exactQuote);
        return new entity_1.Percent(slippage.numerator, slippage.denominator);
    }
    static getRate(poolInfo) {
        const { baseReserve, quoteReserve, baseDecimals, quoteDecimals } = poolInfo;
        const price = new entity_1.Price(new entity_1.Currency(baseDecimals), baseReserve, new entity_1.Currency(quoteDecimals), quoteReserve);
        return price;
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
    static computeAmountIn({ poolKeys, poolInfo, amountOut, currencyIn, slippage }) {
        const { baseReserve, quoteReserve } = poolInfo;
        logger.debug('baseReserve:', baseReserve.toString());
        logger.debug('quoteReserve:', quoteReserve.toString());
        const currencyOut = amountOut instanceof entity_1.TokenAmount ? amountOut.token : amountOut.currency;
        logger.debug('currencyOut:', currencyOut);
        logger.debug('amountOut:', amountOut.toFixed());
        logger.debug('currencyIn:', currencyIn);
        logger.debug('slippage:', `${slippage.toSignificant()}%`);
        const reserves = [baseReserve, quoteReserve];
        // output is fixed
        const output = this._getAmountSide(amountOut, poolKeys);
        if (output === 'base') {
            reserves.reverse();
        }
        logger.debug('output side:', output);
        const [reserveIn, reserveOut] = reserves;
        const currentPrice = new entity_1.Price(currencyIn, reserveIn, currencyOut, reserveOut);
        logger.debug('currentPrice:', `1 ${currencyIn.symbol} ≈ ${currentPrice.toFixed()} ${currencyOut.symbol}`);
        logger.debug('currentPrice invert:', `1 ${currencyOut.symbol} ≈ ${currentPrice.invert().toFixed()} ${currencyIn.symbol}`);
        let amountInRaw = entity_1.ZERO;
        let amountOutRaw = amountOut.raw;
        if (!amountOutRaw.isZero()) {
            // if out > reserve, out = reserve - 1
            if (amountOutRaw.gt(reserveOut)) {
                amountOutRaw = reserveOut.sub(entity_1.ONE);
            }
            const denominator = reserveOut.sub(amountOutRaw);
            const amountInWithoutFee = reserveIn.mul(amountOutRaw).div(denominator);
            amountInRaw = amountInWithoutFee
                .mul(exports.LIQUIDITY_FEES_DENOMINATOR)
                .div(exports.LIQUIDITY_FEES_DENOMINATOR.sub(exports.LIQUIDITY_FEES_NUMERATOR));
        }
        const _slippage = new entity_1.Percent(entity_1.ONE).add(slippage);
        const maxAmountInRaw = _slippage.mul(amountInRaw).quotient;
        const amountIn = currencyIn instanceof entity_1.Token
            ? new entity_1.TokenAmount(currencyIn, amountInRaw)
            : new entity_1.CurrencyAmount(currencyIn, amountInRaw);
        const maxAmountIn = currencyIn instanceof entity_1.Token
            ? new entity_1.TokenAmount(currencyIn, maxAmountInRaw)
            : new entity_1.CurrencyAmount(currencyIn, maxAmountInRaw);
        logger.debug('amountIn:', amountIn.toFixed());
        logger.debug('maxAmountIn:', maxAmountIn.toFixed());
        let executionPrice = null;
        if (!amountInRaw.isZero() && !amountOutRaw.isZero()) {
            executionPrice = new entity_1.Price(currencyIn, amountInRaw, currencyOut, amountOutRaw);
            logger.debug('executionPrice:', `1 ${currencyIn.symbol} ≈ ${executionPrice.toFixed()} ${currencyOut.symbol}`);
            logger.debug('executionPrice invert:', `1 ${currencyOut.symbol} ≈ ${executionPrice.invert().toFixed()} ${currencyIn.symbol}`);
        }
        const priceImpact = this._computePriceImpact(currentPrice, amountInRaw, amountOutRaw);
        logger.debug('priceImpact:', `${priceImpact.toSignificant()}%`);
        return {
            amountIn,
            maxAmountIn,
            currentPrice,
            executionPrice,
            priceImpact,
        };
    }
}
exports.Liquidity = Liquidity;
_a = Liquidity;
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
Liquidity.computeAmountOut = ({ poolKeys, poolInfo, amountIn, currencyOut, slippage, }) => {
    const tokenIn = amountIn instanceof entity_1.TokenAmount ? amountIn.token : entity_1.Token.WSOL;
    const tokenOut = currencyOut instanceof entity_1.Token ? currencyOut : entity_1.Token.WSOL;
    logger.assertArgument(_a.includesToken(tokenIn, poolKeys) && _a.includesToken(tokenOut, poolKeys), 'token not match with pool', 'poolKeys', { poolKeys, tokenIn, tokenOut });
    const { baseReserve, quoteReserve } = poolInfo;
    logger.debug('baseReserve:', baseReserve.toString());
    logger.debug('quoteReserve:', quoteReserve.toString());
    const currencyIn = amountIn instanceof entity_1.TokenAmount ? amountIn.token : amountIn.currency;
    logger.debug('currencyIn:', currencyIn);
    logger.debug('amountIn:', amountIn.toFixed());
    logger.debug('currencyOut:', currencyOut);
    logger.debug('slippage:', `${slippage.toSignificant()}%`);
    const reserves = [baseReserve, quoteReserve];
    // input is fixed
    const input = _a._getAmountSide(amountIn, poolKeys);
    if (input === 'quote') {
        reserves.reverse();
    }
    logger.debug('input side:', input);
    const [reserveIn, reserveOut] = reserves;
    let currentPrice;
    if (poolKeys.version === 4) {
        currentPrice = new entity_1.Price(currencyIn, reserveIn, currencyOut, reserveOut);
    }
    else {
        const p = (0, stable_1.getStablePrice)(modelData, baseReserve.toNumber(), quoteReserve.toNumber(), false);
        if (input === 'quote')
            currentPrice = new entity_1.Price(currencyIn, new bn_js_1.default(p * 1e6), currencyOut, new bn_js_1.default(1e6));
        else
            currentPrice = new entity_1.Price(currencyIn, new bn_js_1.default(1e6), currencyOut, new bn_js_1.default(p * 1e6));
    }
    logger.debug('currentPrice:', `1 ${currencyIn.symbol} ≈ ${currentPrice.toFixed()} ${currencyOut.symbol}`);
    logger.debug('currentPrice invert:', `1 ${currencyOut.symbol} ≈ ${currentPrice.invert().toFixed()} ${currencyIn.symbol}`);
    const amountInRaw = amountIn.raw;
    let amountOutRaw = entity_1.ZERO;
    let feeRaw = entity_1.ZERO;
    if (!amountInRaw.isZero()) {
        if (poolKeys.version === 4) {
            feeRaw = (0, base_1.BNDivCeil)(amountInRaw.mul(exports.LIQUIDITY_FEES_NUMERATOR), exports.LIQUIDITY_FEES_DENOMINATOR);
            const amountInWithFee = amountInRaw.sub(feeRaw);
            const denominator = reserveIn.add(amountInWithFee);
            amountOutRaw = reserveOut.mul(amountInWithFee).div(denominator);
        }
        else {
            feeRaw = amountInRaw.mul(new bn_js_1.default(2)).div(new bn_js_1.default(10000));
            const amountInWithFee = amountInRaw.sub(feeRaw);
            if (input === 'quote')
                amountOutRaw = new bn_js_1.default((0, stable_1.getDyByDxBaseIn)(modelData, quoteReserve.toNumber(), baseReserve.toNumber(), amountInWithFee.toNumber()));
            else {
                amountOutRaw = new bn_js_1.default((0, stable_1.getDxByDyBaseIn)(modelData, quoteReserve.toNumber(), baseReserve.toNumber(), amountInWithFee.toNumber()));
            }
        }
    }
    const _slippage = new entity_1.Percent(entity_1.ONE).add(slippage);
    const minAmountOutRaw = _slippage.invert().mul(amountOutRaw).quotient;
    const amountOut = currencyOut instanceof entity_1.Token
        ? new entity_1.TokenAmount(currencyOut, amountOutRaw)
        : new entity_1.CurrencyAmount(currencyOut, amountOutRaw);
    const minAmountOut = currencyOut instanceof entity_1.Token
        ? new entity_1.TokenAmount(currencyOut, minAmountOutRaw)
        : new entity_1.CurrencyAmount(currencyOut, minAmountOutRaw);
    logger.debug('amountOut:', amountOut.toFixed());
    logger.debug('minAmountOut:', minAmountOut.toFixed());
    let executionPrice = new entity_1.Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw);
    if (!amountInRaw.isZero() && !amountOutRaw.isZero()) {
        executionPrice = new entity_1.Price(currencyIn, amountInRaw.sub(feeRaw), currencyOut, amountOutRaw);
        logger.debug('executionPrice:', `1 ${currencyIn.symbol} ≈ ${executionPrice.toFixed()} ${currencyOut.symbol}`);
        logger.debug('executionPrice invert:', `1 ${currencyOut.symbol} ≈ ${executionPrice.invert().toFixed()} ${currencyIn.symbol}`);
    }
    const priceImpactDenominator = executionPrice.denominator.mul(currentPrice.numerator);
    const priceImpactNumerator = executionPrice.numerator
        .mul(currentPrice.denominator)
        .sub(priceImpactDenominator)
        .abs();
    const priceImpact = new entity_1.Percent(priceImpactNumerator, priceImpactDenominator);
    logger.debug('priceImpact:', `${priceImpact.toSignificant()}%`);
    const fee = currencyIn instanceof entity_1.Token ? new entity_1.TokenAmount(currencyIn, feeRaw) : new entity_1.CurrencyAmount(currencyIn, feeRaw);
    return {
        amountOut,
        minAmountOut,
        currentPrice,
        executionPrice,
        priceImpact,
        fee,
    };
};
//# sourceMappingURL=liquidity.js.map