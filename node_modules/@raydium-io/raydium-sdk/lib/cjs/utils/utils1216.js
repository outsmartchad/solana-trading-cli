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
exports.Utils1216 = void 0;
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const base_1 = require("../base");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
class Utils1216 extends base_1.Base {
    // pda
    static getPdaPoolId(programId, ammId) {
        return (0, common_1.findProgramAddress)([this.SEED_CONFIG.pool.id, ammId.toBuffer()], programId);
    }
    static getPdaOwnerId(programId, poolId, owner, version) {
        return (0, common_1.findProgramAddress)([
            this.SEED_CONFIG.owner.id,
            poolId.toBuffer(),
            owner.toBuffer(),
            // new BN(version).toBuffer()
            Buffer.from(new bn_js_1.default(version).toArray()),
        ], programId);
    }
    static getAllInfo({ connection, programId, poolIds, wallet, chainTime, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (poolIds.length === 0)
                return [];
            const allPoolPda = poolIds.map((id) => this.getPdaPoolId(programId, id).publicKey);
            const allOwnerPda = [];
            for (let itemVersion = 0; itemVersion < this.VERSION_PROJECT.length; itemVersion++) {
                allOwnerPda.push(...allPoolPda.map((id) => this.getPdaOwnerId(programId, id, wallet, itemVersion).publicKey));
            }
            const pdaInfo = yield (0, common_1.getMultipleAccountsInfo)(connection, [...allPoolPda, ...allOwnerPda]);
            const info = [];
            for (let index = 0; index < pdaInfo.length; index++) {
                const version = Math.floor(index / poolIds.length);
                const i = index % poolIds.length;
                const itemPoolId = allPoolPda[i];
                const itemOwnerId = allOwnerPda[index];
                const itemPoolInfoS = pdaInfo[i];
                const itemOwnerInfoS = pdaInfo[poolIds.length + index];
                if (!(itemPoolInfoS && itemOwnerInfoS))
                    continue;
                if (itemPoolInfoS.data.length !== this.POOL_LAYOUT.span || itemOwnerInfoS.data.length !== this.OWNER_LAYOUT.span)
                    continue;
                const itemPoolInfo = this.POOL_LAYOUT.decode(itemPoolInfoS.data);
                const itemOwnerInfo = this.OWNER_LAYOUT.decode(itemOwnerInfoS.data);
                const openTime = itemPoolInfo.openTime.toNumber();
                const endTime = itemPoolInfo.endTime.toNumber();
                const hasCanClaimToken = itemOwnerInfo.tokenInfo.map((i) => i.debtAmount.gt(new bn_js_1.default(0))).filter((i) => !i).length !== 3;
                const inCanClaimTime = chainTime > openTime && chainTime < endTime && itemPoolInfo.status === 1;
                const canClaim = hasCanClaimToken && inCanClaimTime;
                info.push({
                    programId,
                    poolId: itemPoolId,
                    ammId: itemPoolInfo.ammId,
                    ownerAccountId: itemOwnerId,
                    snapshotLpAmount: itemOwnerInfo.lpAmount,
                    project: this.VERSION_PROJECT[version],
                    openTime,
                    endTime,
                    canClaim,
                    canClaimErrorType: !hasCanClaimToken ? 'alreadyClaimIt' : !inCanClaimTime ? 'outOfOperationalTime' : undefined,
                    tokenInfo: itemPoolInfo.tokenInfo.map((itemPoolToken, i) => ({
                        programId: common_1.TOKEN_PROGRAM_ID,
                        mintAddress: itemPoolToken.mintAddress,
                        mintVault: itemPoolToken.mintVault,
                        mintDecimals: itemPoolToken.mintDecimals,
                        perLpLoss: itemPoolToken.perLpLoss,
                        debtAmount: itemOwnerInfo.tokenInfo[i].debtAmount.add(itemOwnerInfo.tokenInfo[i].claimedAmount),
                    })),
                });
            }
            return info;
        });
    }
    static makeClaimInstructionSimple({ connection, poolInfo, ownerInfo, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const frontInstructionsType = [];
            const endInstructions = [];
            const endInstructionsType = [];
            const instructions = [];
            const instructionsType = [];
            const signers = [];
            const ownerVaultList = [];
            for (const itemToken of poolInfo.tokenInfo) {
                ownerVaultList.push(yield this._selectOrCreateTokenAccount({
                    programId: itemToken.programId,
                    mint: itemToken.mintAddress,
                    tokenAccounts: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? [] : ownerInfo.tokenAccounts,
                    owner: ownerInfo.wallet,
                    createInfo: {
                        connection,
                        payer: ownerInfo.wallet,
                        amount: 0,
                        frontInstructions,
                        endInstructions: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? endInstructions : [],
                        frontInstructionsType,
                        endInstructionsType,
                        signers,
                    },
                    associatedOnly: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? false : ownerInfo.associatedOnly,
                    checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
                }));
            }
            instructions.push(this.makeClaimInstruction({
                programId: poolInfo.programId,
                poolInfo,
                ownerInfo: {
                    wallet: ownerInfo.wallet,
                    ownerPda: poolInfo.ownerAccountId,
                    claimAddress: ownerVaultList,
                },
            }));
            instructionsType.push(base_1.InstructionType.util1216OwnerClaim);
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.wallet,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        { instructionTypes: instructionsType, instructions, signers: [] },
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeClaimAllInstructionSimple({ connection, poolInfos, ownerInfo, makeTxVersion, lookupTableCache, }) {
        var _b;
        return __awaiter(this, void 0, void 0, function* () {
            const frontInstructions = [];
            const frontInstructionsType = [];
            const endInstructions = [];
            const endInstructionsType = [];
            const instructions = [];
            const instructionsType = [];
            const signers = [];
            const tempNewVault = {};
            for (const poolInfo of poolInfos) {
                const ownerVaultList = [];
                for (const itemToken of poolInfo.tokenInfo) {
                    const tempVault = (_b = tempNewVault[itemToken.mintAddress.toString()]) !== null && _b !== void 0 ? _b : (yield this._selectOrCreateTokenAccount({
                        programId: itemToken.programId,
                        mint: itemToken.mintAddress,
                        tokenAccounts: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? [] : ownerInfo.tokenAccounts,
                        owner: ownerInfo.wallet,
                        createInfo: {
                            connection,
                            payer: ownerInfo.wallet,
                            amount: 0,
                            frontInstructions,
                            endInstructions: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? endInstructions : [],
                            frontInstructionsType,
                            endInstructionsType,
                            signers,
                        },
                        associatedOnly: itemToken.mintAddress.equals(entity_1.Token.WSOL.mint) ? false : ownerInfo.associatedOnly,
                        checkCreateATAOwner: ownerInfo.checkCreateATAOwner,
                    }));
                    tempNewVault[itemToken.mintAddress.toString()] = tempVault;
                    ownerVaultList.push(tempVault);
                }
                instructions.push(this.makeClaimInstruction({
                    programId: poolInfo.programId,
                    poolInfo,
                    ownerInfo: {
                        wallet: ownerInfo.wallet,
                        ownerPda: poolInfo.ownerAccountId,
                        claimAddress: ownerVaultList,
                    },
                }));
                instructionsType.push(base_1.InstructionType.util1216OwnerClaim);
            }
            return {
                address: {},
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: ownerInfo.wallet,
                    innerTransaction: [
                        { instructionTypes: frontInstructionsType, instructions: frontInstructions, signers },
                        { instructionTypes: instructionsType, instructions, signers: [] },
                        { instructionTypes: endInstructionsType, instructions: endInstructions, signers: [] },
                    ],
                    lookupTableCache,
                }),
            };
        });
    }
    static makeClaimInstruction({ programId, poolInfo, ownerInfo, }) {
        const dataLayout = (0, marshmallow_1.struct)([]);
        const keys = [
            { pubkey: ownerInfo.wallet, isSigner: true, isWritable: true },
            { pubkey: poolInfo.poolId, isSigner: false, isWritable: true },
            { pubkey: ownerInfo.ownerPda, isSigner: false, isWritable: true },
            ...ownerInfo.claimAddress.map((i) => ({ pubkey: i, isSigner: false, isWritable: true })),
            ...poolInfo.tokenInfo.map(({ mintVault }) => ({ pubkey: mintVault, isSigner: false, isWritable: true })),
            { pubkey: common_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
        const data = Buffer.alloc(dataLayout.span);
        dataLayout.encode({}, data);
        const aData = Buffer.from([...[10, 66, 208, 184, 161, 6, 191, 98], ...data]);
        return new web3_js_1.TransactionInstruction({
            keys,
            programId,
            data: aData,
        });
    }
}
exports.Utils1216 = Utils1216;
_a = Utils1216;
Utils1216.CLAIMED_NUM = 3;
Utils1216.POOL_LAYOUT = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.u8)('status'),
    (0, marshmallow_1.u64)('openTime'),
    (0, marshmallow_1.u64)('endTime'),
    (0, marshmallow_1.publicKey)('ammId'),
    (0, marshmallow_1.seq)((0, marshmallow_1.struct)([
        (0, marshmallow_1.u8)('mintDecimals'),
        (0, marshmallow_1.publicKey)('mintAddress'),
        (0, marshmallow_1.publicKey)('mintVault'),
        (0, marshmallow_1.u64)('perLpLoss'),
        (0, marshmallow_1.u64)('totalClaimedAmount'),
    ]), _a.CLAIMED_NUM, 'tokenInfo'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 10, 'padding'),
]);
Utils1216.OWNER_LAYOUT = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(8),
    (0, marshmallow_1.u8)('bump'),
    (0, marshmallow_1.u8)('version'),
    (0, marshmallow_1.publicKey)('poolId'),
    (0, marshmallow_1.publicKey)('owner'),
    (0, marshmallow_1.u64)('lpAmount'),
    (0, marshmallow_1.seq)((0, marshmallow_1.struct)([(0, marshmallow_1.publicKey)('mintAddress'), (0, marshmallow_1.u64)('debtAmount'), (0, marshmallow_1.u64)('claimedAmount')]), _a.CLAIMED_NUM, 'tokenInfo'),
    (0, marshmallow_1.seq)((0, marshmallow_1.u64)(), 4, 'padding'),
]);
Utils1216.DEFAULT_POOL_ID = [
    '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg',
    'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
    'DVa7Qmb5ct9RCpaU7UTpSaf3GVMYz17vNVU67XpdCRut',
    '7XawhbbxtsRcQA8KTkHT9f9nc6d69UwqCDh6U5EEbEmX',
    '6a1CsrpeZubDjEJE9s1CMVheB6HWM5d7m1cj2jkhyXhj',
    'EoNrn8iUhwgJySD1pHu8Qxm5gSQqLK3za4m8xzD2RuEb',
    'AceAyRTWt4PyB2pHqf2qhDgNZDtKVNaxgL8Ru3V4aN1P',
    '6tmFJbMk5yVHFcFy7X2K8RwHjKLr6KVFLYXpgpBNeAxB',
].map((i) => new web3_js_1.PublicKey(i));
Utils1216.SEED_CONFIG = {
    pool: {
        id: Buffer.from('pool_seed', 'utf8'),
    },
    owner: {
        id: Buffer.from('user_claim_seed', 'utf8'),
    },
};
Utils1216.VERSION_PROJECT = [undefined, 'Francium', 'Tulip', 'Larix'];
//# sourceMappingURL=utils1216.js.map