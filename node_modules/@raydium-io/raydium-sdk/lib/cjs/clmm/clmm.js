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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Clmm = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const base_1 = require("../base");
const pda_1 = require("../base/pda");
const common_1 = require("../common");
const entity_1 = require("../entity");
const spl_1 = require("../spl");
const instrument_1 = require("./instrument");
const layout_1 = require("./layout");
const constants_1 = require("./utils/constants");
const math_1 = require("./utils/math");
const pda_2 = require("./utils/pda");
const pool_1 = require("./utils/pool");
const position_1 = require("./utils/position");
const tick_1 = require("./utils/tick");
const tickarrayBitmap_1 = require("./utils/tickarrayBitmap");
const logger = common_1.Logger.from('Clmm');
class Clmm extends base_1.Base {
    static makeMockPoolInfo({ programId, mint1, mint2, ammConfig, createPoolInstructionSimpleAddress, initialPrice, startTime, owner, }) {
        const [mintA, mintB, initPrice] = new bn_js_1.default(mint1.mint.toBuffer()).gt(new bn_js_1.default(mint2.mint.toBuffer()))
            ? [mint2, mint1, new decimal_js_1.default(1).div(initialPrice)]
            : [mint1, mint2, initialPrice];
        const initialPriceX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(initPrice, mintA.decimals, mintB.decimals);
        return {
            id: createPoolInstructionSimpleAddress.poolId,
            mintA: {
                programId: createPoolInstructionSimpleAddress.mintProgramIdA,
                mint: createPoolInstructionSimpleAddress.mintA,
                vault: createPoolInstructionSimpleAddress.mintAVault,
                decimals: mintA.decimals,
            },
            mintB: {
                programId: createPoolInstructionSimpleAddress.mintProgramIdB,
                mint: createPoolInstructionSimpleAddress.mintB,
                vault: createPoolInstructionSimpleAddress.mintBVault,
                decimals: mintB.decimals,
            },
            ammConfig,
            observationId: createPoolInstructionSimpleAddress.observationId,
            creator: owner,
            programId,
            version: 6,
            tickSpacing: ammConfig.tickSpacing,
            liquidity: entity_1.ZERO,
            sqrtPriceX64: initialPriceX64,
            currentPrice: initPrice,
            tickCurrent: 0,
            observationIndex: 0,
            observationUpdateDuration: 0,
            feeGrowthGlobalX64A: entity_1.ZERO,
            feeGrowthGlobalX64B: entity_1.ZERO,
            protocolFeesTokenA: entity_1.ZERO,
            protocolFeesTokenB: entity_1.ZERO,
            swapInAmountTokenA: entity_1.ZERO,
            swapOutAmountTokenB: entity_1.ZERO,
            swapInAmountTokenB: entity_1.ZERO,
            swapOutAmountTokenA: entity_1.ZERO,
            tickArrayBitmap: [],
            rewardInfos: [],
            day: {
                volume: 0,
                volumeFee: 0,
                feeA: 0,
                feeB: 0,
                feeApr: 0,
                rewardApr: { A: 0, B: 0, C: 0 },
                apr: 0,
                priceMax: 0,
                priceMin: 0,
            },
            week: {
                volume: 0,
                volumeFee: 0,
                feeA: 0,
                feeB: 0,
                feeApr: 0,
                rewardApr: { A: 0, B: 0, C: 0 },
                apr: 0,
                priceMax: 0,
                priceMin: 0,
            },
            month: {
                volume: 0,
                volumeFee: 0,
                feeA: 0,
                feeB: 0,
                feeApr: 0,
                rewardApr: { A: 0, B: 0, C: 0 },
                apr: 0,
                priceMax: 0,
                priceMin: 0,
            },
            tvl: 0,
            lookupTableAccount: web3_js_1.PublicKey.default,
            startTime: startTime.toNumber(),
            exBitmapInfo: {
                poolId: createPoolInstructionSimpleAddress.poolId,
                positiveTickArrayBitmap: Array.from({ length: tickarrayBitmap_1.EXTENSION_TICKARRAY_BITMAP_SIZE }, () => Array.from({ length: 8 }, () => new bn_js_1.default(0))),
                negativeTickArrayBitmap: Array.from({ length: tickarrayBitmap_1.EXTENSION_TICKARRAY_BITMAP_SIZE }, () => Array.from({ length: 8 }, () => new bn_js_1.default(0))),
            },
        };
    }
    // transaction
    static makeCreatePoolInstructionSimple({ makeTxVersion, connection, programId, owner, payer, mint1, mint2, ammConfig, initialPrice, startTime, computeBudgetConfig, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const [mintA, mintB, initPrice] = new bn_js_1.default(mint1.mint.toBuffer()).gt(new bn_js_1.default(mint2.mint.toBuffer()))
                ? [mint2, mint1, new decimal_js_1.default(1).div(initialPrice)]
                : [mint1, mint2, initialPrice];
            const initialPriceX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(initPrice, mintA.decimals, mintB.decimals);
            const makeCreatePoolInstructions = yield this.makeCreatePoolInstructions({
                connection,
                programId,
                owner,
                mintA,
                mintB,
                ammConfigId: ammConfig.id,
                initialPriceX64,
                startTime,
            });
            return {
                address: Object.assign(Object.assign({}, makeCreatePoolInstructions.address), { mintA: mintA.mint, mintB: mintB.mint, mintProgramIdA: mintA.programId, mintProgramIdB: mintB.programId }),
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer,
                    innerTransaction: [makeCreatePoolInstructions.innerTransaction],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeOpenPositionFromLiquidityInstructionSimple({ makeTxVersion, connection, poolInfo, ownerInfo, amountMaxA, amountMaxB, tickLower, tickUpper, liquidity, associatedOnly = true, checkCreateATAOwner = false, withMetadata = 'create', getEphemeralSigners, computeBudgetConfig, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance || amountMaxA.eq(entity_1.ZERO)
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: amountMaxA,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance || amountMaxB.eq(entity_1.ZERO)
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: amountMaxB,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(ownerTokenAccountA !== undefined && ownerTokenAccountB !== undefined, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeOpenPositionInstructions = yield this.makeOpenPositionFromLiquidityInstructions({
                poolInfo,
                ownerInfo: Object.assign(Object.assign({}, ownerInfo), { tokenAccountA: ownerTokenAccountA, tokenAccountB: ownerTokenAccountB }),
                tickLower,
                tickUpper,
                liquidity,
                amountMaxA,
                amountMaxB,
                withMetadata,
                getEphemeralSigners,
            });
            return {
                address: makeOpenPositionInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeOpenPositionInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeOpenPositionFromBaseInstructionSimple({ connection, poolInfo, ownerInfo, tickLower, tickUpper, base, baseAmount, otherAmountMax, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, withMetadata = 'create', makeTxVersion, lookupTableCache, getEphemeralSigners, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: base === 'MintA' ? baseAmount : otherAmountMax,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: base === 'MintA' ? otherAmountMax : baseAmount,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(ownerTokenAccountA !== undefined && ownerTokenAccountB !== undefined, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeOpenPositionInstructions = yield this.makeOpenPositionFromBaseInstructions({
                poolInfo,
                ownerInfo: Object.assign(Object.assign({}, ownerInfo), { tokenAccountA: ownerTokenAccountA, tokenAccountB: ownerTokenAccountB }),
                tickLower,
                tickUpper,
                base,
                baseAmount,
                otherAmountMax,
                withMetadata,
                getEphemeralSigners,
            });
            return {
                address: makeOpenPositionInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeOpenPositionInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeIncreasePositionFromLiquidityInstructionSimple({ connection, poolInfo, ownerPosition, ownerInfo, amountMaxA, amountMaxB, liquidity, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: amountMaxA,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: amountMaxB,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(!!ownerTokenAccountA || !!ownerTokenAccountB, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeIncreaseLiquidityInstructions = this.makeIncreasePositionFromLiquidityInstructions({
                poolInfo,
                ownerPosition,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccountA: ownerTokenAccountA,
                    tokenAccountB: ownerTokenAccountB,
                },
                liquidity,
                amountMaxA,
                amountMaxB,
            });
            return {
                address: makeIncreaseLiquidityInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeIncreaseLiquidityInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeIncreasePositionFromBaseInstructionSimple({ connection, poolInfo, ownerPosition, ownerInfo, base, baseAmount, otherAmountMax, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: base === 'MintA' ? baseAmount : otherAmountMax,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: base === 'MintA' ? otherAmountMax : baseAmount,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(!!ownerTokenAccountA || !!ownerTokenAccountB, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeIncreaseLiquidityInstructions = this.makeIncreasePositionFromBaseInstructions({
                poolInfo,
                ownerPosition,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccountA: ownerTokenAccountA,
                    tokenAccountB: ownerTokenAccountB,
                },
                base,
                baseAmount,
                otherAmountMax,
            });
            return {
                address: makeIncreaseLiquidityInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeIncreaseLiquidityInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeDecreaseLiquidityInstructionSimple({ connection, poolInfo, ownerPosition, ownerInfo, liquidity, amountMinA, amountMinB, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: {
                    connection,
                    payer: ownerInfo.feePayer,
                    amount: 0,
                    frontInstructions,
                    frontInstructionsType,
                    endInstructions: mintAUseSOLBalance ? endInstructions : [],
                    endInstructionsType: mintAUseSOLBalance ? endInstructionsType : [],
                    signers,
                },
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: {
                    connection,
                    payer: ownerInfo.feePayer,
                    amount: 0,
                    frontInstructions,
                    frontInstructionsType,
                    endInstructions: mintBUseSOLBalance ? endInstructions : [],
                    endInstructionsType: mintBUseSOLBalance ? endInstructionsType : [],
                    signers,
                },
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const rewardAccounts = [];
            for (const itemReward of poolInfo.rewardInfos) {
                const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.tokenMint.equals(entity_1.Token.WSOL.mint);
                const ownerRewardAccount = itemReward.tokenMint.equals(poolInfo.mintA.mint)
                    ? ownerTokenAccountA
                    : itemReward.tokenMint.equals(poolInfo.mintB.mint)
                        ? ownerTokenAccountB
                        : yield this._selectOrCreateTokenAccount({
                            programId: itemReward.tokenProgramId,
                            mint: itemReward.tokenMint,
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
                        });
                rewardAccounts.push(ownerRewardAccount);
            }
            logger.assertArgument(!!ownerTokenAccountA || !!ownerTokenAccountB, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeDecreaseLiquidityInstructions = this.makeDecreaseLiquidityInstructions({
                poolInfo,
                ownerPosition,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccountA: ownerTokenAccountA,
                    tokenAccountB: ownerTokenAccountB,
                    rewardAccounts,
                },
                liquidity,
                amountMinA,
                amountMinB,
            });
            const makeClosePositionInstructions = ownerInfo.closePosition
                ? this.makeClosePositionInstructions({
                    poolInfo,
                    ownerInfo,
                    ownerPosition,
                })
                : { address: {}, innerTransaction: { instructions: [], signers: [], instructionTypes: [] } };
            return {
                address: makeDecreaseLiquidityInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeDecreaseLiquidityInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                        makeClosePositionInstructions.innerTransaction,
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeSwapBaseInInstructionSimple({ connection, poolInfo, ownerInfo, inputMint, amountIn, amountOutMin, priceLimit, remainingAccounts, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            let sqrtPriceLimitX64;
            if (!priceLimit || priceLimit.equals(new decimal_js_1.default(0))) {
                sqrtPriceLimitX64 = inputMint.equals(poolInfo.mintA.mint)
                    ? constants_1.MIN_SQRT_PRICE_X64.add(entity_1.ONE)
                    : constants_1.MAX_SQRT_PRICE_X64.sub(entity_1.ONE);
            }
            else {
                sqrtPriceLimitX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(priceLimit, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
            }
            const isInputMintA = poolInfo.mintA.mint.equals(inputMint);
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance || !isInputMintA
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: isInputMintA ? amountIn : 0,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance || isInputMintA
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: isInputMintA ? 0 : amountIn,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(!!ownerTokenAccountA || !!ownerTokenAccountB, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeSwapBaseInInstructions = this.makeSwapBaseInInstructions({
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccountA: ownerTokenAccountA,
                    tokenAccountB: ownerTokenAccountB,
                },
                inputMint,
                amountIn,
                amountOutMin,
                sqrtPriceLimitX64,
                remainingAccounts,
            });
            return {
                address: makeSwapBaseInInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeSwapBaseInInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeSwapBaseOutInstructionSimple({ connection, poolInfo, ownerInfo, outputMint, amountOut, amountInMax, priceLimit, remainingAccounts, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            let sqrtPriceLimitX64;
            if (!priceLimit || priceLimit.equals(new decimal_js_1.default(0))) {
                sqrtPriceLimitX64 = outputMint.equals(poolInfo.mintB.mint)
                    ? constants_1.MIN_SQRT_PRICE_X64.add(entity_1.ONE)
                    : constants_1.MAX_SQRT_PRICE_X64.sub(entity_1.ONE);
            }
            else {
                sqrtPriceLimitX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(priceLimit, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
            }
            const isInputMintA = poolInfo.mintA.mint.equals(outputMint);
            const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
            const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
            const ownerTokenAccountA = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintA.programId,
                mint: poolInfo.mintA.mint,
                tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintAUseSOLBalance || !isInputMintA
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: isInputMintA ? amountInMax : 0,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            const ownerTokenAccountB = yield this._selectOrCreateTokenAccount({
                programId: poolInfo.mintB.programId,
                mint: poolInfo.mintB.mint,
                tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: mintBUseSOLBalance || isInputMintA
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: isInputMintA ? 0 : amountInMax,
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(!!ownerTokenAccountA || !!ownerTokenAccountB, 'cannot found target token accounts', 'tokenAccounts', ownerInfo.tokenAccounts);
            const makeSwapBaseOutInstructions = this.makeSwapBaseOutInstructions({
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccountA: ownerTokenAccountA,
                    tokenAccountB: ownerTokenAccountB,
                },
                outputMint,
                amountOut,
                amountInMax,
                sqrtPriceLimitX64,
                remainingAccounts,
            });
            return {
                address: makeSwapBaseOutInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeSwapBaseOutInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeCLosePositionInstructionSimple({ poolInfo, ownerPosition, ownerInfo, makeTxVersion, lookupTableCache, connection, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = this.makeClosePositionInstructions({ poolInfo, ownerInfo, ownerPosition });
            return {
                address: data.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [data.innerTransaction],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeInitRewardInstructionSimple({ connection, poolInfo, ownerInfo, rewardInfo, chainTime, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.assertArgument(rewardInfo.endTime > rewardInfo.openTime, 'reward time error', 'rewardInfo', rewardInfo);
            logger.assertArgument(rewardInfo.openTime > chainTime, 'reward must be paid later', 'rewardInfo', rewardInfo);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardInfo.mint.equals(entity_1.Token.WSOL.mint);
            const _baseRewardAmount = rewardInfo.perSecond.mul(rewardInfo.endTime - rewardInfo.openTime);
            const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                programId: rewardInfo.programId,
                mint: rewardInfo.mint,
                tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: rewardMintUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: new bn_js_1.default(new decimal_js_1.default(_baseRewardAmount.toFixed(0)).gte(_baseRewardAmount)
                            ? _baseRewardAmount.toFixed(0)
                            : _baseRewardAmount.add(1).toFixed(0)),
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
            const makeInitRewardInstructions = this.makeInitRewardInstructions({
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccount: ownerRewardAccount,
                },
                rewardInfo: {
                    programId: rewardInfo.programId,
                    mint: rewardInfo.mint,
                    openTime: rewardInfo.openTime,
                    endTime: rewardInfo.endTime,
                    emissionsPerSecondX64: math_1.MathUtil.decimalToX64(rewardInfo.perSecond),
                },
            });
            return {
                address: makeInitRewardInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeInitRewardInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeInitRewardsInstructionSimple({ connection, poolInfo, ownerInfo, rewardInfos, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const rewardInfo of rewardInfos)
                logger.assertArgument(rewardInfo.endTime > rewardInfo.openTime, 'reward time error', 'rewardInfo', rewardInfo);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const makeInitRewardInstructions = [];
            const signers = [];
            for (const rewardInfo of rewardInfos) {
                const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardInfo.mint.equals(entity_1.Token.WSOL.mint);
                const _baseRewardAmount = rewardInfo.perSecond.mul(rewardInfo.endTime - rewardInfo.openTime);
                const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                    programId: rewardInfo.programId,
                    mint: rewardInfo.mint,
                    tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: rewardMintUseSOLBalance
                        ? {
                            connection,
                            payer: ownerInfo.feePayer,
                            amount: new bn_js_1.default(new decimal_js_1.default(_baseRewardAmount.toFixed(0)).gte(_baseRewardAmount)
                                ? _baseRewardAmount.toFixed(0)
                                : _baseRewardAmount.add(1).toFixed(0)),
                            frontInstructions,
                            endInstructions,
                            frontInstructionsType,
                            endInstructionsType,
                            signers,
                        }
                        : undefined,
                    associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                    checkCreateATAOwner,
                });
                logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
                makeInitRewardInstructions.push(this.makeInitRewardInstructions({
                    poolInfo,
                    ownerInfo: {
                        wallet: ownerInfo.wallet,
                        tokenAccount: ownerRewardAccount,
                    },
                    rewardInfo: {
                        programId: rewardInfo.programId,
                        mint: rewardInfo.mint,
                        openTime: rewardInfo.openTime,
                        endTime: rewardInfo.endTime,
                        emissionsPerSecondX64: math_1.MathUtil.decimalToX64(rewardInfo.perSecond),
                    },
                }));
            }
            let address = {};
            for (const item of makeInitRewardInstructions) {
                address = Object.assign(Object.assign({}, address), item.address);
            }
            return {
                address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        ...makeInitRewardInstructions.map((i) => i.innerTransaction),
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeSetRewardInstructionSimple({ connection, poolInfo, ownerInfo, rewardInfo, chainTime, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.assertArgument(rewardInfo.endTime > rewardInfo.openTime, 'reward time error', 'rewardInfo', rewardInfo);
            logger.assertArgument(rewardInfo.openTime > chainTime, 'reward must be paid later', 'rewardInfo', rewardInfo);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardInfo.mint.equals(entity_1.Token.WSOL.mint);
            const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                programId: rewardInfo.programId,
                mint: rewardInfo.mint,
                tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: rewardMintUseSOLBalance
                    ? {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: new bn_js_1.default(new decimal_js_1.default(rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime).toFixed(0)).gte(rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime))
                            ? rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime).toFixed(0)
                            : rewardInfo.perSecond
                                .sub(rewardInfo.endTime - rewardInfo.openTime)
                                .add(1)
                                .toFixed(0)),
                        frontInstructions,
                        endInstructions,
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    }
                    : undefined,
                associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
            const makeSetRewardInstructions = this.makeSetRewardInstructions({
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccount: ownerRewardAccount,
                },
                rewardInfo: {
                    mint: rewardInfo.mint,
                    openTime: rewardInfo.openTime,
                    endTime: rewardInfo.endTime,
                    emissionsPerSecondX64: math_1.MathUtil.decimalToX64(rewardInfo.perSecond),
                },
            });
            return {
                address: makeSetRewardInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeSetRewardInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeSetRewardsInstructionSimple({ connection, poolInfo, ownerInfo, rewardInfos, chainTime, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const makeSetRewardInstructions = [];
            const signers = [];
            for (const rewardInfo of rewardInfos) {
                logger.assertArgument(rewardInfo.endTime > rewardInfo.openTime, 'reward time error', 'rewardInfo', rewardInfo);
                logger.assertArgument(rewardInfo.openTime > chainTime, 'reward must be paid later', 'rewardInfo', rewardInfo);
                const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardInfo.mint.equals(entity_1.Token.WSOL.mint);
                const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                    programId: rewardInfo.programId,
                    mint: rewardInfo.mint,
                    tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: rewardMintUseSOLBalance
                        ? {
                            connection,
                            payer: ownerInfo.feePayer,
                            amount: new bn_js_1.default(new decimal_js_1.default(rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime).toFixed(0)).gte(rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime))
                                ? rewardInfo.perSecond.sub(rewardInfo.endTime - rewardInfo.openTime).toFixed(0)
                                : rewardInfo.perSecond
                                    .sub(rewardInfo.endTime - rewardInfo.openTime)
                                    .add(1)
                                    .toFixed(0)),
                            frontInstructions,
                            endInstructions,
                            frontInstructionsType,
                            endInstructionsType,
                            signers,
                        }
                        : undefined,
                    associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                    checkCreateATAOwner,
                });
                logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
                makeSetRewardInstructions.push(this.makeSetRewardInstructions({
                    poolInfo,
                    ownerInfo: {
                        wallet: ownerInfo.wallet,
                        tokenAccount: ownerRewardAccount,
                    },
                    rewardInfo: {
                        mint: rewardInfo.mint,
                        openTime: rewardInfo.openTime,
                        endTime: rewardInfo.endTime,
                        emissionsPerSecondX64: math_1.MathUtil.decimalToX64(rewardInfo.perSecond),
                    },
                }));
            }
            let address = {};
            for (const item of makeSetRewardInstructions) {
                address = Object.assign(Object.assign({}, address), item.address);
            }
            return {
                address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        ...makeSetRewardInstructions.map((i) => i.innerTransaction),
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeCollectRewardInstructionSimple({ connection, poolInfo, ownerInfo, rewardMint, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            const rewardInfo = poolInfo.rewardInfos.find((i) => i.tokenMint.equals(rewardMint));
            logger.assertArgument(rewardInfo !== undefined, 'reward mint error', 'not found reward mint', rewardMint);
            if (rewardInfo === undefined)
                throw Error('reward mint error');
            const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardMint.equals(entity_1.Token.WSOL.mint);
            const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                programId: rewardInfo.tokenProgramId,
                mint: rewardMint,
                tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                owner: ownerInfo.wallet,
                createInfo: {
                    connection,
                    payer: ownerInfo.feePayer,
                    amount: 0,
                    frontInstructions,
                    endInstructions: rewardMintUseSOLBalance ? endInstructions : [],
                    frontInstructionsType,
                    endInstructionsType,
                    signers,
                },
                associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                checkCreateATAOwner,
            });
            logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
            const makeCollectRewardInstructions = this.makeCollectRewardInstructions({
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    tokenAccount: ownerRewardAccount,
                },
                rewardMint,
            });
            return {
                address: makeCollectRewardInstructions.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        makeCollectRewardInstructions.innerTransaction,
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeCollectRewardsInstructionSimple({ connection, poolInfo, ownerInfo, rewardMints, associatedOnly = true, checkCreateATAOwner = false, computeBudgetConfig, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const makeCollectRewardInstructions = [];
            const signers = [];
            for (const rewardMint of rewardMints) {
                const rewardInfo = poolInfo.rewardInfos.find((i) => i.tokenMint.equals(rewardMint));
                logger.assertArgument(rewardInfo !== undefined, 'reward mint error', 'not found reward mint', rewardMint);
                if (rewardInfo === undefined)
                    throw Error('reward mint error');
                const rewardMintUseSOLBalance = ownerInfo.useSOLBalance && rewardMint.equals(entity_1.Token.WSOL.mint);
                const ownerRewardAccount = yield this._selectOrCreateTokenAccount({
                    programId: rewardInfo.tokenProgramId,
                    mint: rewardMint,
                    tokenAccounts: rewardMintUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: 0,
                        frontInstructions,
                        endInstructions: rewardMintUseSOLBalance ? endInstructions : [],
                        signers,
                        frontInstructionsType,
                        endInstructionsType,
                    },
                    associatedOnly: rewardMintUseSOLBalance ? false : associatedOnly,
                    checkCreateATAOwner,
                });
                logger.assertArgument(ownerRewardAccount, 'no money', 'ownerRewardAccount', ownerInfo.tokenAccounts);
                makeCollectRewardInstructions.push(this.makeCollectRewardInstructions({
                    poolInfo,
                    ownerInfo: {
                        wallet: ownerInfo.wallet,
                        tokenAccount: ownerRewardAccount,
                    },
                    rewardMint,
                }));
            }
            let address = {};
            for (const item of makeCollectRewardInstructions) {
                address = Object.assign(Object.assign({}, address), item.address);
            }
            return {
                address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        ...makeCollectRewardInstructions.map((i) => i.innerTransaction),
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeHarvestAllRewardInstructionSimple({ connection, fetchPoolInfos, ownerInfo, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, }) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const ownerMintToAccount = {};
            for (const item of ownerInfo.tokenAccounts) {
                if (associatedOnly) {
                    const ata = (0, pda_1.getATAAddress)(ownerInfo.wallet, item.accountInfo.mint, item.programId).publicKey;
                    if (ata.equals(item.pubkey))
                        ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey;
                }
                else {
                    ownerMintToAccount[item.accountInfo.mint.toString()] = item.pubkey;
                }
            }
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const makeDecreaseLiquidityInstructions = [];
            const signers = [];
            for (const itemInfo of Object.values(fetchPoolInfos)) {
                if (itemInfo.positionAccount === undefined)
                    continue;
                if (!itemInfo.positionAccount.find((i) => !i.tokenFeeAmountA.isZero() ||
                    !i.tokenFeeAmountB.isZero() ||
                    i.rewardInfos.find((ii) => !ii.pendingReward.isZero())))
                    continue;
                const poolInfo = itemInfo.state;
                const mintAUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintA.mint.equals(entity_1.Token.WSOL.mint);
                const mintBUseSOLBalance = ownerInfo.useSOLBalance && poolInfo.mintB.mint.equals(entity_1.Token.WSOL.mint);
                const ownerTokenAccountA = (_a = ownerMintToAccount[poolInfo.mintA.mint.toString()]) !== null && _a !== void 0 ? _a : (yield this._selectOrCreateTokenAccount({
                    programId: poolInfo.mintA.programId,
                    mint: poolInfo.mintA.mint,
                    tokenAccounts: mintAUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: 0,
                        frontInstructions,
                        frontInstructionsType,
                        endInstructions: mintAUseSOLBalance ? endInstructions : [],
                        endInstructionsType: mintAUseSOLBalance ? endInstructionsType : [],
                        signers,
                    },
                    associatedOnly: mintAUseSOLBalance ? false : associatedOnly,
                    checkCreateATAOwner,
                }));
                const ownerTokenAccountB = (_b = ownerMintToAccount[poolInfo.mintB.mint.toString()]) !== null && _b !== void 0 ? _b : (yield this._selectOrCreateTokenAccount({
                    programId: poolInfo.mintB.programId,
                    mint: poolInfo.mintB.mint,
                    tokenAccounts: mintBUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: {
                        connection,
                        payer: ownerInfo.feePayer,
                        amount: 0,
                        frontInstructions,
                        frontInstructionsType,
                        endInstructions: mintBUseSOLBalance ? endInstructions : [],
                        endInstructionsType: mintBUseSOLBalance ? endInstructionsType : [],
                        signers,
                    },
                    associatedOnly: mintBUseSOLBalance ? false : associatedOnly,
                    checkCreateATAOwner,
                }));
                ownerMintToAccount[poolInfo.mintA.mint.toString()] = ownerTokenAccountA;
                ownerMintToAccount[poolInfo.mintB.mint.toString()] = ownerTokenAccountB;
                const rewardAccounts = [];
                for (const itemReward of poolInfo.rewardInfos) {
                    const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.tokenMint.equals(entity_1.Token.WSOL.mint);
                    const ownerRewardAccount = (_c = ownerMintToAccount[itemReward.tokenMint.toString()]) !== null && _c !== void 0 ? _c : (yield this._selectOrCreateTokenAccount({
                        programId: itemReward.tokenProgramId,
                        mint: itemReward.tokenMint,
                        tokenAccounts: rewardUseSOLBalance ? [] : ownerInfo.tokenAccounts,
                        owner: ownerInfo.wallet,
                        createInfo: {
                            connection,
                            payer: ownerInfo.feePayer,
                            amount: 0,
                            frontInstructions,
                            endInstructions: rewardUseSOLBalance ? endInstructions : [],
                            frontInstructionsType,
                            endInstructionsType,
                            signers,
                        },
                        associatedOnly: rewardUseSOLBalance ? false : associatedOnly,
                        checkCreateATAOwner,
                    }));
                    ownerMintToAccount[itemReward.tokenMint.toString()] = ownerRewardAccount;
                    rewardAccounts.push(ownerRewardAccount);
                }
                for (const itemPosition of itemInfo.positionAccount) {
                    makeDecreaseLiquidityInstructions.push(this.makeDecreaseLiquidityInstructions({
                        poolInfo,
                        ownerPosition: itemPosition,
                        ownerInfo: {
                            wallet: ownerInfo.wallet,
                            tokenAccountA: ownerTokenAccountA,
                            tokenAccountB: ownerTokenAccountB,
                            rewardAccounts,
                        },
                        liquidity: entity_1.ZERO,
                        amountMinA: entity_1.ZERO,
                        amountMinB: entity_1.ZERO,
                    }));
                }
            }
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.feePayer,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        ...makeDecreaseLiquidityInstructions.map((i) => i.innerTransaction),
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    // instrument
    static makeCreatePoolInstructions({ connection, programId, owner, mintA, mintB, ammConfigId, initialPriceX64, startTime, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const observationId = (0, base_1.generatePubKey)({ fromPublicKey: owner, programId });
            const poolId = (0, pda_2.getPdaPoolId)(programId, ammConfigId, mintA.mint, mintB.mint).publicKey;
            const mintAVault = (0, pda_2.getPdaPoolVaultId)(programId, poolId, mintA.mint).publicKey;
            const mintBVault = (0, pda_2.getPdaPoolVaultId)(programId, poolId, mintB.mint).publicKey;
            const instructions = [
                web3_js_1.SystemProgram.createAccountWithSeed({
                    fromPubkey: owner,
                    basePubkey: owner,
                    seed: observationId.seed,
                    newAccountPubkey: observationId.publicKey,
                    lamports: yield connection.getMinimumBalanceForRentExemption(layout_1.ObservationInfoLayout.span),
                    space: layout_1.ObservationInfoLayout.span,
                    programId,
                }),
                (0, instrument_1.createPoolInstruction)(programId, poolId, owner, ammConfigId, observationId.publicKey, mintA.mint, mintAVault, mintA.programId, mintB.mint, mintBVault, mintB.programId, (0, pda_2.getPdaExBitmapAccount)(programId, poolId).publicKey, initialPriceX64, startTime),
            ];
            return {
                address: {
                    observationId: observationId.publicKey,
                    poolId,
                    mintAVault,
                    mintBVault,
                },
                innerTransaction: {
                    instructions,
                    signers: [],
                    instructionTypes: [base_1.InstructionType.createAccount, base_1.InstructionType.clmmCreatePool],
                    lookupTableAddress: [],
                },
            };
        });
    }
    static makeOpenPositionFromLiquidityInstructions({ poolInfo, ownerInfo, tickLower, tickUpper, liquidity, amountMaxA, amountMaxB, withMetadata, getEphemeralSigners, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const signers = [];
            let nftMintAccount;
            if (getEphemeralSigners) {
                nftMintAccount = new web3_js_1.PublicKey((yield getEphemeralSigners(1))[0]);
            }
            else {
                const _k = web3_js_1.Keypair.generate();
                signers.push(_k);
                nftMintAccount = _k.publicKey;
            }
            const tickArrayLowerStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickLower, poolInfo.ammConfig.tickSpacing);
            const tickArrayUpperStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickUpper, poolInfo.ammConfig.tickSpacing);
            const { publicKey: tickArrayLower } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
            const { publicKey: tickArrayUpper } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
            const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, nftMintAccount, common_1.TOKEN_PROGRAM_ID);
            const { publicKey: metadataAccount } = (0, pda_2.getPdaMetadataKey)(nftMintAccount);
            const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, nftMintAccount);
            const { publicKey: protocolPosition } = (0, pda_2.getPdaProtocolPositionAddress)(poolInfo.programId, poolInfo.id, tickLower, tickUpper);
            const ins = (0, instrument_1.openPositionFromLiquidityInstruction)(poolInfo.programId, ownerInfo.feePayer, poolInfo.id, ownerInfo.wallet, nftMintAccount, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerInfo.tokenAccountA, ownerInfo.tokenAccountB, poolInfo.mintA.vault, poolInfo.mintB.vault, poolInfo.mintA.mint, poolInfo.mintB.mint, tickLower, tickUpper, tickArrayLowerStartIndex, tickArrayUpperStartIndex, liquidity, amountMaxA, amountMaxB, withMetadata, pool_1.PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
                tickArrayLowerStartIndex,
                tickArrayUpperStartIndex,
            ])
                ? (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey
                : undefined);
            return {
                address: {
                    nftMint: nftMintAccount,
                    tickArrayLower,
                    tickArrayUpper,
                    positionNftAccount,
                    metadataAccount,
                    personalPosition,
                    protocolPosition,
                },
                innerTransaction: {
                    instructions: [ins],
                    signers,
                    instructionTypes: [base_1.InstructionType.clmmOpenPosition],
                    lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                },
            };
        });
    }
    static makeOpenPositionFromBaseInstructions({ poolInfo, ownerInfo, tickLower, tickUpper, base, baseAmount, otherAmountMax, withMetadata, getEphemeralSigners, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const signers = [];
            let nftMintAccount;
            if (getEphemeralSigners) {
                nftMintAccount = new web3_js_1.PublicKey((yield getEphemeralSigners(1))[0]);
            }
            else {
                const _k = web3_js_1.Keypair.generate();
                signers.push(_k);
                nftMintAccount = _k.publicKey;
            }
            const tickArrayLowerStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickLower, poolInfo.ammConfig.tickSpacing);
            const tickArrayUpperStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickUpper, poolInfo.ammConfig.tickSpacing);
            const { publicKey: tickArrayLower } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
            const { publicKey: tickArrayUpper } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
            const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, nftMintAccount, common_1.TOKEN_PROGRAM_ID);
            const { publicKey: metadataAccount } = (0, pda_2.getPdaMetadataKey)(nftMintAccount);
            const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, nftMintAccount);
            const { publicKey: protocolPosition } = (0, pda_2.getPdaProtocolPositionAddress)(poolInfo.programId, poolInfo.id, tickLower, tickUpper);
            const ins = (0, instrument_1.openPositionFromBaseInstruction)(poolInfo.programId, ownerInfo.feePayer, poolInfo.id, ownerInfo.wallet, nftMintAccount, positionNftAccount, metadataAccount, protocolPosition, tickArrayLower, tickArrayUpper, personalPosition, ownerInfo.tokenAccountA, ownerInfo.tokenAccountB, poolInfo.mintA.vault, poolInfo.mintB.vault, poolInfo.mintA.mint, poolInfo.mintB.mint, tickLower, tickUpper, tickArrayLowerStartIndex, tickArrayUpperStartIndex, withMetadata, base, baseAmount, otherAmountMax, pool_1.PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
                tickArrayLowerStartIndex,
                tickArrayUpperStartIndex,
            ])
                ? (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey
                : undefined);
            return {
                address: {
                    nftMint: nftMintAccount,
                    tickArrayLower,
                    tickArrayUpper,
                    positionNftAccount,
                    metadataAccount,
                    personalPosition,
                    protocolPosition,
                },
                innerTransaction: {
                    instructions: [ins],
                    signers,
                    instructionTypes: [base_1.InstructionType.clmmOpenPosition],
                    lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                },
            };
        });
    }
    static makeIncreasePositionFromLiquidityInstructions({ poolInfo, ownerPosition, ownerInfo, liquidity, amountMaxA, amountMaxB, }) {
        const tickArrayLowerStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickLower, poolInfo.ammConfig.tickSpacing);
        const tickArrayUpperStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickUpper, poolInfo.ammConfig.tickSpacing);
        const { publicKey: tickArrayLower } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
        const { publicKey: tickArrayUpper } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
        const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, ownerPosition.nftMint, common_1.TOKEN_PROGRAM_ID);
        const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, ownerPosition.nftMint);
        const { publicKey: protocolPosition } = (0, pda_2.getPdaProtocolPositionAddress)(poolInfo.programId, poolInfo.id, ownerPosition.tickLower, ownerPosition.tickUpper);
        return {
            address: {
                tickArrayLower,
                tickArrayUpper,
                positionNftAccount,
                personalPosition,
                protocolPosition,
            },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.increasePositionFromLiquidityInstruction)(poolInfo.programId, ownerInfo.wallet, positionNftAccount, personalPosition, poolInfo.id, protocolPosition, tickArrayLower, tickArrayUpper, ownerInfo.tokenAccountA, ownerInfo.tokenAccountB, poolInfo.mintA.vault, poolInfo.mintB.vault, poolInfo.mintA.mint, poolInfo.mintB.mint, liquidity, amountMaxA, amountMaxB, pool_1.PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
                        tickArrayLowerStartIndex,
                        tickArrayUpperStartIndex,
                    ])
                        ? (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey
                        : undefined),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmIncreasePosition],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeIncreasePositionFromBaseInstructions({ poolInfo, ownerPosition, ownerInfo, base, baseAmount, otherAmountMax, }) {
        const tickArrayLowerStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickLower, poolInfo.ammConfig.tickSpacing);
        const tickArrayUpperStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickUpper, poolInfo.ammConfig.tickSpacing);
        const { publicKey: tickArrayLower } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
        const { publicKey: tickArrayUpper } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
        const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, ownerPosition.nftMint, common_1.TOKEN_PROGRAM_ID);
        const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, ownerPosition.nftMint);
        const { publicKey: protocolPosition } = (0, pda_2.getPdaProtocolPositionAddress)(poolInfo.programId, poolInfo.id, ownerPosition.tickLower, ownerPosition.tickUpper);
        return {
            address: {
                tickArrayLower,
                tickArrayUpper,
                positionNftAccount,
                personalPosition,
                protocolPosition,
            },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.increasePositionFromBaseInstruction)(poolInfo.programId, ownerInfo.wallet, positionNftAccount, personalPosition, poolInfo.id, protocolPosition, tickArrayLower, tickArrayUpper, ownerInfo.tokenAccountA, ownerInfo.tokenAccountB, poolInfo.mintA.vault, poolInfo.mintB.vault, poolInfo.mintA.mint, poolInfo.mintB.mint, base, baseAmount, otherAmountMax, pool_1.PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
                        tickArrayLowerStartIndex,
                        tickArrayUpperStartIndex,
                    ])
                        ? (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey
                        : undefined),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmIncreasePosition],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeDecreaseLiquidityInstructions({ poolInfo, ownerPosition, ownerInfo, liquidity, amountMinA, amountMinB, }) {
        const tickArrayLowerStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickLower, poolInfo.ammConfig.tickSpacing);
        const tickArrayUpperStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(ownerPosition.tickUpper, poolInfo.ammConfig.tickSpacing);
        const { publicKey: tickArrayLower } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayLowerStartIndex);
        const { publicKey: tickArrayUpper } = (0, pda_2.getPdaTickArrayAddress)(poolInfo.programId, poolInfo.id, tickArrayUpperStartIndex);
        const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, ownerPosition.nftMint, common_1.TOKEN_PROGRAM_ID);
        const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, ownerPosition.nftMint);
        const { publicKey: protocolPosition } = (0, pda_2.getPdaProtocolPositionAddress)(poolInfo.programId, poolInfo.id, ownerPosition.tickLower, ownerPosition.tickUpper);
        const rewardAccounts = [];
        for (let i = 0; i < poolInfo.rewardInfos.length; i++) {
            rewardAccounts.push({
                poolRewardVault: poolInfo.rewardInfos[i].tokenVault,
                ownerRewardVault: ownerInfo.rewardAccounts[i],
                rewardMint: poolInfo.rewardInfos[i].tokenMint,
            });
        }
        return {
            address: {
                tickArrayLower,
                tickArrayUpper,
                positionNftAccount,
                personalPosition,
                protocolPosition,
            },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.decreaseLiquidityInstruction)(poolInfo.programId, ownerInfo.wallet, positionNftAccount, personalPosition, poolInfo.id, protocolPosition, tickArrayLower, tickArrayUpper, ownerInfo.tokenAccountA, ownerInfo.tokenAccountB, poolInfo.mintA.vault, poolInfo.mintB.vault, poolInfo.mintA.mint, poolInfo.mintB.mint, rewardAccounts, liquidity, amountMinA, amountMinB, pool_1.PoolUtils.isOverflowDefaultTickarrayBitmap(poolInfo.tickSpacing, [
                        tickArrayLowerStartIndex,
                        tickArrayUpperStartIndex,
                    ])
                        ? (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey
                        : undefined),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmDecreasePosition],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeClosePositionInstructions({ poolInfo, ownerInfo, ownerPosition, }) {
        const { publicKey: positionNftAccount } = (0, pda_1.getATAAddress)(ownerInfo.wallet, ownerPosition.nftMint, common_1.TOKEN_PROGRAM_ID);
        const { publicKey: personalPosition } = (0, pda_2.getPdaPersonalPositionAddress)(poolInfo.programId, ownerPosition.nftMint);
        return {
            address: {
                positionNftAccount,
                personalPosition,
            },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.closePositionInstruction)(poolInfo.programId, ownerInfo.wallet, ownerPosition.nftMint, positionNftAccount, personalPosition),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmClosePosition],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeSwapBaseInInstructions({ poolInfo, ownerInfo, inputMint, amountIn, amountOutMin, sqrtPriceLimitX64, remainingAccounts, }) {
        const isInputMintA = poolInfo.mintA.mint.equals(inputMint);
        return {
            address: {},
            innerTransaction: {
                instructions: [
                    (0, instrument_1.swapInstruction)(poolInfo.programId, ownerInfo.wallet, poolInfo.id, poolInfo.ammConfig.id, isInputMintA ? ownerInfo.tokenAccountA : ownerInfo.tokenAccountB, isInputMintA ? ownerInfo.tokenAccountB : ownerInfo.tokenAccountA, isInputMintA ? poolInfo.mintA.vault : poolInfo.mintB.vault, isInputMintA ? poolInfo.mintB.vault : poolInfo.mintA.vault, isInputMintA ? poolInfo.mintA.mint : poolInfo.mintB.mint, isInputMintA ? poolInfo.mintB.mint : poolInfo.mintA.mint, remainingAccounts, poolInfo.observationId, amountIn, amountOutMin, sqrtPriceLimitX64, true, (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey),
                ],
                signers: [],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                instructionTypes: [base_1.InstructionType.clmmSwapBaseIn],
            },
        };
    }
    static makeSwapBaseOutInstructions({ poolInfo, ownerInfo, outputMint, amountOut, amountInMax, sqrtPriceLimitX64, remainingAccounts, }) {
        const isInputMintA = poolInfo.mintA.mint.equals(outputMint);
        return {
            address: {},
            innerTransaction: {
                instructions: [
                    (0, instrument_1.swapInstruction)(poolInfo.programId, ownerInfo.wallet, poolInfo.id, poolInfo.ammConfig.id, isInputMintA ? ownerInfo.tokenAccountB : ownerInfo.tokenAccountA, isInputMintA ? ownerInfo.tokenAccountA : ownerInfo.tokenAccountB, isInputMintA ? poolInfo.mintB.vault : poolInfo.mintA.vault, isInputMintA ? poolInfo.mintA.vault : poolInfo.mintB.vault, isInputMintA ? poolInfo.mintB.mint : poolInfo.mintA.mint, isInputMintA ? poolInfo.mintA.mint : poolInfo.mintB.mint, remainingAccounts, poolInfo.observationId, amountOut, amountInMax, sqrtPriceLimitX64, false, (0, pda_2.getPdaExBitmapAccount)(poolInfo.programId, poolInfo.id).publicKey),
                ],
                signers: [],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
                instructionTypes: [base_1.InstructionType.clmmSwapBaseOut],
            },
        };
    }
    static makeInitRewardInstructions({ poolInfo, ownerInfo, rewardInfo, }) {
        const poolRewardVault = (0, pda_2.getPdaPoolRewardVaulId)(poolInfo.programId, poolInfo.id, rewardInfo.mint).publicKey;
        const operationId = (0, pda_2.getPdaOperationAccount)(poolInfo.programId).publicKey;
        return {
            address: { poolRewardVault, operationId },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.initRewardInstruction)(poolInfo.programId, ownerInfo.wallet, poolInfo.id, operationId, poolInfo.ammConfig.id, ownerInfo.tokenAccount, rewardInfo.programId, rewardInfo.mint, poolRewardVault, rewardInfo.openTime, rewardInfo.endTime, rewardInfo.emissionsPerSecondX64),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmInitReward],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeSetRewardInstructions({ poolInfo, ownerInfo, rewardInfo, }) {
        let rewardIndex;
        let rewardVault;
        let rewardMint;
        for (let index = 0; index < poolInfo.rewardInfos.length; index++)
            if (poolInfo.rewardInfos[index].tokenMint.equals(rewardInfo.mint)) {
                rewardIndex = index;
                rewardVault = poolInfo.rewardInfos[index].tokenVault;
                rewardMint = poolInfo.rewardInfos[index].tokenMint;
            }
        if (rewardIndex === undefined || rewardVault === undefined || rewardMint === undefined)
            throw Error('reward mint check error');
        const operationId = (0, pda_2.getPdaOperationAccount)(poolInfo.programId).publicKey;
        return {
            address: { rewardVault, operationId },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.setRewardInstruction)(poolInfo.programId, ownerInfo.wallet, poolInfo.id, operationId, poolInfo.ammConfig.id, ownerInfo.tokenAccount, rewardVault, rewardMint, rewardIndex, rewardInfo.openTime, rewardInfo.endTime, rewardInfo.emissionsPerSecondX64),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmInitReward],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    static makeCollectRewardInstructions({ poolInfo, ownerInfo, rewardMint, }) {
        let rewardIndex;
        let rewardVault;
        for (let index = 0; index < poolInfo.rewardInfos.length; index++)
            if (poolInfo.rewardInfos[index].tokenMint.equals(rewardMint)) {
                rewardIndex = index;
                rewardVault = poolInfo.rewardInfos[index].tokenVault;
            }
        if (rewardIndex === undefined || rewardVault === undefined)
            throw Error('reward mint check error');
        return {
            address: { rewardVault },
            innerTransaction: {
                instructions: [
                    (0, instrument_1.collectRewardInstruction)(poolInfo.programId, ownerInfo.wallet, poolInfo.id, ownerInfo.tokenAccount, rewardVault, rewardMint, rewardIndex),
                ],
                signers: [],
                instructionTypes: [base_1.InstructionType.clmmInitReward],
                lookupTableAddress: [poolInfo.lookupTableAccount].filter((i) => i && !i.equals(web3_js_1.PublicKey.default)),
            },
        };
    }
    // calculate
    static getLiquidityAmountOutFromAmountIn({ poolInfo, inputA, tickLower, tickUpper, amount, slippage, add, token2022Infos, epochInfo, amountHasFee, }) {
        var _a, _b;
        const sqrtPriceX64 = poolInfo.sqrtPriceX64;
        const sqrtPriceX64A = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tickLower);
        const sqrtPriceX64B = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tickUpper);
        const coefficient = add ? 1 - slippage : 1 + slippage;
        const addFeeAmount = (0, base_1.getTransferAmountFee)(amount, (_a = token2022Infos[inputA ? poolInfo.mintA.mint.toString() : poolInfo.mintB.mint.toString()]) === null || _a === void 0 ? void 0 : _a.feeConfig, epochInfo, !amountHasFee);
        const _amount = new bn_js_1.default(new decimal_js_1.default(addFeeAmount.amount.sub((_b = addFeeAmount.fee) !== null && _b !== void 0 ? _b : entity_1.ZERO).toString()).mul(coefficient).toFixed(0));
        let liquidity;
        if (sqrtPriceX64.lte(sqrtPriceX64A)) {
            liquidity = inputA
                ? math_1.LiquidityMath.getLiquidityFromTokenAmountA(sqrtPriceX64A, sqrtPriceX64B, _amount, !add)
                : new bn_js_1.default(0);
        }
        else if (sqrtPriceX64.lte(sqrtPriceX64B)) {
            const liquidity0 = math_1.LiquidityMath.getLiquidityFromTokenAmountA(sqrtPriceX64, sqrtPriceX64B, _amount, !add);
            const liquidity1 = math_1.LiquidityMath.getLiquidityFromTokenAmountB(sqrtPriceX64A, sqrtPriceX64, _amount);
            liquidity = inputA ? liquidity0 : liquidity1;
        }
        else {
            liquidity = inputA ? new bn_js_1.default(0) : math_1.LiquidityMath.getLiquidityFromTokenAmountB(sqrtPriceX64A, sqrtPriceX64B, _amount);
        }
        return this.getAmountsFromLiquidity({
            poolInfo,
            tickLower,
            tickUpper,
            liquidity,
            slippage,
            add,
            token2022Infos,
            epochInfo,
            amountAddFee: amountHasFee,
        });
    }
    static getLiquidityFromAmounts({ poolInfo, tickLower, tickUpper, amountA, amountB, slippage, add, token2022Infos, epochInfo, amountHasFee, }) {
        var _a, _b, _c, _d;
        const [_tickLower, _tickUpper, _amountA, _amountB] = tickLower < tickUpper ? [tickLower, tickUpper, amountA, amountB] : [tickUpper, tickLower, amountB, amountA];
        const sqrtPriceX64 = poolInfo.sqrtPriceX64;
        const sqrtPriceX64A = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(_tickLower);
        const sqrtPriceX64B = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(_tickUpper);
        const [amountFeeA, amountFeeB] = [
            (0, base_1.getTransferAmountFee)(_amountA, (_a = token2022Infos[poolInfo.mintA.mint.toString()]) === null || _a === void 0 ? void 0 : _a.feeConfig, epochInfo, !amountHasFee),
            (0, base_1.getTransferAmountFee)(_amountB, (_b = token2022Infos[poolInfo.mintB.mint.toString()]) === null || _b === void 0 ? void 0 : _b.feeConfig, epochInfo, !amountHasFee),
        ];
        const liquidity = math_1.LiquidityMath.getLiquidityFromTokenAmounts(sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, amountFeeA.amount.sub((_c = amountFeeA.fee) !== null && _c !== void 0 ? _c : entity_1.ZERO), amountFeeB.amount.sub((_d = amountFeeB.fee) !== null && _d !== void 0 ? _d : entity_1.ZERO));
        return this.getAmountsFromLiquidity({
            poolInfo,
            tickLower,
            tickUpper,
            liquidity,
            slippage,
            add,
            token2022Infos,
            epochInfo,
            amountAddFee: !amountHasFee,
        });
    }
    static getAmountsFromLiquidity({ poolInfo, tickLower, tickUpper, liquidity, slippage, add, token2022Infos, epochInfo, amountAddFee, }) {
        var _a, _b, _c, _d;
        const sqrtPriceX64A = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tickLower);
        const sqrtPriceX64B = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tickUpper);
        const coefficientRe = add ? 1 + slippage : 1 - slippage;
        const amounts = math_1.LiquidityMath.getAmountsFromLiquidity(poolInfo.sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, add);
        const [amountA, amountB] = [
            (0, base_1.getTransferAmountFee)(amounts.amountA, (_a = token2022Infos[poolInfo.mintA.mint.toString()]) === null || _a === void 0 ? void 0 : _a.feeConfig, epochInfo, amountAddFee),
            (0, base_1.getTransferAmountFee)(amounts.amountB, (_b = token2022Infos[poolInfo.mintB.mint.toString()]) === null || _b === void 0 ? void 0 : _b.feeConfig, epochInfo, amountAddFee),
        ];
        const [amountSlippageA, amountSlippageB] = [
            (0, base_1.getTransferAmountFee)(new bn_js_1.default(new decimal_js_1.default(amounts.amountA.toString()).mul(coefficientRe).toFixed(0)), (_c = token2022Infos[poolInfo.mintA.mint.toString()]) === null || _c === void 0 ? void 0 : _c.feeConfig, epochInfo, amountAddFee),
            (0, base_1.getTransferAmountFee)(new bn_js_1.default(new decimal_js_1.default(amounts.amountB.toString()).mul(coefficientRe).toFixed(0)), (_d = token2022Infos[poolInfo.mintB.mint.toString()]) === null || _d === void 0 ? void 0 : _d.feeConfig, epochInfo, amountAddFee),
        ];
        return {
            liquidity,
            amountA,
            amountB,
            amountSlippageA,
            amountSlippageB,
            expirationTime: (0, base_1.minExpirationTime)(amountA.expirationTime, amountB.expirationTime),
        };
    }
    static getPriceAndTick({ poolInfo, price, baseIn, }) {
        const _price = baseIn ? price : new decimal_js_1.default(1).div(price);
        const tick = math_1.TickMath.getTickWithPriceAndTickspacing(_price, poolInfo.ammConfig.tickSpacing, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        const tickSqrtPriceX64 = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tick);
        const tickPrice = math_1.SqrtPriceMath.sqrtPriceX64ToPrice(tickSqrtPriceX64, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        return baseIn ? { tick, price: tickPrice } : { tick, price: new decimal_js_1.default(1).div(tickPrice) };
    }
    static getTickPrice({ poolInfo, tick, baseIn, }) {
        const tickSqrtPriceX64 = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(tick);
        const tickPrice = math_1.SqrtPriceMath.sqrtPriceX64ToPrice(tickSqrtPriceX64, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        return baseIn
            ? { tick, price: tickPrice, tickSqrtPriceX64 }
            : { tick, price: new decimal_js_1.default(1).div(tickPrice), tickSqrtPriceX64 };
    }
    static computeAmountOutFormat({ poolInfo, tickArrayCache, token2022Infos, epochInfo, amountIn, currencyOut, slippage, catchLiquidityInsufficient = false, }) {
        const amountInIsTokenAmount = amountIn instanceof entity_1.TokenAmount;
        const inputMint = (amountInIsTokenAmount ? amountIn.token : entity_1.Token.WSOL).mint;
        const _amountIn = amountIn.raw;
        const _slippage = slippage.numerator.toNumber() / slippage.denominator.toNumber();
        const { allTrade, realAmountIn: _realAmountIn, amountOut: _amountOut, minAmountOut: _minAmountOut, expirationTime, currentPrice, executionPrice, priceImpact, fee, remainingAccounts, executionPriceX64, } = this.computeAmountOut({
            poolInfo,
            tickArrayCache,
            baseMint: inputMint,
            amountIn: _amountIn,
            slippage: _slippage,
            token2022Infos,
            epochInfo,
            catchLiquidityInsufficient,
        });
        const realAmountIn = Object.assign(Object.assign({}, _realAmountIn), { amount: amountInIsTokenAmount
                ? new entity_1.TokenAmount(amountIn.token, _realAmountIn.amount)
                : new entity_1.CurrencyAmount(entity_1.Currency.SOL, _realAmountIn.amount), fee: _realAmountIn.fee === undefined
                ? undefined
                : amountInIsTokenAmount
                    ? new entity_1.TokenAmount(amountIn.token, _realAmountIn.fee)
                    : new entity_1.CurrencyAmount(entity_1.Currency.SOL, _realAmountIn.fee) });
        const amountOut = Object.assign(Object.assign({}, _amountOut), { amount: currencyOut instanceof entity_1.Token
                ? new entity_1.TokenAmount(currencyOut, _amountOut.amount)
                : new entity_1.CurrencyAmount(currencyOut, _amountOut.amount), fee: _amountOut.fee === undefined
                ? undefined
                : currencyOut instanceof entity_1.Token
                    ? new entity_1.TokenAmount(currencyOut, _amountOut.fee)
                    : new entity_1.CurrencyAmount(currencyOut, _amountOut.fee) });
        const minAmountOut = Object.assign(Object.assign({}, _minAmountOut), { amount: currencyOut instanceof entity_1.Token
                ? new entity_1.TokenAmount(currencyOut, _minAmountOut.amount)
                : new entity_1.CurrencyAmount(currencyOut, _minAmountOut.amount), fee: _minAmountOut.fee === undefined
                ? undefined
                : currencyOut instanceof entity_1.Token
                    ? new entity_1.TokenAmount(currencyOut, _minAmountOut.fee)
                    : new entity_1.CurrencyAmount(currencyOut, _minAmountOut.fee) });
        const _currentPrice = new entity_1.Price(amountInIsTokenAmount ? amountIn.token : amountIn.currency, new bn_js_1.default(10).pow(new bn_js_1.default(20 + (amountInIsTokenAmount ? amountIn.token : amountIn.currency).decimals)), currencyOut instanceof entity_1.Token ? currencyOut : entity_1.Token.WSOL, currentPrice
            .mul(new decimal_js_1.default(10 ** (20 + (currencyOut instanceof entity_1.Token ? currencyOut : entity_1.Token.WSOL).decimals)))
            .toFixed(0));
        const _executionPrice = new entity_1.Price(amountInIsTokenAmount ? amountIn.token : amountIn.currency, new bn_js_1.default(10).pow(new bn_js_1.default(20 + (amountInIsTokenAmount ? amountIn.token : amountIn.currency).decimals)), currencyOut instanceof entity_1.Token ? currencyOut : entity_1.Token.WSOL, executionPrice
            .mul(new decimal_js_1.default(10 ** (20 + (currencyOut instanceof entity_1.Token ? currencyOut : entity_1.Token.WSOL).decimals)))
            .toFixed(0));
        const _fee = amountInIsTokenAmount
            ? new entity_1.TokenAmount(amountIn.token, fee)
            : new entity_1.CurrencyAmount(amountIn.currency, fee);
        return {
            allTrade,
            realAmountIn,
            amountOut,
            minAmountOut,
            expirationTime,
            currentPrice: _currentPrice,
            executionPrice: _executionPrice,
            priceImpact,
            fee: _fee,
            remainingAccounts,
            executionPriceX64,
        };
    }
    static computeAmountOutAndCheckToken({ connection, poolInfo, tickArrayCache, baseMint, amountIn, slippage, priceLimit = new decimal_js_1.default(0), catchLiquidityInsufficient = false, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const epochInfo = yield connection.getEpochInfo();
            const token2022Infos = yield (0, base_1.fetchMultipleMintInfos)({
                connection,
                mints: [poolInfo.mintA, poolInfo.mintB]
                    .filter((i) => i.programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID))
                    .map((i) => i.mint),
            });
            return this.computeAmountOut({
                poolInfo,
                tickArrayCache,
                baseMint,
                amountIn,
                slippage,
                priceLimit,
                token2022Infos,
                epochInfo,
                catchLiquidityInsufficient,
            });
        });
    }
    static computeAmountOut({ poolInfo, tickArrayCache, baseMint, token2022Infos, epochInfo, amountIn, slippage, priceLimit = new decimal_js_1.default(0), catchLiquidityInsufficient = false, }) {
        var _a, _b, _c, _d, _e;
        let sqrtPriceLimitX64;
        if (priceLimit.equals(new decimal_js_1.default(0))) {
            sqrtPriceLimitX64 = baseMint.equals(poolInfo.mintA.mint)
                ? constants_1.MIN_SQRT_PRICE_X64.add(entity_1.ONE)
                : constants_1.MAX_SQRT_PRICE_X64.sub(entity_1.ONE);
        }
        else {
            sqrtPriceLimitX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(priceLimit, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        }
        const _inputRealAmountIn = (0, base_1.getTransferAmountFee)(amountIn, (_a = token2022Infos[baseMint.toString()]) === null || _a === void 0 ? void 0 : _a.feeConfig, epochInfo, false);
        const { allTrade, realTradeAmountIn, expectedAmountOut: _expectedAmountOut, remainingAccounts, executionPrice: _executionPriceX64, feeAmount, } = pool_1.PoolUtils.getOutputAmountAndRemainAccounts(poolInfo, tickArrayCache, baseMint, _inputRealAmountIn.amount.sub((_b = _inputRealAmountIn.fee) !== null && _b !== void 0 ? _b : entity_1.ZERO), sqrtPriceLimitX64, catchLiquidityInsufficient);
        const realAmountIn = (0, base_1.getTransferAmountFee)(realTradeAmountIn, (_c = token2022Infos[baseMint.toString()]) === null || _c === void 0 ? void 0 : _c.feeConfig, epochInfo, true);
        const outMint = poolInfo.mintA.mint.equals(baseMint) ? poolInfo.mintB.mint : poolInfo.mintA.mint;
        const amountOut = (0, base_1.getTransferAmountFee)(_expectedAmountOut, (_d = token2022Infos[outMint.toString()]) === null || _d === void 0 ? void 0 : _d.feeConfig, epochInfo, false);
        const _executionPrice = math_1.SqrtPriceMath.sqrtPriceX64ToPrice(_executionPriceX64, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        const executionPrice = baseMint.equals(poolInfo.mintA.mint) ? _executionPrice : new decimal_js_1.default(1).div(_executionPrice);
        const _minAmountOut = _expectedAmountOut
            .mul(new bn_js_1.default(Math.floor((1 - slippage) * 10000000000)))
            .div(new bn_js_1.default(10000000000));
        const minAmountOut = (0, base_1.getTransferAmountFee)(_minAmountOut, (_e = token2022Infos[outMint.toString()]) === null || _e === void 0 ? void 0 : _e.feeConfig, epochInfo, false);
        const poolPrice = poolInfo.mintA.mint.equals(baseMint)
            ? poolInfo.currentPrice
            : new decimal_js_1.default(1).div(poolInfo.currentPrice);
        const _numerator = new decimal_js_1.default(executionPrice).sub(poolPrice).abs();
        const _denominator = poolPrice;
        const priceImpact = new entity_1.Percent(new decimal_js_1.default(_numerator).mul(10 ** 15).toFixed(0), new decimal_js_1.default(_denominator).mul(10 ** 15).toFixed(0));
        return {
            allTrade,
            realAmountIn,
            amountOut,
            minAmountOut,
            expirationTime: (0, base_1.minExpirationTime)(realAmountIn.expirationTime, amountOut.expirationTime),
            currentPrice: poolInfo.currentPrice,
            executionPrice,
            priceImpact,
            fee: feeAmount,
            remainingAccounts,
            executionPriceX64: _executionPriceX64,
        };
    }
    static computeAmountInAndCheckToken({ connection, poolInfo, tickArrayCache, baseMint, amountOut, slippage, priceLimit = new decimal_js_1.default(0), }) {
        return __awaiter(this, void 0, void 0, function* () {
            const epochInfo = yield connection.getEpochInfo();
            const token2022Infos = yield (0, base_1.fetchMultipleMintInfos)({
                connection,
                mints: [poolInfo.mintA, poolInfo.mintB]
                    .filter((i) => i.programId.equals(spl_token_1.TOKEN_2022_PROGRAM_ID))
                    .map((i) => i.mint),
            });
            return this.computeAmountIn({
                poolInfo,
                tickArrayCache,
                baseMint,
                amountOut,
                slippage,
                priceLimit,
                token2022Infos,
                epochInfo,
            });
        });
    }
    static computeAmountIn({ poolInfo, tickArrayCache, baseMint, token2022Infos, epochInfo, amountOut, slippage, priceLimit = new decimal_js_1.default(0), }) {
        var _a, _b, _c, _d;
        let sqrtPriceLimitX64;
        if (priceLimit.equals(new decimal_js_1.default(0))) {
            sqrtPriceLimitX64 = baseMint.equals(poolInfo.mintB.mint)
                ? constants_1.MIN_SQRT_PRICE_X64.add(entity_1.ONE)
                : constants_1.MAX_SQRT_PRICE_X64.sub(entity_1.ONE);
        }
        else {
            sqrtPriceLimitX64 = math_1.SqrtPriceMath.priceToSqrtPriceX64(priceLimit, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        }
        const realAmountOut = (0, base_1.getTransferAmountFee)(amountOut, (_a = token2022Infos[baseMint.toString()]) === null || _a === void 0 ? void 0 : _a.feeConfig, epochInfo, true);
        const { expectedAmountIn: _expectedAmountIn, remainingAccounts, executionPrice: _executionPriceX64, feeAmount, } = pool_1.PoolUtils.getInputAmountAndRemainAccounts(poolInfo, tickArrayCache, baseMint, realAmountOut.amount.sub((_b = realAmountOut.fee) !== null && _b !== void 0 ? _b : entity_1.ZERO), sqrtPriceLimitX64);
        const inMint = poolInfo.mintA.mint.equals(baseMint) ? poolInfo.mintB.mint : poolInfo.mintA.mint;
        const amountIn = (0, base_1.getTransferAmountFee)(_expectedAmountIn, (_c = token2022Infos[inMint.toString()]) === null || _c === void 0 ? void 0 : _c.feeConfig, epochInfo, true);
        const _executionPrice = math_1.SqrtPriceMath.sqrtPriceX64ToPrice(_executionPriceX64, poolInfo.mintA.decimals, poolInfo.mintB.decimals);
        const executionPrice = baseMint.equals(poolInfo.mintA.mint) ? _executionPrice : new decimal_js_1.default(1).div(_executionPrice);
        const _maxAmountIn = _expectedAmountIn
            .mul(new bn_js_1.default(Math.floor((1 + slippage) * 10000000000)))
            .div(new bn_js_1.default(10000000000));
        const maxAmountIn = (0, base_1.getTransferAmountFee)(_maxAmountIn, (_d = token2022Infos[inMint.toString()]) === null || _d === void 0 ? void 0 : _d.feeConfig, epochInfo, true);
        const poolPrice = poolInfo.mintA.mint.equals(baseMint)
            ? poolInfo.currentPrice
            : new decimal_js_1.default(1).div(poolInfo.currentPrice);
        const _numerator = new decimal_js_1.default(executionPrice).sub(poolPrice).abs();
        const _denominator = poolPrice;
        const priceImpact = new entity_1.Percent(new decimal_js_1.default(_numerator).mul(10 ** 15).toFixed(0), new decimal_js_1.default(_denominator).mul(10 ** 15).toFixed(0));
        return {
            amountIn,
            maxAmountIn,
            realAmountOut,
            expirationTime: (0, base_1.minExpirationTime)(amountIn.expirationTime, realAmountOut.expirationTime),
            currentPrice: poolInfo.currentPrice,
            executionPrice,
            priceImpact,
            fee: feeAmount,
            remainingAccounts,
        };
    }
    static estimateAprsForPriceRangeMultiplier({ poolInfo, aprType, positionTickLowerIndex, positionTickUpperIndex, }) {
        const aprInfo = poolInfo[aprType];
        const priceLower = this.getTickPrice({ poolInfo, tick: positionTickLowerIndex, baseIn: true }).price.toNumber();
        const priceUpper = this.getTickPrice({ poolInfo, tick: positionTickUpperIndex, baseIn: true }).price.toNumber();
        const _minPrice = Math.max(priceLower, aprInfo.priceMin);
        const _maxPrice = Math.min(priceUpper, aprInfo.priceMax);
        const sub = _maxPrice - _minPrice;
        const userRange = priceUpper - priceLower;
        const tradeRange = aprInfo.priceMax - aprInfo.priceMin;
        let p;
        if (sub <= 0)
            p = 0;
        else if (userRange === sub)
            p = tradeRange / sub;
        else if (tradeRange === sub)
            p = sub / userRange;
        else
            p = (sub / tradeRange) * (sub / userRange);
        return {
            feeApr: aprInfo.feeApr * p,
            rewardsApr: [aprInfo.rewardApr.A * p, aprInfo.rewardApr.B * p, aprInfo.rewardApr.C * p],
            apr: aprInfo.apr * p,
        };
    }
    static estimateAprsForPriceRangeDelta({ poolInfo, aprType, mintPrice, rewardMintDecimals, liquidity, positionTickLowerIndex, positionTickUpperIndex, chainTime, }) {
        const aprTypeDay = aprType === 'day' ? 1 : aprType === 'week' ? 7 : aprType === 'month' ? 30 : 0;
        const aprInfo = poolInfo[aprType];
        const mintPriceA = mintPrice[poolInfo.mintA.mint.toString()];
        const mintPriceB = mintPrice[poolInfo.mintB.mint.toString()];
        const mintDecimalsA = poolInfo.mintA.decimals;
        const mintDecimalsB = poolInfo.mintB.decimals;
        if (!aprInfo || !mintPriceA || !mintPriceB)
            return { feeApr: 0, rewardsApr: [0, 0, 0], apr: 0 };
        const sqrtPriceX64A = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(positionTickLowerIndex);
        const sqrtPriceX64B = math_1.SqrtPriceMath.getSqrtPriceX64FromTick(positionTickUpperIndex);
        const { amountSlippageA: poolLiquidityA, amountSlippageB: poolLiquidityB } = math_1.LiquidityMath.getAmountsFromLiquidityWithSlippage(poolInfo.sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, poolInfo.liquidity, false, false, 0);
        const { amountSlippageA: userLiquidityA, amountSlippageB: userLiquidityB } = math_1.LiquidityMath.getAmountsFromLiquidityWithSlippage(poolInfo.sqrtPriceX64, sqrtPriceX64A, sqrtPriceX64B, liquidity, false, false, 0);
        const poolTvl = new decimal_js_1.default(poolLiquidityA.toString())
            .div(new decimal_js_1.default(10).pow(mintDecimalsA))
            .mul(mintPriceA.toFixed(mintDecimalsA))
            .add(new decimal_js_1.default(poolLiquidityB.toString())
            .div(new decimal_js_1.default(10).pow(mintDecimalsB))
            .mul(mintPriceB.toFixed(mintDecimalsB)));
        const userTvl = new decimal_js_1.default(userLiquidityA.toString())
            .div(new decimal_js_1.default(10).pow(mintDecimalsA))
            .mul(mintPriceA.toFixed(mintDecimalsA))
            .add(new decimal_js_1.default(userLiquidityB.toString())
            .div(new decimal_js_1.default(10).pow(mintDecimalsB))
            .mul(mintPriceB.toFixed(mintDecimalsB)));
        const p = userTvl.div(poolTvl.add(userTvl)).div(userTvl);
        const feesPerYear = new decimal_js_1.default(aprInfo.volumeFee).mul(365).div(aprTypeDay);
        const feeApr = feesPerYear.mul(p).mul(100).toNumber();
        const SECONDS_PER_YEAR = 3600 * 24 * 365;
        const rewardsApr = poolInfo.rewardInfos.map((i) => {
            const iDecimal = rewardMintDecimals[i.tokenMint.toString()];
            const iPrice = mintPrice[i.tokenMint.toString()];
            if (chainTime < i.openTime.toNumber() ||
                chainTime > i.endTime.toNumber() ||
                i.perSecond.equals(0) ||
                !iPrice ||
                iDecimal === undefined)
                return 0;
            return new decimal_js_1.default(iPrice.toFixed(iDecimal))
                .mul(i.perSecond.mul(SECONDS_PER_YEAR))
                .div(new decimal_js_1.default(10).pow(iDecimal))
                .mul(p)
                .mul(100)
                .toNumber();
        });
        return {
            feeApr,
            rewardsApr,
            apr: feeApr + rewardsApr.reduce((a, b) => a + b, 0),
        };
    }
    // fetch data
    static fetchMultiplePoolInfos({ connection, poolKeys, ownerInfo, chainTime, batchRequest = false, updateOwnerRewardAndFee = true, }) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const poolAccountInfos = yield (0, common_1.getMultipleAccountsInfo)(connection, poolKeys.map((i) => new web3_js_1.PublicKey(i.id)), { batchRequest });
            const exBitmapAddress = {};
            for (let index = 0; index < poolKeys.length; index++) {
                const apiPoolInfo = poolKeys[index];
                const accountInfo = poolAccountInfos[index];
                if (accountInfo === null)
                    continue;
                exBitmapAddress[apiPoolInfo.id] = (0, pda_2.getPdaExBitmapAccount)(accountInfo.owner, new web3_js_1.PublicKey(apiPoolInfo.id)).publicKey;
            }
            const exBitmapAccountInfos = yield this.fetchExBitmaps({
                connection,
                exBitmapAddress: Object.values(exBitmapAddress),
                batchRequest,
            });
            const programIds = [];
            const poolsInfo = {};
            const updateRewardInfos = [];
            for (let index = 0; index < poolKeys.length; index++) {
                const apiPoolInfo = poolKeys[index];
                const accountInfo = poolAccountInfos[index];
                const exBitmapInfo = exBitmapAccountInfos[exBitmapAddress[apiPoolInfo.id].toString()];
                if (accountInfo === null)
                    continue;
                const layoutAccountInfo = layout_1.PoolInfoLayout.decode(accountInfo.data);
                poolsInfo[apiPoolInfo.id] = {
                    state: {
                        id: new web3_js_1.PublicKey(apiPoolInfo.id),
                        mintA: {
                            programId: new web3_js_1.PublicKey(apiPoolInfo.mintProgramIdA),
                            mint: layoutAccountInfo.mintA,
                            vault: layoutAccountInfo.vaultA,
                            decimals: layoutAccountInfo.mintDecimalsA,
                        },
                        mintB: {
                            programId: new web3_js_1.PublicKey(apiPoolInfo.mintProgramIdB),
                            mint: layoutAccountInfo.mintB,
                            vault: layoutAccountInfo.vaultB,
                            decimals: layoutAccountInfo.mintDecimalsB,
                        },
                        observationId: layoutAccountInfo.observationId,
                        ammConfig: Object.assign(Object.assign({}, apiPoolInfo.ammConfig), { id: new web3_js_1.PublicKey(apiPoolInfo.ammConfig.id) }),
                        creator: layoutAccountInfo.creator,
                        programId: accountInfo.owner,
                        version: 6,
                        tickSpacing: layoutAccountInfo.tickSpacing,
                        liquidity: layoutAccountInfo.liquidity,
                        sqrtPriceX64: layoutAccountInfo.sqrtPriceX64,
                        currentPrice: math_1.SqrtPriceMath.sqrtPriceX64ToPrice(layoutAccountInfo.sqrtPriceX64, layoutAccountInfo.mintDecimalsA, layoutAccountInfo.mintDecimalsB),
                        tickCurrent: layoutAccountInfo.tickCurrent,
                        observationIndex: layoutAccountInfo.observationIndex,
                        observationUpdateDuration: layoutAccountInfo.observationUpdateDuration,
                        feeGrowthGlobalX64A: layoutAccountInfo.feeGrowthGlobalX64A,
                        feeGrowthGlobalX64B: layoutAccountInfo.feeGrowthGlobalX64B,
                        protocolFeesTokenA: layoutAccountInfo.protocolFeesTokenA,
                        protocolFeesTokenB: layoutAccountInfo.protocolFeesTokenB,
                        swapInAmountTokenA: layoutAccountInfo.swapInAmountTokenA,
                        swapOutAmountTokenB: layoutAccountInfo.swapOutAmountTokenB,
                        swapInAmountTokenB: layoutAccountInfo.swapInAmountTokenB,
                        swapOutAmountTokenA: layoutAccountInfo.swapOutAmountTokenA,
                        tickArrayBitmap: layoutAccountInfo.tickArrayBitmap,
                        rewardInfos: yield pool_1.PoolUtils.updatePoolRewardInfos({
                            connection,
                            apiPoolInfo,
                            chainTime,
                            poolLiquidity: layoutAccountInfo.liquidity,
                            rewardInfos: layoutAccountInfo.rewardInfos.filter((i) => !i.tokenMint.equals(web3_js_1.PublicKey.default)),
                        }),
                        day: apiPoolInfo.day,
                        week: apiPoolInfo.week,
                        month: apiPoolInfo.month,
                        tvl: apiPoolInfo.tvl,
                        lookupTableAccount: apiPoolInfo.lookupTableAccount
                            ? new web3_js_1.PublicKey(apiPoolInfo.lookupTableAccount)
                            : web3_js_1.PublicKey.default,
                        startTime: layoutAccountInfo.startTime.toNumber(),
                        exBitmapInfo,
                    },
                };
                if (ownerInfo) {
                    updateRewardInfos.push(...poolsInfo[apiPoolInfo.id].state.rewardInfos.filter((i) => i.creator.equals(ownerInfo.wallet)));
                }
                if (!programIds.find((i) => i.equals(accountInfo.owner)))
                    programIds.push(accountInfo.owner);
            }
            if (ownerInfo) {
                const allMint = ownerInfo.tokenAccounts
                    .filter((i) => i.accountInfo.amount.eq(new bn_js_1.default(1)))
                    .map((i) => i.accountInfo.mint);
                const allPositionKey = [];
                for (const itemMint of allMint) {
                    for (const itemProgramId of programIds) {
                        allPositionKey.push((0, pda_2.getPdaPersonalPositionAddress)(itemProgramId, itemMint).publicKey);
                    }
                }
                const positionAccountInfos = yield (0, common_1.getMultipleAccountsInfo)(connection, allPositionKey, { batchRequest });
                const keyToTickArrayAddress = {};
                for (const itemAccountInfo of positionAccountInfos) {
                    if (itemAccountInfo === null)
                        continue;
                    const position = layout_1.PositionInfoLayout.decode(itemAccountInfo.data);
                    const itemPoolId = position.poolId.toString();
                    const poolInfoA = poolsInfo[itemPoolId];
                    if (poolInfoA === undefined)
                        continue;
                    const poolInfo = poolInfoA.state;
                    const priceLower = this.getTickPrice({
                        poolInfo,
                        tick: position.tickLower,
                        baseIn: true,
                    });
                    const priceUpper = this.getTickPrice({
                        poolInfo,
                        tick: position.tickUpper,
                        baseIn: true,
                    });
                    const { amountA, amountB } = math_1.LiquidityMath.getAmountsFromLiquidity(poolInfo.sqrtPriceX64, priceLower.tickSqrtPriceX64, priceUpper.tickSqrtPriceX64, position.liquidity, false);
                    const leverage = 1 / (1 - Math.sqrt(Math.sqrt(priceLower.price.div(priceUpper.price).toNumber())));
                    poolsInfo[itemPoolId].positionAccount = [
                        ...((_a = poolsInfo[itemPoolId].positionAccount) !== null && _a !== void 0 ? _a : []),
                        {
                            poolId: position.poolId,
                            nftMint: position.nftMint,
                            priceLower: priceLower.price,
                            priceUpper: priceUpper.price,
                            amountA,
                            amountB,
                            tickLower: position.tickLower,
                            tickUpper: position.tickUpper,
                            liquidity: position.liquidity,
                            feeGrowthInsideLastX64A: position.feeGrowthInsideLastX64A,
                            feeGrowthInsideLastX64B: position.feeGrowthInsideLastX64B,
                            tokenFeesOwedA: position.tokenFeesOwedA,
                            tokenFeesOwedB: position.tokenFeesOwedB,
                            rewardInfos: position.rewardInfos.map((i) => (Object.assign(Object.assign({}, i), { pendingReward: new bn_js_1.default(0) }))),
                            leverage,
                            tokenFeeAmountA: new bn_js_1.default(0),
                            tokenFeeAmountB: new bn_js_1.default(0),
                        },
                    ];
                    const tickArrayLowerAddress = tick_1.TickUtils.getTickArrayAddressByTick(poolsInfo[itemPoolId].state.programId, position.poolId, position.tickLower, poolsInfo[itemPoolId].state.tickSpacing);
                    const tickArrayUpperAddress = tick_1.TickUtils.getTickArrayAddressByTick(poolsInfo[itemPoolId].state.programId, position.poolId, position.tickUpper, poolsInfo[itemPoolId].state.tickSpacing);
                    keyToTickArrayAddress[`${poolsInfo[itemPoolId].state.programId.toString()}-${position.poolId.toString()}-${position.tickLower}`] = tickArrayLowerAddress;
                    keyToTickArrayAddress[`${poolsInfo[itemPoolId].state.programId.toString()}-${position.poolId.toString()}-${position.tickUpper}`] = tickArrayUpperAddress;
                }
                if (updateOwnerRewardAndFee) {
                    const tickArrayKeys = Object.values(keyToTickArrayAddress);
                    const tickArrayDatas = yield (0, common_1.getMultipleAccountsInfo)(connection, tickArrayKeys, { batchRequest });
                    const tickArrayLayout = {};
                    for (let index = 0; index < tickArrayKeys.length; index++) {
                        const tickArrayData = tickArrayDatas[index];
                        if (tickArrayData === null)
                            continue;
                        const key = tickArrayKeys[index];
                        tickArrayLayout[key.toString()] = Object.assign({ address: key }, layout_1.TickArrayLayout.decode(tickArrayData.data));
                    }
                    for (const { state, positionAccount } of Object.values(poolsInfo)) {
                        if (!positionAccount)
                            continue;
                        for (const itemPA of positionAccount) {
                            const keyLower = `${state.programId.toString()}-${state.id.toString()}-${itemPA.tickLower}`;
                            const keyUpper = `${state.programId.toString()}-${state.id.toString()}-${itemPA.tickUpper}`;
                            const tickArrayLower = tickArrayLayout[keyToTickArrayAddress[keyLower].toString()];
                            const tickArrayUpper = tickArrayLayout[keyToTickArrayAddress[keyUpper].toString()];
                            const tickLowerState = tickArrayLower.ticks[tick_1.TickUtils.getTickOffsetInArray(itemPA.tickLower, state.tickSpacing)];
                            const tickUpperState = tickArrayUpper.ticks[tick_1.TickUtils.getTickOffsetInArray(itemPA.tickUpper, state.tickSpacing)];
                            const { tokenFeeAmountA, tokenFeeAmountB } = position_1.PositionUtils.GetPositionFees(state, itemPA, tickLowerState, tickUpperState);
                            const rewardInfos = position_1.PositionUtils.GetPositionRewards(state, itemPA, tickLowerState, tickUpperState);
                            itemPA.tokenFeeAmountA =
                                tokenFeeAmountA.gte(entity_1.ZERO) && tokenFeeAmountA.lt(constants_1.U64_IGNORE_RANGE) ? tokenFeeAmountA : entity_1.ZERO;
                            itemPA.tokenFeeAmountB =
                                tokenFeeAmountB.gte(entity_1.ZERO) && tokenFeeAmountA.lt(constants_1.U64_IGNORE_RANGE) ? tokenFeeAmountB : entity_1.ZERO;
                            for (let i = 0; i < rewardInfos.length; i++) {
                                itemPA.rewardInfos[i].pendingReward =
                                    rewardInfos[i].gte(entity_1.ZERO) && rewardInfos[i].lt(constants_1.U64_IGNORE_RANGE) ? rewardInfos[i] : entity_1.ZERO;
                            }
                        }
                    }
                }
            }
            if (updateRewardInfos.length > 0) {
                const vaults = updateRewardInfos.map((i) => i.tokenVault);
                const rewardVaultInfos = yield (0, common_1.getMultipleAccountsInfo)(connection, vaults, { batchRequest });
                const rewardVaultAmount = {};
                for (let index = 0; index < vaults.length; index++) {
                    const valutKey = vaults[index].toString();
                    const itemRewardVaultInfo = rewardVaultInfos[index];
                    if (itemRewardVaultInfo === null)
                        continue;
                    const info = spl_1.SPL_ACCOUNT_LAYOUT.decode(itemRewardVaultInfo.data);
                    rewardVaultAmount[valutKey] = info.amount;
                }
                for (const item of updateRewardInfos) {
                    const vaultAmount = rewardVaultAmount[item.tokenVault.toString()];
                    item.remainingRewards =
                        vaultAmount !== undefined ? vaultAmount.sub(item.rewardTotalEmissioned.sub(item.rewardClaimed)) : entity_1.ZERO;
                }
            }
            return poolsInfo;
        });
    }
    static fetchMultiplePoolTickArrays({ connection, poolKeys, batchRequest, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const tickArraysToPoolId = {};
            const tickArrays = [];
            for (const itemPoolInfo of poolKeys) {
                const currentTickArrayStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(itemPoolInfo.tickCurrent, itemPoolInfo.tickSpacing);
                const startIndexArray = tick_1.TickUtils.getInitializedTickArrayInRange(itemPoolInfo.tickArrayBitmap, itemPoolInfo.exBitmapInfo, itemPoolInfo.tickSpacing, currentTickArrayStartIndex, 7);
                for (const itemIndex of startIndexArray) {
                    const { publicKey: tickArrayAddress } = (0, pda_2.getPdaTickArrayAddress)(itemPoolInfo.programId, itemPoolInfo.id, itemIndex);
                    tickArrays.push({ pubkey: tickArrayAddress });
                    tickArraysToPoolId[tickArrayAddress.toString()] = itemPoolInfo.id;
                }
            }
            const fetchedTickArrays = yield (0, common_1.getMultipleAccountsInfoWithCustomFlags)(connection, tickArrays, { batchRequest });
            const tickArrayCache = {};
            for (const itemAccountInfo of fetchedTickArrays) {
                if (!itemAccountInfo.accountInfo)
                    continue;
                const poolId = tickArraysToPoolId[itemAccountInfo.pubkey.toString()];
                if (!poolId)
                    continue;
                if (tickArrayCache[poolId.toString()] === undefined)
                    tickArrayCache[poolId.toString()] = {};
                const accountLayoutData = layout_1.TickArrayLayout.decode(itemAccountInfo.accountInfo.data);
                tickArrayCache[poolId.toString()][accountLayoutData.startTickIndex] = Object.assign(Object.assign({}, accountLayoutData), { address: itemAccountInfo.pubkey });
            }
            return tickArrayCache;
        });
    }
    static fetchExBitmaps({ connection, exBitmapAddress, batchRequest, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const fetchedBitmapAccount = yield (0, common_1.getMultipleAccountsInfoWithCustomFlags)(connection, exBitmapAddress.map((i) => ({ pubkey: i })), { batchRequest });
            const returnTypeFetchExBitmaps = {};
            for (const item of fetchedBitmapAccount) {
                if (item.accountInfo === null)
                    continue;
                returnTypeFetchExBitmaps[item.pubkey.toString()] = layout_1.TickArrayBitmapExtensionLayout.decode(item.accountInfo.data);
            }
            return returnTypeFetchExBitmaps;
        });
    }
    static getWhiteListMint({ connection, programId }) {
        return __awaiter(this, void 0, void 0, function* () {
            const accountInfo = yield connection.getAccountInfo((0, pda_2.getPdaOperationAccount)(programId).publicKey);
            if (!accountInfo)
                return [];
            const whitelistMintsInfo = layout_1.OperationLayout.decode(accountInfo.data);
            return whitelistMintsInfo.whitelistMints.filter((i) => !i.equals(web3_js_1.PublicKey.default));
        });
    }
}
exports.Clmm = Clmm;
//# sourceMappingURL=clmm.js.map