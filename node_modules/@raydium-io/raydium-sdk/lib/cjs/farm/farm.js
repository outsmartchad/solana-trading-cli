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
exports.Farm = exports.poolTypeV6 = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const base_1 = require("../base");
const pda_1 = require("../base/pda");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
const spl_1 = require("../spl");
const token_1 = require("../token");
const importInstruction_1 = require("./importInstruction");
const layout_1 = require("./layout");
const pda_2 = require("./pda");
const logger = common_1.Logger.from('Farm');
exports.poolTypeV6 = { 'Standard SPL': 0, 'Option tokens': 1 };
class Farm extends base_1.Base {
    /* ================= get layout ================= */
    static getStateLayout(version) {
        const STATE_LAYOUT = layout_1.FARM_VERSION_TO_STATE_LAYOUT[version];
        logger.assertArgument(!!STATE_LAYOUT, 'invalid version', 'version', version);
        return STATE_LAYOUT;
    }
    static getLedgerLayout(version) {
        const LEDGER_LAYOUT = layout_1.FARM_VERSION_TO_LEDGER_LAYOUT[version];
        logger.assertArgument(!!LEDGER_LAYOUT, 'invalid version', 'version', version);
        return LEDGER_LAYOUT;
    }
    static getLayouts(version) {
        return { state: this.getStateLayout(version), ledger: this.getLedgerLayout(version) };
    }
    /* ================= get key ================= */
    static getAssociatedAuthority({ programId, poolId }) {
        return (0, common_1.findProgramAddress)([poolId.toBuffer()], programId);
    }
    static getAssociatedLedgerAccount({ programId, poolId, owner, version, }) {
        const { publicKey } = (0, common_1.findProgramAddress)([
            poolId.toBuffer(),
            owner.toBuffer(),
            Buffer.from(version === 6 ? 'farmer_info_associated_seed' : 'staker_info_v2_associated_seed', 'utf-8'),
        ], programId);
        return publicKey;
    }
    static getAssociatedLedgerPoolAccount({ programId, poolId, mint, type, }) {
        const { publicKey } = (0, common_1.findProgramAddress)([
            poolId.toBuffer(),
            mint.toBuffer(),
            Buffer.from(type === 'lpVault'
                ? 'lp_vault_associated_seed'
                : type === 'rewardVault'
                    ? 'reward_vault_associated_seed'
                    : '', 'utf-8'),
        ], programId);
        return publicKey;
    }
    /* ================= make instruction and transaction ================= */
    static makeDepositInstruction(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 3) {
            return this.makeDepositInstructionV3(params);
        }
        else if (version === 5) {
            return this.makeDepositInstructionV5(params);
        }
        else if (version === 6) {
            return this.makeDepositInstructionV6(params);
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeDepositInstructionV3({ poolKeys, userKeys, amount }) {
        logger.assertArgument(poolKeys.rewardInfos.length === 1, 'lengths not equal 1', 'poolKeys.rewardInfos', poolKeys.rewardInfos);
        logger.assertArgument(userKeys.rewardTokenAccounts.length === 1, 'lengths not equal 1', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 10,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[0], false),
            (0, common_1.AccountMeta)(poolKeys.rewardInfos[0].rewardVault, false),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_CLOCK_PUBKEY, false),
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        ];
        if (userKeys.auxiliaryLedgers) {
            for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
                keys.push((0, common_1.AccountMeta)(auxiliaryLedger, false));
            }
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV3Deposit],
            },
        };
    }
    static makeDepositInstructionV5({ poolKeys, userKeys, amount }) {
        logger.assertArgument(userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length, 'lengths not equal with poolKeys.rewardInfos', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 11,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[0], false),
            (0, common_1.AccountMeta)(poolKeys.rewardInfos[0].rewardVault, false),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_CLOCK_PUBKEY, false),
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        ];
        for (let index = 1; index < poolKeys.rewardInfos.length; index++) {
            keys.push((0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[index], false));
            keys.push((0, common_1.AccountMeta)(poolKeys.rewardInfos[index].rewardVault, false));
        }
        if (userKeys.auxiliaryLedgers) {
            for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
                keys.push((0, common_1.AccountMeta)(auxiliaryLedger, false));
            }
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV5Deposit],
            },
        };
    }
    static makeDepositInstructionV6({ poolKeys, userKeys, amount }) {
        logger.assertArgument(userKeys.rewardTokenAccounts.length !== 0, 'lengths equal zero', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        logger.assertArgument(userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length, 'lengths not equal with poolKeys.rewardInfos', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 1,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
            (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
        ];
        for (let index = 0; index < poolKeys.rewardInfos.length; index++) {
            keys.push((0, common_1.AccountMeta)(poolKeys.rewardInfos[index].rewardVault, false));
            keys.push((0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[index], false));
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV6Deposit],
            },
        };
    }
    static makeWithdrawInstruction(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 3) {
            return this.makeWithdrawInstructionV3(params);
        }
        else if (version === 5) {
            return this.makeWithdrawInstructionV5(params);
        }
        else if (version === 6) {
            return this.makeWithdrawInstructionV6(params);
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeWithdrawInstructionV3({ poolKeys, userKeys, amount }) {
        logger.assertArgument(poolKeys.rewardInfos.length === 1, 'lengths not equal 1', 'poolKeys.rewardInfos', poolKeys.rewardInfos);
        logger.assertArgument(userKeys.rewardTokenAccounts.length === 1, 'lengths not equal 1', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 11,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[0], false),
            (0, common_1.AccountMeta)(poolKeys.rewardInfos[0].rewardVault, false),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_CLOCK_PUBKEY, false),
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        ];
        if (userKeys.auxiliaryLedgers) {
            for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
                keys.push((0, common_1.AccountMeta)(auxiliaryLedger, false));
            }
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV5Deposit],
            },
        };
    }
    static makeWithdrawInstructionV5({ poolKeys, userKeys, amount }) {
        logger.assertArgument(userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length, 'lengths not equal with params.poolKeys.rewardInfos', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 12,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[0], false),
            (0, common_1.AccountMeta)(poolKeys.rewardInfos[0].rewardVault, false),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_CLOCK_PUBKEY, false),
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
        ];
        for (let index = 1; index < poolKeys.rewardInfos.length; index++) {
            keys.push((0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[index], false));
            keys.push((0, common_1.AccountMeta)(poolKeys.rewardInfos[index].rewardVault, false));
        }
        if (userKeys.auxiliaryLedgers) {
            for (const auxiliaryLedger of userKeys.auxiliaryLedgers) {
                keys.push((0, common_1.AccountMeta)(auxiliaryLedger, false));
            }
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV5Withdraw],
            },
        };
    }
    static makeWithdrawInstructionV6({ poolKeys, userKeys, amount }) {
        logger.assertArgument(userKeys.rewardTokenAccounts.length !== 0, 'lengths equal zero', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        logger.assertArgument(userKeys.rewardTokenAccounts.length === poolKeys.rewardInfos.length, 'lengths not equal with params.poolKeys.rewardInfos', 'userKeys.rewardTokenAccounts', userKeys.rewardTokenAccounts);
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('amount')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 2,
            amount: (0, entity_1.parseBigNumberish)(amount),
        }, data);
        const keys = [
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMeta)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            (0, common_1.AccountMeta)(userKeys.lpTokenAccount, false),
        ];
        for (let index = 0; index < poolKeys.rewardInfos.length; index++) {
            keys.push((0, common_1.AccountMeta)(poolKeys.rewardInfos[index].rewardVault, false));
            keys.push((0, common_1.AccountMeta)(userKeys.rewardTokenAccounts[index], false));
        }
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV6Withdraw],
            },
        };
    }
    static makeCreateAssociatedLedgerAccountInstruction(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 3) {
            return this.makeCreateAssociatedLedgerAccountInstructionV3(params);
        }
        else if (version === 5) {
            return this.makeCreateAssociatedLedgerAccountInstructionV5(params);
        }
        return logger.throwArgumentError('invalid version', 'poolKeys.version', version);
    }
    static makeCreateAssociatedLedgerAccountInstructionV3({ poolKeys, userKeys, }) {
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 9,
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_RENT_PUBKEY, false),
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV3CreateLedger],
            },
        };
    }
    static makeCreateAssociatedLedgerAccountInstructionV5({ poolKeys, userKeys, }) {
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({
            instruction: 10,
        }, data);
        const keys = [
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMeta)(userKeys.ledger, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            // system
            (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
            (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_RENT_PUBKEY, false),
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
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV5CreateLedger],
            },
        };
    }
    static makeCreateFarmInstruction({ connection, userKeys, poolInfo }) {
        const { version } = poolInfo;
        if (version === 6) {
            return this.makeCreateFarmInstructionV6({
                connection,
                userKeys,
                poolInfo,
            });
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeCreateFarmInstructionV6({ connection, userKeys, poolInfo }) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const payer = (_a = userKeys.payer) !== null && _a !== void 0 ? _a : userKeys.owner;
            const farmId = (0, base_1.generatePubKey)({ fromPublicKey: payer, programId: poolInfo.programId });
            const lamports = yield connection.getMinimumBalanceForRentExemption(layout_1.FARM_STATE_LAYOUT_V6.span);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            frontInstructions.push(web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: payer,
                basePubkey: payer,
                seed: farmId.seed,
                newAccountPubkey: farmId.publicKey,
                lamports,
                space: layout_1.FARM_STATE_LAYOUT_V6.span,
                programId: poolInfo.programId,
            }));
            const { publicKey: authority, nonce } = Farm.getAssociatedAuthority({
                programId: poolInfo.programId,
                poolId: farmId.publicKey,
            });
            const lpVault = Farm.getAssociatedLedgerPoolAccount({
                programId: poolInfo.programId,
                poolId: farmId.publicKey,
                mint: poolInfo.lpMint,
                type: 'lpVault',
            });
            const rewardInfoConfig = [];
            const rewardInfoKey = [];
            for (const rewardInfo of poolInfo.rewardInfos) {
                logger.assertArgument(rewardInfo.rewardOpenTime < rewardInfo.rewardEndTime, 'start time error', 'rewardInfo.rewardOpenTime', rewardInfo.rewardOpenTime);
                logger.assertArgument(exports.poolTypeV6[rewardInfo.rewardType] !== undefined, 'reward type error', 'rewardInfo.rewardType', rewardInfo.rewardType);
                logger.assertArgument((0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond).gt(entity_1.ZERO), 'rewardPerSecond error', 'rewardInfo.rewardPerSecond', rewardInfo.rewardPerSecond);
                rewardInfoConfig.push({
                    isSet: new bn_js_1.default(1),
                    rewardPerSecond: (0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond),
                    rewardOpenTime: (0, entity_1.parseBigNumberish)(rewardInfo.rewardOpenTime),
                    rewardEndTime: (0, entity_1.parseBigNumberish)(rewardInfo.rewardEndTime),
                    rewardType: (0, entity_1.parseBigNumberish)(exports.poolTypeV6[rewardInfo.rewardType]),
                });
                let userRewardToken;
                if (rewardInfo.rewardMint.equals(web3_js_1.PublicKey.default)) {
                    // SOL
                    userRewardToken = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                        connection,
                        owner: userKeys.owner,
                        payer: (_b = userKeys.payer) !== null && _b !== void 0 ? _b : userKeys.owner,
                        instructions: frontInstructions,
                        signers,
                        amount: (0, entity_1.parseBigNumberish)(rewardInfo.rewardEndTime)
                            .sub((0, entity_1.parseBigNumberish)(rewardInfo.rewardOpenTime))
                            .mul((0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond)),
                        instructionsType: frontInstructionsType,
                    });
                    endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        tokenAccount: userRewardToken,
                        owner: userKeys.owner,
                        payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                        instructionsType: endInstructionsType,
                    }));
                }
                else {
                    userRewardToken = this._selectTokenAccount({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        tokenAccounts: userKeys.tokenAccounts,
                        mint: rewardInfo.rewardMint,
                        owner: userKeys.owner,
                        config: { associatedOnly: false },
                    });
                }
                logger.assertArgument(userRewardToken !== null, 'cannot found target token accounts', 'tokenAccounts', userKeys.tokenAccounts);
                const rewardMint = rewardInfo.rewardMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : rewardInfo.rewardMint;
                rewardInfoKey.push({
                    rewardMint,
                    rewardVault: Farm.getAssociatedLedgerPoolAccount({
                        programId: poolInfo.programId,
                        poolId: farmId.publicKey,
                        mint: rewardMint,
                        type: 'rewardVault',
                    }),
                    userRewardToken: userRewardToken,
                });
            }
            const lockUserAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts: userKeys.tokenAccounts,
                mint: poolInfo.lockInfo.lockMint,
                owner: userKeys.owner,
                config: { associatedOnly: false },
            });
            logger.assertArgument(lockUserAccount !== null, 'cannot found lock vault', 'tokenAccounts', userKeys.tokenAccounts);
            const rewardTimeInfo = (0, marshmallow_1.struct)([
                (0, marshmallow_1.u64)('isSet'),
                (0, marshmallow_1.u64)('rewardPerSecond'),
                (0, marshmallow_1.u64)('rewardOpenTime'),
                (0, marshmallow_1.u64)('rewardEndTime'),
                (0, marshmallow_1.u64)('rewardType'),
            ]);
            const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('nonce'), (0, marshmallow_1.seq)(rewardTimeInfo, 5, 'rewardTimeInfo')]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 0,
                nonce: new bn_js_1.default(nonce),
                rewardTimeInfo: rewardInfoConfig,
            }, data);
            const keys = [
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_RENT_PUBKEY, false),
                (0, common_1.AccountMeta)(farmId.publicKey, false),
                (0, common_1.AccountMetaReadonly)(authority, false),
                (0, common_1.AccountMeta)(lpVault, false),
                (0, common_1.AccountMetaReadonly)(poolInfo.lpMint, false),
                (0, common_1.AccountMeta)(poolInfo.lockInfo.lockVault, false),
                (0, common_1.AccountMetaReadonly)(poolInfo.lockInfo.lockMint, false),
                (0, common_1.AccountMeta)(lockUserAccount !== null && lockUserAccount !== void 0 ? lockUserAccount : web3_js_1.PublicKey.default, false),
                (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            ];
            for (const item of rewardInfoKey) {
                keys.push(...[
                    { pubkey: item.rewardMint, isSigner: false, isWritable: false },
                    { pubkey: item.rewardVault, isSigner: false, isWritable: true },
                    { pubkey: item.userRewardToken, isSigner: false, isWritable: true },
                ]);
            }
            const ins = new web3_js_1.TransactionInstruction({
                programId: poolInfo.programId,
                keys,
                data,
            });
            return {
                address: { farmId: farmId.publicKey },
                innerTransaction: {
                    instructions: [...frontInstructions, ins, ...endInstructions],
                    signers,
                    lookupTableAddress: [],
                    instructionTypes: [...frontInstructionsType, base_1.InstructionType.farmV6Create, ...endInstructionsType],
                },
            };
        });
    }
    static makeCreatorWithdrawFarmRewardInstruction(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 6) {
            return this.makeCreatorWithdrawFarmRewardInstructionV6(params);
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeCreatorWithdrawFarmRewardInstructionV6({ poolKeys, userKeys, withdrawMint, }) {
        var _a;
        const rewardInfo = poolKeys.rewardInfos.find((item) => item.rewardMint.equals(withdrawMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : withdrawMint));
        logger.assertArgument(rewardInfo !== undefined, 'withdraw mint error', 'poolKeys.rewardInfos', poolKeys.rewardInfos);
        const rewardVault = (_a = rewardInfo === null || rewardInfo === void 0 ? void 0 : rewardInfo.rewardVault) !== null && _a !== void 0 ? _a : web3_js_1.PublicKey.default;
        const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction')]);
        const data = Buffer.alloc(LAYOUT.span);
        LAYOUT.encode({ instruction: 5 }, data);
        const keys = [
            (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
            (0, common_1.AccountMeta)(poolKeys.id, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
            (0, common_1.AccountMetaReadonly)(poolKeys.lpVault, false),
            (0, common_1.AccountMeta)(rewardVault, false),
            (0, common_1.AccountMeta)(userKeys.userRewardToken, false),
            (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
        ];
        const ins = new web3_js_1.TransactionInstruction({
            programId: poolKeys.programId,
            keys,
            data,
        });
        return {
            address: {},
            innerTransaction: {
                instructions: [ins],
                signers: [],
                lookupTableAddress: [],
                instructionTypes: [base_1.InstructionType.farmV6CreatorWithdraw],
            },
        };
    }
    /* ================= fetch data ================= */
    static fetchMultipleInfoAndUpdate({ connection, pools, owner, config, chainTime, }) {
        return __awaiter(this, void 0, void 0, function* () {
            let hasNotV6Pool = false;
            let hasV6Pool = false;
            const publicKeys = [];
            const apiPoolInfo = {};
            for (const pool of pools) {
                apiPoolInfo[pool.id.toString()] = pool;
                if (pool.version === 6)
                    hasV6Pool = true;
                else
                    hasNotV6Pool = true;
                publicKeys.push({
                    pubkey: pool.id,
                    version: pool.version,
                    key: 'state',
                    poolId: pool.id,
                });
                publicKeys.push({
                    pubkey: pool.lpVault,
                    version: pool.version,
                    key: 'lpVault',
                    poolId: pool.id,
                });
                if (owner) {
                    publicKeys.push({
                        pubkey: this.getAssociatedLedgerAccount({
                            programId: pool.programId,
                            poolId: pool.id,
                            owner,
                            version: pool.version,
                        }),
                        version: pool.version,
                        key: 'ledger',
                        poolId: pool.id,
                    });
                }
            }
            const poolsInfo = {};
            const accountsInfo = yield (0, common_1.getMultipleAccountsInfoWithCustomFlags)(connection, publicKeys, config);
            for (const { pubkey, version, key, poolId, accountInfo } of accountsInfo) {
                const _poolId = poolId.toBase58();
                if (key === 'state') {
                    const STATE_LAYOUT = this.getStateLayout(version);
                    if (!accountInfo || !accountInfo.data || accountInfo.data.length !== STATE_LAYOUT.span) {
                        return logger.throwArgumentError('invalid farm state account info', 'pools.id', pubkey);
                    }
                    poolsInfo[_poolId] = Object.assign(Object.assign(Object.assign({}, poolsInfo[_poolId]), { apiPoolInfo: apiPoolInfo[_poolId] }), { state: STATE_LAYOUT.decode(accountInfo.data) });
                }
                else if (key === 'lpVault') {
                    if (!accountInfo || !accountInfo.data || accountInfo.data.length !== spl_1.SPL_ACCOUNT_LAYOUT.span) {
                        return logger.throwArgumentError('invalid farm lp vault account info', 'pools.lpVault', pubkey);
                    }
                    poolsInfo[_poolId] = Object.assign(Object.assign({}, poolsInfo[_poolId]), { lpVault: spl_1.SPL_ACCOUNT_LAYOUT.decode(accountInfo.data) });
                }
                else if (key === 'ledger') {
                    const LEDGER_LAYOUT = this.getLedgerLayout(version);
                    if (accountInfo && accountInfo.data) {
                        logger.assertArgument(accountInfo.data.length === LEDGER_LAYOUT.span, 'invalid farm ledger account info', 'ledger', pubkey);
                        poolsInfo[_poolId] = Object.assign(Object.assign({}, poolsInfo[_poolId]), { ledger: LEDGER_LAYOUT.decode(accountInfo.data) });
                    }
                }
            }
            const slot = hasV6Pool || hasNotV6Pool ? yield connection.getSlot() : 0;
            for (const poolId of Object.keys(poolsInfo)) {
                if (poolsInfo[poolId] === undefined)
                    continue;
                poolsInfo[poolId].state = Farm.updatePoolInfo(poolsInfo[poolId].state, poolsInfo[poolId].lpVault, slot, chainTime);
            }
            // wrapped data
            for (const [poolId, { state, ledger }] of Object.entries(poolsInfo)) {
                if (ledger) {
                    let multiplier;
                    if (state.version === 6) {
                        multiplier = state.rewardMultiplier;
                    }
                    else {
                        multiplier = state.rewardInfos.length === 1 ? entity_1.TEN.pow(new bn_js_1.default(9)) : entity_1.TEN.pow(new bn_js_1.default(15));
                    }
                    const pendingRewards = state.rewardInfos.map((rewardInfo, index) => {
                        const rewardDebt = ledger.rewardDebts[index];
                        const pendingReward = ledger.deposited
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            .mul(state.version === 6 ? rewardInfo.accRewardPerShare : rewardInfo.perShareReward)
                            .div(multiplier)
                            .sub(rewardDebt);
                        return pendingReward;
                    });
                    poolsInfo[poolId].wrapped = Object.assign(Object.assign({}, poolsInfo[poolId].wrapped), { pendingRewards });
                }
            }
            return poolsInfo;
        });
    }
    static updatePoolInfo(poolInfo, lpVault, slot, chainTime) {
        if (poolInfo.version === 3 || poolInfo.version === 5) {
            if (poolInfo.lastSlot.gte(new bn_js_1.default(slot)))
                return poolInfo;
            const spread = new bn_js_1.default(slot).sub(poolInfo.lastSlot);
            poolInfo.lastSlot = new bn_js_1.default(slot);
            for (const itemRewardInfo of poolInfo.rewardInfos) {
                if (lpVault.amount.eq(new bn_js_1.default(0)))
                    continue;
                const reward = itemRewardInfo.perSlotReward.mul(spread);
                itemRewardInfo.perShareReward = itemRewardInfo.perShareReward.add(reward.mul(new bn_js_1.default(10).pow(new bn_js_1.default(poolInfo.version === 3 ? 9 : 15))).div(lpVault.amount));
                itemRewardInfo.totalReward = itemRewardInfo.totalReward.add(reward);
            }
        }
        else if (poolInfo.version === 6) {
            for (const itemRewardInfo of poolInfo.rewardInfos) {
                if (itemRewardInfo.rewardState.eq(new bn_js_1.default(0)))
                    continue;
                const updateTime = bn_js_1.default.min(new bn_js_1.default(chainTime), itemRewardInfo.rewardEndTime);
                if (itemRewardInfo.rewardOpenTime.gte(updateTime))
                    continue;
                const spread = updateTime.sub(itemRewardInfo.rewardLastUpdateTime);
                let reward = spread.mul(itemRewardInfo.rewardPerSecond);
                const leftReward = itemRewardInfo.totalReward.sub(itemRewardInfo.totalRewardEmissioned);
                if (leftReward.lt(reward)) {
                    reward = leftReward;
                    itemRewardInfo.rewardLastUpdateTime = itemRewardInfo.rewardLastUpdateTime.add(leftReward.div(itemRewardInfo.rewardPerSecond));
                }
                else {
                    itemRewardInfo.rewardLastUpdateTime = updateTime;
                }
                if (lpVault.amount.eq(new bn_js_1.default(0)))
                    continue;
                itemRewardInfo.accRewardPerShare = itemRewardInfo.accRewardPerShare.add(reward.mul(poolInfo.rewardMultiplier).div(lpVault.amount));
                itemRewardInfo.totalRewardEmissioned = itemRewardInfo.totalRewardEmissioned.add(reward);
            }
        }
        return poolInfo;
    }
    /* ================= make instruction simple ================= */
    static makeCreatorWithdrawFarmRewardInstructionSimple(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 6) {
            return this.makeCreatorWithdrawFarmRewardInstructionV6Simple(params);
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeCreatorWithdrawFarmRewardInstructionV6Simple({ connection, poolKeys, userKeys, withdrawMint, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            let userRewardToken;
            if (withdrawMint.equals(web3_js_1.PublicKey.default)) {
                // SOL
                userRewardToken = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                    connection,
                    owner: userKeys.owner,
                    payer: (_a = userKeys.payer) !== null && _a !== void 0 ? _a : userKeys.owner,
                    instructions: frontInstructions,
                    signers,
                    amount: 0,
                    instructionsType: frontInstructionsType,
                });
                endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccount: userRewardToken,
                    owner: userKeys.owner,
                    payer: (_b = userKeys.payer) !== null && _b !== void 0 ? _b : userKeys.owner,
                    instructionsType: endInstructionsType,
                }));
            }
            else {
                const selectUserRewardToken = this._selectTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccounts: userKeys.tokenAccounts,
                    mint: withdrawMint,
                    owner: userKeys.owner,
                });
                if (selectUserRewardToken === null) {
                    userRewardToken = (0, pda_1.getATAAddress)(userKeys.owner, withdrawMint, common_1.TOKEN_PROGRAM_ID).publicKey;
                    frontInstructions.push(spl_1.Spl.makeCreateAssociatedTokenAccountInstruction({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        mint: withdrawMint,
                        associatedAccount: userRewardToken,
                        owner: userKeys.owner,
                        payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                        instructionsType: frontInstructionsType,
                    }));
                }
                else {
                    userRewardToken = selectUserRewardToken;
                }
            }
            const ins = this.makeCreatorWithdrawFarmRewardInstructionV6({
                poolKeys,
                userKeys: { userRewardToken, owner: userKeys.owner, payer: userKeys.payer },
                withdrawMint,
            });
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: (_d = userKeys.payer) !== null && _d !== void 0 ? _d : userKeys.owner,
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
    static makeCreateFarmInstructionSimple(params) {
        const { version } = params.poolInfo;
        if (version === 6) {
            return this.makeCreateFarmInstructionV6Simple(params);
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeCreateFarmInstructionV6Simple({ connection, userKeys, poolInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const payer = (_a = userKeys.payer) !== null && _a !== void 0 ? _a : userKeys.owner;
            const farmId = (0, base_1.generatePubKey)({ fromPublicKey: payer, programId: poolInfo.programId });
            const lamports = yield connection.getMinimumBalanceForRentExemption(layout_1.FARM_STATE_LAYOUT_V6.span);
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            frontInstructions.push(web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: payer,
                basePubkey: payer,
                seed: farmId.seed,
                newAccountPubkey: farmId.publicKey,
                lamports,
                space: layout_1.FARM_STATE_LAYOUT_V6.span,
                programId: poolInfo.programId,
            }));
            const { publicKey: authority, nonce } = Farm.getAssociatedAuthority({
                programId: poolInfo.programId,
                poolId: farmId.publicKey,
            });
            const lpVault = Farm.getAssociatedLedgerPoolAccount({
                programId: poolInfo.programId,
                poolId: farmId.publicKey,
                mint: poolInfo.lpMint,
                type: 'lpVault',
            });
            const rewardInfoConfig = [];
            const rewardInfoKey = [];
            for (const rewardInfo of poolInfo.rewardInfos) {
                logger.assertArgument(rewardInfo.rewardOpenTime < rewardInfo.rewardEndTime, 'start time error', 'rewardInfo.rewardOpenTime', rewardInfo.rewardOpenTime);
                logger.assertArgument(exports.poolTypeV6[rewardInfo.rewardType] !== undefined, 'reward type error', 'rewardInfo.rewardType', rewardInfo.rewardType);
                logger.assertArgument((0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond).gt(entity_1.ZERO), 'rewardPerSecond error', 'rewardInfo.rewardPerSecond', rewardInfo.rewardPerSecond);
                rewardInfoConfig.push({
                    isSet: new bn_js_1.default(1),
                    rewardPerSecond: (0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond),
                    rewardOpenTime: (0, entity_1.parseBigNumberish)(rewardInfo.rewardOpenTime),
                    rewardEndTime: (0, entity_1.parseBigNumberish)(rewardInfo.rewardEndTime),
                    rewardType: (0, entity_1.parseBigNumberish)(exports.poolTypeV6[rewardInfo.rewardType]),
                });
                let userRewardToken;
                if (rewardInfo.rewardMint.equals(web3_js_1.PublicKey.default)) {
                    // SOL
                    userRewardToken = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                        connection,
                        owner: userKeys.owner,
                        payer: (_b = userKeys.payer) !== null && _b !== void 0 ? _b : userKeys.owner,
                        instructions: frontInstructions,
                        signers,
                        amount: (0, entity_1.parseBigNumberish)(rewardInfo.rewardEndTime)
                            .sub((0, entity_1.parseBigNumberish)(rewardInfo.rewardOpenTime))
                            .mul((0, entity_1.parseBigNumberish)(rewardInfo.rewardPerSecond)),
                        instructionsType: frontInstructionsType,
                    });
                    endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        tokenAccount: userRewardToken,
                        owner: userKeys.owner,
                        payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                        instructionsType: endInstructionsType,
                    }));
                }
                else {
                    userRewardToken = this._selectTokenAccount({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        tokenAccounts: userKeys.tokenAccounts,
                        mint: rewardInfo.rewardMint,
                        owner: userKeys.owner,
                        config: { associatedOnly: false },
                    });
                }
                logger.assertArgument(userRewardToken !== null, 'cannot found target token accounts', 'tokenAccounts', userKeys.tokenAccounts);
                if (userRewardToken === null)
                    throw Error('cannot found target token accounts');
                const rewardMint = rewardInfo.rewardMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : rewardInfo.rewardMint;
                rewardInfoKey.push({
                    rewardMint,
                    rewardVault: Farm.getAssociatedLedgerPoolAccount({
                        programId: poolInfo.programId,
                        poolId: farmId.publicKey,
                        mint: rewardMint,
                        type: 'rewardVault',
                    }),
                    userRewardToken,
                });
            }
            const lockUserAccount = this._selectTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccounts: userKeys.tokenAccounts,
                mint: poolInfo.lockInfo.lockMint,
                owner: userKeys.owner,
                config: { associatedOnly: false },
            });
            logger.assertArgument(lockUserAccount !== null, 'cannot found lock vault', 'tokenAccounts', userKeys.tokenAccounts);
            const rewardTimeInfo = (0, marshmallow_1.struct)([
                (0, marshmallow_1.u64)('isSet'),
                (0, marshmallow_1.u64)('rewardPerSecond'),
                (0, marshmallow_1.u64)('rewardOpenTime'),
                (0, marshmallow_1.u64)('rewardEndTime'),
                (0, marshmallow_1.u64)('rewardType'),
            ]);
            const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('nonce'), (0, marshmallow_1.seq)(rewardTimeInfo, 5, 'rewardTimeInfo')]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 0,
                nonce: new bn_js_1.default(nonce),
                rewardTimeInfo: rewardInfoConfig,
            }, data);
            const keys = [
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_RENT_PUBKEY, false),
                (0, common_1.AccountMeta)(farmId.publicKey, false),
                (0, common_1.AccountMetaReadonly)(authority, false),
                (0, common_1.AccountMeta)(lpVault, false),
                (0, common_1.AccountMetaReadonly)(poolInfo.lpMint, false),
                (0, common_1.AccountMeta)(poolInfo.lockInfo.lockVault, false),
                (0, common_1.AccountMetaReadonly)(poolInfo.lockInfo.lockMint, false),
                (0, common_1.AccountMeta)(lockUserAccount !== null && lockUserAccount !== void 0 ? lockUserAccount : web3_js_1.PublicKey.default, false),
                (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            ];
            for (const item of rewardInfoKey) {
                keys.push(...[
                    { pubkey: item.rewardMint, isSigner: false, isWritable: false },
                    { pubkey: item.rewardVault, isSigner: false, isWritable: true },
                    { pubkey: item.userRewardToken, isSigner: false, isWritable: true },
                ]);
            }
            const ins = new web3_js_1.TransactionInstruction({
                programId: poolInfo.programId,
                keys,
                data,
            });
            return {
                address: { farmId: farmId.publicKey },
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: (_d = userKeys.payer) !== null && _d !== void 0 ? _d : userKeys.owner,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        { instructionTypes: [base_1.InstructionType.farmV6Create], instructions: [ins], signers: [] },
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeRestartFarmInstructionSimple(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 6) {
            return this.makeRestartFarmInstructionV6Simple(params);
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeRestartFarmInstructionV6Simple({ connection, poolKeys, userKeys, newRewardInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            logger.assertArgument(newRewardInfo.rewardOpenTime < newRewardInfo.rewardEndTime, 'start time error', 'newRewardInfo', newRewardInfo);
            const rewardMint = newRewardInfo.rewardMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : newRewardInfo.rewardMint;
            const rewardInfo = poolKeys.rewardInfos.find((item) => item.rewardMint.equals(rewardMint));
            logger.assertArgument(rewardInfo, 'configuration does not exist', 'rewardInfo', rewardInfo);
            const rewardVault = (_a = rewardInfo === null || rewardInfo === void 0 ? void 0 : rewardInfo.rewardVault) !== null && _a !== void 0 ? _a : web3_js_1.PublicKey.default;
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            let userRewardToken;
            if (newRewardInfo.rewardMint.equals(web3_js_1.PublicKey.default)) {
                // SOL
                userRewardToken = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                    connection,
                    owner: userKeys.owner,
                    payer: (_b = userKeys.payer) !== null && _b !== void 0 ? _b : userKeys.owner,
                    instructions: frontInstructions,
                    signers,
                    amount: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardEndTime)
                        .sub((0, entity_1.parseBigNumberish)(newRewardInfo.rewardOpenTime))
                        .mul((0, entity_1.parseBigNumberish)(newRewardInfo.rewardPerSecond)),
                    instructionsType: frontInstructionsType,
                });
                endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccount: userRewardToken,
                    owner: userKeys.owner,
                    payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                    instructionsType: endInstructionsType,
                }));
            }
            else {
                userRewardToken = this._selectTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccounts: userKeys.tokenAccounts,
                    mint: newRewardInfo.rewardMint,
                    owner: userKeys.owner,
                    config: { associatedOnly: false },
                });
            }
            logger.assertArgument(userRewardToken !== null, 'cannot found target token accounts', 'tokenAccounts', userKeys.tokenAccounts);
            if (userRewardToken === null)
                throw Error('cannot found target token accounts');
            const LAYOUT = (0, marshmallow_1.struct)([(0, marshmallow_1.u8)('instruction'), (0, marshmallow_1.u64)('rewardReopenTime'), (0, marshmallow_1.u64)('rewardEndTime'), (0, marshmallow_1.u64)('rewardPerSecond')]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 3,
                rewardReopenTime: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardOpenTime),
                rewardEndTime: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardEndTime),
                rewardPerSecond: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardPerSecond),
            }, data);
            const keys = [
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                (0, common_1.AccountMeta)(poolKeys.id, false),
                (0, common_1.AccountMetaReadonly)(poolKeys.lpVault, false),
                (0, common_1.AccountMeta)(rewardVault, false),
                (0, common_1.AccountMeta)(userRewardToken, false),
                (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            ];
            const ins = new web3_js_1.TransactionInstruction({
                programId: poolKeys.programId,
                keys,
                data,
            });
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: (_d = userKeys.payer) !== null && _d !== void 0 ? _d : userKeys.owner,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        { instructionTypes: [base_1.InstructionType.farmV6Restart], instructions: [ins], signers: [] },
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeFarmCreatorAddRewardTokenInstructionSimple(params) {
        const { poolKeys } = params;
        const { version } = poolKeys;
        if (version === 6) {
            return this.makeFarmCreatorAddRewardTokenInstructionV6Simple(params);
        }
        return logger.throwArgumentError('invalid version', 'version', version);
    }
    static makeFarmCreatorAddRewardTokenInstructionV6Simple({ connection, poolKeys, userKeys, newRewardInfo, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const rewardVault = Farm.getAssociatedLedgerPoolAccount({
                programId: poolKeys.programId,
                poolId: poolKeys.id,
                mint: newRewardInfo.rewardMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : newRewardInfo.rewardMint,
                type: 'rewardVault',
            });
            const frontInstructions = [];
            const endInstructions = [];
            const frontInstructionsType = [];
            const endInstructionsType = [];
            const signers = [];
            let userRewardToken;
            if (newRewardInfo.rewardMint.equals(web3_js_1.PublicKey.default)) {
                // SOL
                userRewardToken = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                    connection,
                    owner: userKeys.owner,
                    payer: (_a = userKeys.payer) !== null && _a !== void 0 ? _a : userKeys.owner,
                    instructions: frontInstructions,
                    signers,
                    amount: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardEndTime)
                        .sub((0, entity_1.parseBigNumberish)(newRewardInfo.rewardOpenTime))
                        .mul((0, entity_1.parseBigNumberish)(newRewardInfo.rewardPerSecond)),
                    instructionsType: frontInstructionsType,
                });
                endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccount: userRewardToken,
                    owner: userKeys.owner,
                    payer: (_b = userKeys.payer) !== null && _b !== void 0 ? _b : userKeys.owner,
                    instructionsType: endInstructionsType,
                }));
            }
            else {
                userRewardToken = this._selectTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    tokenAccounts: userKeys.tokenAccounts,
                    mint: newRewardInfo.rewardMint,
                    owner: userKeys.owner,
                    config: { associatedOnly: false },
                });
            }
            logger.assertArgument(userRewardToken !== null, 'cannot found target token accounts', 'tokenAccounts', userKeys.tokenAccounts);
            if (userRewardToken === null)
                throw Error('cannot found target token accounts');
            const rewardMint = newRewardInfo.rewardMint.equals(web3_js_1.PublicKey.default) ? entity_1.Token.WSOL.mint : newRewardInfo.rewardMint;
            const LAYOUT = (0, marshmallow_1.struct)([
                (0, marshmallow_1.u8)('instruction'),
                (0, marshmallow_1.u64)('isSet'),
                (0, marshmallow_1.u64)('rewardPerSecond'),
                (0, marshmallow_1.u64)('rewardOpenTime'),
                (0, marshmallow_1.u64)('rewardEndTime'),
                (0, marshmallow_1.u64)('rewardType'),
            ]);
            const data = Buffer.alloc(LAYOUT.span);
            LAYOUT.encode({
                instruction: 4,
                isSet: new bn_js_1.default(1),
                rewardPerSecond: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardPerSecond),
                rewardOpenTime: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardOpenTime),
                rewardEndTime: (0, entity_1.parseBigNumberish)(newRewardInfo.rewardEndTime),
                rewardType: (0, entity_1.parseBigNumberish)(exports.poolTypeV6[newRewardInfo.rewardType]),
            }, data);
            const keys = [
                (0, common_1.AccountMetaReadonly)(common_1.TOKEN_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSTEM_PROGRAM_ID, false),
                (0, common_1.AccountMetaReadonly)(common_1.SYSVAR_RENT_PUBKEY, false),
                (0, common_1.AccountMeta)(poolKeys.id, false),
                (0, common_1.AccountMetaReadonly)(poolKeys.authority, false),
                (0, common_1.AccountMetaReadonly)(rewardMint, false),
                (0, common_1.AccountMeta)(rewardVault, false),
                (0, common_1.AccountMeta)(userRewardToken, false),
                (0, common_1.AccountMetaReadonly)(userKeys.owner, true),
            ];
            const ins = new web3_js_1.TransactionInstruction({
                programId: poolKeys.programId,
                keys,
                data,
            });
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig,
                    payer: (_c = userKeys.payer) !== null && _c !== void 0 ? _c : userKeys.owner,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        { instructionTypes: [base_1.InstructionType.farmV6CreatorAddReward], instructions: [ins], signers: [] },
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeDepositInstructionSimple({ connection, poolKeys, fetchPoolInfo, ownerInfo, amount, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a;
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
            const signers = [];
            const { lpVault, apiPoolInfo, ledger } = fetchPoolInfo;
            const lpMint = lpVault.mint;
            const ownerLpTokenAccount = ownerMintToAccount[lpMint.toString()];
            logger.assertArgument(ownerLpTokenAccount, "you don't have any lp", 'lp zero', ownerMintToAccount);
            const rewardAccounts = [];
            for (const itemReward of apiPoolInfo.rewardInfos) {
                const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(entity_1.Token.WSOL.mint);
                const ownerRewardAccount = (_a = ownerMintToAccount[itemReward.rewardMint.toString()]) !== null && _a !== void 0 ? _a : (yield this._selectOrCreateTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
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
                }));
                ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount;
                rewardAccounts.push(ownerRewardAccount);
            }
            const ledgerAddress = yield Farm.getAssociatedLedgerAccount({
                programId: new web3_js_1.PublicKey(apiPoolInfo.programId),
                poolId: new web3_js_1.PublicKey(apiPoolInfo.id),
                owner: ownerInfo.wallet,
                version: apiPoolInfo.version,
            });
            if (apiPoolInfo.version < 6 && !ledger) {
                const ins = Farm.makeCreateAssociatedLedgerAccountInstruction({
                    poolKeys,
                    userKeys: {
                        owner: ownerInfo.wallet,
                        ledger: ledgerAddress,
                    },
                });
                frontInstructions.push(...ins.innerTransaction.instructions);
                frontInstructionsType.push(...ins.innerTransaction.instructionTypes);
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
            });
            return {
                address: depositInstruction.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeWithdrawInstructionSimple({ connection, fetchPoolInfo, ownerInfo, amount, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b;
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
            const withdrawInstructions = [];
            const withdrawInstructionsType = [];
            const signers = [];
            const { lpVault, wrapped, apiPoolInfo } = fetchPoolInfo;
            if (wrapped === undefined)
                throw Error('no lp');
            const lpMint = lpVault.mint;
            const lpMintUseSOLBalance = ownerInfo.useSOLBalance && lpMint.equals(entity_1.Token.WSOL.mint);
            const ownerLpTokenAccount = (_a = ownerMintToAccount[lpMint.toString()]) !== null && _a !== void 0 ? _a : (yield this._selectOrCreateTokenAccount({
                programId: common_1.TOKEN_PROGRAM_ID,
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
            }));
            ownerMintToAccount[lpMint.toString()] = ownerLpTokenAccount;
            const rewardAccounts = [];
            for (const itemReward of apiPoolInfo.rewardInfos) {
                const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(entity_1.Token.WSOL.mint);
                const ownerRewardAccount = (_b = ownerMintToAccount[itemReward.rewardMint.toString()]) !== null && _b !== void 0 ? _b : (yield this._selectOrCreateTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
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
                }));
                ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount;
                rewardAccounts.push(ownerRewardAccount);
            }
            const ins = this.makeWithdrawInstruction({
                poolKeys: apiPoolInfo,
                userKeys: {
                    ledger: this.getAssociatedLedgerAccount({
                        programId: apiPoolInfo.programId,
                        poolId: apiPoolInfo.id,
                        owner: ownerInfo.wallet,
                        version: apiPoolInfo.version,
                    }),
                    lpTokenAccount: ownerLpTokenAccount,
                    rewardTokenAccounts: rewardAccounts,
                    owner: ownerInfo.wallet,
                },
                amount,
            });
            withdrawInstructions.push(...ins.innerTransaction.instructions);
            withdrawInstructionsType.push(...ins.innerTransaction.instructionTypes);
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeHarvestAllRewardInstructionSimple({ connection, fetchPoolInfos, ownerInfo, associatedOnly = true, checkCreateATAOwner = false, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        var _a, _b;
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
            const harvestInstructions = [];
            const signers = [];
            for (const { lpVault, wrapped, apiPoolInfo, ledger } of Object.values(fetchPoolInfos)) {
                if (wrapped === undefined ||
                    ledger === undefined ||
                    !(wrapped.pendingRewards.find((i) => i.gt(entity_1.ZERO)) !== undefined || ledger.deposited.isZero()))
                    continue;
                const lpMint = lpVault.mint;
                const lpMintUseSOLBalance = ownerInfo.useSOLBalance && lpMint.equals(entity_1.Token.WSOL.mint);
                const ownerLpTokenAccount = (_a = ownerMintToAccount[lpMint.toString()]) !== null && _a !== void 0 ? _a : (yield this._selectOrCreateTokenAccount({
                    programId: common_1.TOKEN_PROGRAM_ID,
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
                }));
                ownerMintToAccount[lpMint.toString()] = ownerLpTokenAccount;
                const rewardAccounts = [];
                for (const itemReward of apiPoolInfo.rewardInfos) {
                    const rewardUseSOLBalance = ownerInfo.useSOLBalance && itemReward.rewardMint.equals(entity_1.Token.WSOL.mint);
                    const ownerRewardAccount = (_b = ownerMintToAccount[itemReward.rewardMint.toString()]) !== null && _b !== void 0 ? _b : (yield this._selectOrCreateTokenAccount({
                        programId: common_1.TOKEN_PROGRAM_ID,
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
                    }));
                    ownerMintToAccount[itemReward.rewardMint.toString()] = ownerRewardAccount;
                    rewardAccounts.push(ownerRewardAccount);
                }
                const ins = this.makeWithdrawInstruction({
                    poolKeys: apiPoolInfo,
                    userKeys: {
                        ledger: this.getAssociatedLedgerAccount({
                            programId: apiPoolInfo.programId,
                            poolId: apiPoolInfo.id,
                            owner: ownerInfo.wallet,
                            version: apiPoolInfo.version,
                        }),
                        lpTokenAccount: ownerLpTokenAccount,
                        rewardTokenAccounts: rewardAccounts,
                        owner: ownerInfo.wallet,
                    },
                    amount: 0,
                });
                harvestInstructions.push(ins.innerTransaction);
            }
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    /**
     * @deprecated the method is **DANGEROUS**, please don't use
     */
    static makeV1InfoToV2PdaAndHarvestSimple({ connection, wallet, tokenAccounts, programIdV3, programIdV5, makeTxVersion, lookupTableCache, computeBudgetConfig, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const mintToAccount = {};
            for (const item of tokenAccounts) {
                const mint = item.accountInfo.mint;
                const ata = (0, pda_1.getATAAddress)(wallet, mint, item.programId).publicKey;
                if (ata.equals(item.pubkey))
                    mintToAccount[mint.toString()] = ata;
                if (mintToAccount[mint.toString()] === undefined)
                    mintToAccount[mint.toString()] = item.pubkey;
            }
            const dataInfoV3 = yield connection.getProgramAccounts(programIdV3, {
                filters: [{ memcmp: { offset: 40, bytes: wallet.toString() } }],
            });
            const dataInfoV5 = yield connection.getProgramAccounts(programIdV5, {
                filters: [{ memcmp: { offset: 40, bytes: wallet.toString() } }],
            });
            const poolIdToAccountV3 = {};
            const poolIdToAccountV5 = {};
            for (const item of dataInfoV3) {
                const layout = item.account.data.length === layout_1.FARM_LEDGER_LAYOUT_V3_1.span ? layout_1.FARM_LEDGER_LAYOUT_V3_1 : layout_1.FARM_LEDGER_LAYOUT_V3_2;
                const info = layout.decode(item.account.data);
                const poolId = info.id.toString();
                const pda = this.getAssociatedLedgerAccount({
                    programId: programIdV3,
                    poolId: info.id,
                    owner: wallet,
                    version: 3,
                });
                if (poolIdToAccountV3[poolId] === undefined) {
                    poolIdToAccountV3[poolId] = { pda: undefined, other: [] };
                }
                if (pda.equals(item.pubkey)) {
                    poolIdToAccountV3[poolId].pda = item.pubkey;
                }
                else {
                    poolIdToAccountV3[poolId].other.push(item.pubkey);
                }
            }
            for (const item of dataInfoV5) {
                const layout = item.account.data.length === layout_1.FARM_LEDGER_LAYOUT_V5_1.span ? layout_1.FARM_LEDGER_LAYOUT_V5_1 : layout_1.FARM_LEDGER_LAYOUT_V5_2;
                const info = layout.decode(item.account.data);
                const poolId = info.id.toString();
                const pda = this.getAssociatedLedgerAccount({
                    programId: programIdV5,
                    poolId: info.id,
                    owner: wallet,
                    version: 5,
                });
                if (poolIdToAccountV5[poolId] === undefined) {
                    poolIdToAccountV5[poolId] = { pda: undefined, other: [] };
                }
                if (pda.equals(item.pubkey)) {
                    poolIdToAccountV5[poolId].pda = item.pubkey;
                }
                else {
                    poolIdToAccountV5[poolId].other.push(item.pubkey);
                }
            }
            const needCheckPoolId = [
                ...Object.entries(poolIdToAccountV3)
                    .filter((i) => i[1].other.length > 0)
                    .map((i) => i[0]),
                ...Object.entries(poolIdToAccountV5)
                    .filter((i) => i[1].other.length > 0)
                    .map((i) => i[0]),
            ];
            const allPoolInfo = yield connection.getMultipleAccountsInfo(needCheckPoolId.map((i) => new web3_js_1.PublicKey(i)));
            const poolIdToInfo = {};
            for (let i = 0; i < needCheckPoolId.length; i++) {
                const id = needCheckPoolId[i];
                const info = allPoolInfo[i];
                if (info === null)
                    continue;
                poolIdToInfo[id] = info.data;
            }
            const frontInstructions = [];
            const frontInstructionsType = [];
            const instructions = [];
            const endInstructions = [];
            const endInstructionsType = [];
            for (const [poolId, info] of Object.entries(poolIdToAccountV3)) {
                if (info.other.length === 0)
                    continue;
                if (poolIdToInfo[poolId] === undefined)
                    continue;
                const poolInfo = layout_1.REAL_FARM_STATE_LAYOUT_V3.decode(poolIdToInfo[poolId]);
                const [_lpInfo, _rewardInfo] = yield connection.getMultipleAccountsInfo([poolInfo.lpVault, poolInfo.rewardVault]);
                if (_lpInfo === null || _rewardInfo === null)
                    throw Error('get lp and reward info error');
                const lpInfo = spl_1.SPL_ACCOUNT_LAYOUT.decode(_lpInfo.data);
                const rewardInfo = spl_1.SPL_ACCOUNT_LAYOUT.decode(_rewardInfo.data);
                let lpAccount = mintToAccount[lpInfo.mint.toString()];
                if (lpAccount === undefined) {
                    lpAccount = yield this._selectOrCreateTokenAccount({
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
                    });
                    mintToAccount[lpInfo.mint.toString()] = lpAccount;
                }
                let rewardAccount = mintToAccount[rewardInfo.mint.toString()];
                if (rewardAccount === undefined) {
                    rewardAccount = yield this._selectOrCreateTokenAccount({
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
                            endInstructions: rewardInfo.mint.toString() === token_1.WSOL.mint ? endInstructions : [],
                            endInstructionsType: rewardInfo.mint.toString() === token_1.WSOL.mint ? endInstructionsType : [],
                            signers: [],
                        },
                        associatedOnly: true,
                        checkCreateATAOwner: true,
                    });
                    mintToAccount[rewardInfo.mint.toString()] = rewardAccount;
                }
                if (info.pda === undefined) {
                    const _i = this.makeCreateAssociatedLedgerAccountInstructionV3({
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        poolKeys: { programId: programIdV3, id: new web3_js_1.PublicKey(poolId) },
                        userKeys: {
                            ledger: this.getAssociatedLedgerAccount({
                                programId: programIdV3,
                                poolId: new web3_js_1.PublicKey(poolId),
                                owner: wallet,
                                version: 3,
                            }),
                            owner: wallet,
                        },
                    });
                    instructions.push(_i.innerTransaction);
                }
                const _i = this.makeDepositInstructionV3({
                    amount: 0,
                    userKeys: {
                        ledger: this.getAssociatedLedgerAccount({
                            programId: programIdV3,
                            poolId: new web3_js_1.PublicKey(poolId),
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
                        id: new web3_js_1.PublicKey(poolId),
                        authority: this.getAssociatedAuthority({ programId: programIdV3, poolId: new web3_js_1.PublicKey(poolId) }).publicKey,
                        lpVault: poolInfo.lpVault,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        rewardInfos: [{ rewardVault: poolInfo.rewardVault }],
                    },
                });
                instructions.push(_i.innerTransaction);
            }
            for (const [poolId, info] of Object.entries(poolIdToAccountV5)) {
                if (info.other.length === 0)
                    continue;
                if (poolIdToInfo[poolId] === undefined)
                    continue;
                const poolInfo = layout_1.REAL_FARM_STATE_LAYOUT_V5.decode(poolIdToInfo[poolId]);
                const [_lpInfo, _rewardInfoA, _rewardInfoB] = yield connection.getMultipleAccountsInfo([
                    poolInfo.lpVault,
                    poolInfo.rewardVaultA,
                    poolInfo.rewardVaultB,
                ]);
                if (_lpInfo === null || _rewardInfoA === null || _rewardInfoB === null)
                    throw Error('get lp and reward A / B info error');
                const lpInfo = spl_1.SPL_ACCOUNT_LAYOUT.decode(_lpInfo.data);
                const rewardInfoA = spl_1.SPL_ACCOUNT_LAYOUT.decode(_rewardInfoA.data);
                const rewardInfoB = spl_1.SPL_ACCOUNT_LAYOUT.decode(_rewardInfoB.data);
                let lpAccount = mintToAccount[lpInfo.mint.toString()];
                if (lpAccount === undefined) {
                    lpAccount = yield this._selectOrCreateTokenAccount({
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
                    });
                    mintToAccount[lpInfo.mint.toString()] = lpAccount;
                }
                let rewardAccountA = mintToAccount[rewardInfoA.mint.toString()];
                if (rewardAccountA === undefined) {
                    rewardAccountA = yield this._selectOrCreateTokenAccount({
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
                            endInstructions: rewardInfoA.mint.toString() === token_1.WSOL.mint ? endInstructions : [],
                            endInstructionsType: rewardInfoA.mint.toString() === token_1.WSOL.mint ? endInstructionsType : [],
                            signers: [],
                        },
                        associatedOnly: true,
                        checkCreateATAOwner: true,
                    });
                    mintToAccount[rewardInfoA.mint.toString()] = rewardAccountA;
                }
                let rewardAccountB = mintToAccount[rewardInfoB.mint.toString()];
                if (rewardAccountB === undefined) {
                    rewardAccountB = yield this._selectOrCreateTokenAccount({
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
                            endInstructions: rewardInfoB.mint.toString() === token_1.WSOL.mint ? endInstructions : [],
                            endInstructionsType: rewardInfoB.mint.toString() === token_1.WSOL.mint ? endInstructionsType : [],
                            signers: [],
                        },
                        associatedOnly: true,
                        checkCreateATAOwner: true,
                    });
                    mintToAccount[rewardInfoB.mint.toString()] = rewardAccountB;
                }
                if (info.pda === undefined) {
                    const _i = this.makeCreateAssociatedLedgerAccountInstructionV5({
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        poolKeys: { programId: programIdV5, id: new web3_js_1.PublicKey(poolId) },
                        userKeys: {
                            ledger: this.getAssociatedLedgerAccount({
                                programId: programIdV5,
                                poolId: new web3_js_1.PublicKey(poolId),
                                owner: wallet,
                                version: 5,
                            }),
                            owner: wallet,
                        },
                    });
                    instructions.push(_i.innerTransaction);
                }
                const _i = this.makeDepositInstructionV5({
                    amount: 0,
                    userKeys: {
                        ledger: this.getAssociatedLedgerAccount({
                            programId: programIdV5,
                            poolId: new web3_js_1.PublicKey(poolId),
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
                        id: new web3_js_1.PublicKey(poolId),
                        authority: this.getAssociatedAuthority({ programId: programIdV5, poolId: new web3_js_1.PublicKey(poolId) }).publicKey,
                        lpVault: poolInfo.lpVault,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        rewardInfos: [{ rewardVault: poolInfo.rewardVaultA }, { rewardVault: poolInfo.rewardVaultB }],
                    },
                });
                instructions.push(_i.innerTransaction);
            }
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
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
            };
        });
    }
    static makeDepositTokenInstruction({ connection, programId, governanceProgramId, voteWeightAddinProgramId, realm, communityTokenMint, owner, poolId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const registrar = (0, pda_2.getRegistrarAddress)(voteWeightAddinProgramId, realm, communityTokenMint).publicKey;
            const ownerPda = this.getAssociatedLedgerAccount({ programId, poolId, owner, version: 3 });
            const ownerAccountInfo = yield connection.getAccountInfo(ownerPda);
            if (ownerAccountInfo === null) {
                throw Error('user is not staker');
            }
            const ownerInfo = layout_1.FARM_LEDGER_LAYOUT_V3_2.decode(ownerAccountInfo.data);
            const mintAmount = ownerInfo.deposited.sub(ownerInfo.voteLockedBalance);
            if (mintAmount.eq(entity_1.ZERO)) {
                throw Error('user do not has new stake amount');
            }
            const votingMint = (0, pda_2.getVotingTokenMint)(programId, poolId).publicKey;
            const votingMintAuthority = (0, pda_2.getVotingMintAuthority)(programId, poolId).publicKey;
            const { publicKey: voter, nonce: voterBump } = (0, pda_2.getVoterAddress)(voteWeightAddinProgramId, registrar, owner);
            const voterVault = (0, pda_1.getATAAddress)(voter, votingMint, common_1.TOKEN_PROGRAM_ID).publicKey;
            const { publicKey: voterWeightRecord, nonce: voterWeightRecordBump } = (0, pda_2.getVoterWeightRecordAddress)(voteWeightAddinProgramId, registrar, owner);
            const tokenOwnerRecordAddress = (0, pda_2.getTokenOwnerRecordAddress)(governanceProgramId, realm, communityTokenMint, owner).publicKey;
            const instructions = [];
            const depositToken = (0, pda_1.getATAAddress)(owner, votingMint, common_1.TOKEN_PROGRAM_ID).publicKey;
            const depositTokenAccountInfo = yield connection.getAccountInfo(depositToken);
            if (depositTokenAccountInfo === null) {
                instructions.push(spl_1.Spl.makeCreateAssociatedTokenAccountInstruction({
                    programId: common_1.TOKEN_PROGRAM_ID,
                    mint: votingMint,
                    associatedAccount: depositToken,
                    owner,
                    payer: owner,
                    instructionsType: [],
                }));
            }
            const voterAccountInfo = yield connection.getAccountInfo(voter);
            if (voterAccountInfo === null) {
                const createTokenOwnerRecodeIns = (0, importInstruction_1.governanceCreateTokenOwnerRecord)(governanceProgramId, realm, owner, communityTokenMint, owner, tokenOwnerRecordAddress);
                instructions.push(createTokenOwnerRecodeIns, (0, importInstruction_1.voterStakeRegistryCreateVoter)(voteWeightAddinProgramId, registrar, voter, voterWeightRecord, owner, owner, voterBump, voterWeightRecordBump));
            }
            const { index: depositEntryIndex, isInit: depositEntryInit } = yield getDepositEntryIndex(connection, registrar, voter, votingMint);
            if (!depositEntryInit) {
                instructions.push((0, importInstruction_1.voterStakeRegistryCreateDepositEntry)(voteWeightAddinProgramId, registrar, voter, voterVault, owner, owner, votingMint, depositEntryIndex, 0, undefined, 0, false));
            }
            instructions.push((0, importInstruction_1.voterStakeRegistryDeposit)(voteWeightAddinProgramId, registrar, voter, voterVault, depositToken, owner, ownerPda, poolId, votingMint, votingMintAuthority, programId, depositEntryIndex, mintAmount), (0, importInstruction_1.voterStakeRegistryUpdateVoterWeightRecord)(voteWeightAddinProgramId, registrar, voter, voterWeightRecord));
            return {
                address: {},
                innerTransaction: {
                    instructions,
                    signers: [],
                    lookupTableAddress: [],
                    instructionTypes: Array(instructions.length).fill(base_1.InstructionType.test),
                },
            };
        });
    }
    static makeWithdrawTokenInstruction({ connection, programId, governanceProgramId, voteWeightAddinProgramId, realm, communityTokenMint, owner, poolId, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const registrar = (0, pda_2.getRegistrarAddress)(voteWeightAddinProgramId, realm, communityTokenMint).publicKey;
            const ownerPda = this.getAssociatedLedgerAccount({ programId, poolId, owner, version: 3 });
            const ownerAccountInfo = yield connection.getAccountInfo(ownerPda);
            if (ownerAccountInfo === null) {
                throw Error('user is not staker');
            }
            const ownerInfo = layout_1.FARM_LEDGER_LAYOUT_V3_2.decode(ownerAccountInfo.data);
            if (ownerInfo.voteLockedBalance.eq(entity_1.ZERO)) {
                throw Error('user has vote locked balance = 0');
            }
            const votingMint = (0, pda_2.getVotingTokenMint)(programId, poolId).publicKey;
            const votingMintAuthority = (0, pda_2.getVotingMintAuthority)(programId, poolId).publicKey;
            const { publicKey: voter } = (0, pda_2.getVoterAddress)(voteWeightAddinProgramId, registrar, owner);
            const voterVault = (0, pda_1.getATAAddress)(voter, votingMint, common_1.TOKEN_PROGRAM_ID).publicKey;
            const { publicKey: voterWeightRecord } = (0, pda_2.getVoterWeightRecordAddress)(voteWeightAddinProgramId, registrar, owner);
            const tokenOwnerRecordAddress = (0, pda_2.getTokenOwnerRecordAddress)(governanceProgramId, realm, communityTokenMint, owner).publicKey;
            const instructions = [];
            const { index: depositEntryIndex, isInit: depositEntryInit } = yield getDepositEntryIndex(connection, registrar, voter, votingMint);
            if (!depositEntryInit)
                throw Error('deposit entry index check error');
            instructions.push((0, importInstruction_1.voterStakeRegistryWithdraw)(voteWeightAddinProgramId, registrar, voter, owner, tokenOwnerRecordAddress, voterWeightRecord, voterVault, (0, pda_1.getATAAddress)(owner, votingMint, common_1.TOKEN_PROGRAM_ID).publicKey, ownerPda, poolId, votingMint, votingMintAuthority, programId, depositEntryIndex, ownerInfo.voteLockedBalance));
            return {
                address: {},
                innerTransaction: {
                    instructions,
                    signers: [],
                    lookupTableAddress: [],
                    instructionTypes: Array(instructions.length).fill(base_1.InstructionType.test),
                },
            };
        });
    }
}
exports.Farm = Farm;
function getDepositEntryIndex(connection, registrar, voter, voterMint) {
    return __awaiter(this, void 0, void 0, function* () {
        const registrarAccountData = yield connection.getAccountInfo(registrar);
        if (registrarAccountData === null)
            throw Error('registrar info check error');
        const registrarData = layout_1.VoterRegistrar.decode(registrarAccountData.data);
        const votingMintConfigIndex = registrarData.votingMints.findIndex((i) => i.mint.equals(voterMint));
        if (votingMintConfigIndex === -1)
            throw Error('find voter mint error');
        const voterAccountData = yield connection.getAccountInfo(voter);
        if (voterAccountData === null)
            return { index: votingMintConfigIndex, isInit: false }; // throw Error('voter info check error')
        const voterData = layout_1.Voter.decode(voterAccountData.data);
        const depositEntryIndex = voterData.deposits.findIndex((i) => i.isUsed && i.votingMintConfigIdx === votingMintConfigIndex);
        if (depositEntryIndex === -1)
            return { index: votingMintConfigIndex, isInit: false };
        else
            return { index: depositEntryIndex, isInit: true };
    });
}
//# sourceMappingURL=farm.js.map