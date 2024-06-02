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
exports.BNDivCeil = exports.fetchMultipleMintInfos = exports.minExpirationTime = exports.getTransferAmountFee = exports.buildTransaction = exports.buildSimpleTransaction = exports.unwarpSol = exports.getWSOLAmount = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const common_1 = require("../common");
const entity_1 = require("../entity");
const spl_1 = require("../spl");
const token_1 = require("../token");
const type_1 = require("./type");
function getWSOLAmount({ tokenAccounts }) {
    const WSOL_MINT = new web3_js_1.PublicKey(token_1.WSOL.mint);
    const amounts = tokenAccounts.filter((i) => i.accountInfo.mint.equals(WSOL_MINT)).map((i) => i.accountInfo.amount);
    const amount = amounts.reduce((a, b) => a.add(b), new bn_js_1.default(0));
    return amount;
}
exports.getWSOLAmount = getWSOLAmount;
function unwarpSol({ ownerInfo, tokenAccounts, makeTxVersion, connection, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const WSOL_MINT = new web3_js_1.PublicKey(token_1.WSOL.mint);
        const instructionsInfo = tokenAccounts
            .filter((i) => i.accountInfo.mint.equals(WSOL_MINT))
            .map((i) => ({
            amount: i.accountInfo.amount,
            tx: spl_1.Spl.makeCloseAccountInstruction({
                programId: common_1.TOKEN_PROGRAM_ID,
                tokenAccount: i.pubkey,
                owner: ownerInfo.wallet,
                payer: ownerInfo.payer,
                instructionsType: [],
            }),
        }));
        return {
            address: {},
            innerTransactions: yield (0, common_1.splitTxAndSigners)({
                connection,
                makeTxVersion,
                payer: ownerInfo.payer,
                innerTransaction: instructionsInfo.map((i) => ({
                    instructionTypes: [type_1.InstructionType.closeAccount],
                    instructions: [i.tx],
                    signers: [],
                })),
            }),
        };
    });
}
exports.unwarpSol = unwarpSol;
function buildSimpleTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, addLookupTableInfo, }) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (makeTxVersion !== type_1.TxVersion.V0 && makeTxVersion !== type_1.TxVersion.LEGACY)
            throw Error(' make tx version args error');
        const _recentBlockhash = recentBlockhash !== null && recentBlockhash !== void 0 ? recentBlockhash : (yield connection.getLatestBlockhash()).blockhash;
        const txList = [];
        for (const itemIx of innerTransactions) {
            txList.push(_makeTransaction({
                makeTxVersion,
                instructions: itemIx.instructions,
                payer,
                recentBlockhash: _recentBlockhash,
                signers: itemIx.signers,
                lookupTableInfos: Object.values(Object.assign(Object.assign({}, (addLookupTableInfo !== null && addLookupTableInfo !== void 0 ? addLookupTableInfo : {})), ((_a = itemIx.lookupTableAddress) !== null && _a !== void 0 ? _a : {}))),
            }));
        }
        return txList;
    });
}
exports.buildSimpleTransaction = buildSimpleTransaction;
function buildTransaction({ connection, makeTxVersion, payer, innerTransactions, recentBlockhash, lookupTableCache, }) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (makeTxVersion !== type_1.TxVersion.V0 && makeTxVersion !== type_1.TxVersion.LEGACY)
            throw Error(' make tx version args error');
        const _recentBlockhash = recentBlockhash !== null && recentBlockhash !== void 0 ? recentBlockhash : (yield connection.getLatestBlockhash()).blockhash;
        const _lookupTableCache = lookupTableCache !== null && lookupTableCache !== void 0 ? lookupTableCache : {};
        const lta = [
            ...new Set([
                ...innerTransactions
                    .map((i) => { var _a; return (_a = i.lookupTableAddress) !== null && _a !== void 0 ? _a : []; })
                    .flat()
                    .map((i) => i.toString()),
            ]),
        ];
        const needCacheLTA = [];
        for (const item of lta) {
            if (_lookupTableCache[item] === undefined) {
                needCacheLTA.push(new web3_js_1.PublicKey(item));
            }
        }
        const lookupTableAccountsCache = needCacheLTA.length > 0 ? yield (0, common_1.getMultipleLookupTableInfo)({ connection, address: needCacheLTA }) : {};
        for (const [key, value] of Object.entries(lookupTableAccountsCache)) {
            _lookupTableCache[key] = value;
        }
        const txList = [];
        for (const itemIx of innerTransactions) {
            const _itemLTA = {};
            if (makeTxVersion === type_1.TxVersion.V0) {
                for (const item of (_a = itemIx.lookupTableAddress) !== null && _a !== void 0 ? _a : []) {
                    _itemLTA[item.toString()] = _lookupTableCache[item.toString()];
                }
            }
            txList.push(_makeTransaction({
                makeTxVersion,
                instructions: itemIx.instructions,
                payer,
                recentBlockhash: _recentBlockhash,
                signers: itemIx.signers,
                lookupTableInfos: Object.values(_itemLTA),
            }));
        }
        return txList;
    });
}
exports.buildTransaction = buildTransaction;
function _makeTransaction({ makeTxVersion, instructions, payer, recentBlockhash, signers, lookupTableInfos, }) {
    if (makeTxVersion === type_1.TxVersion.LEGACY) {
        const tx = new web3_js_1.Transaction();
        tx.add(...instructions);
        tx.feePayer = payer;
        tx.recentBlockhash = recentBlockhash;
        if (signers.length > 0)
            tx.sign(...signers);
        return tx;
    }
    else if (makeTxVersion === type_1.TxVersion.V0) {
        const transactionMessage = new web3_js_1.TransactionMessage({
            payerKey: payer,
            recentBlockhash,
            instructions,
        });
        const itemV = new web3_js_1.VersionedTransaction(transactionMessage.compileToV0Message(lookupTableInfos));
        itemV.sign(signers);
        return itemV;
    }
    else {
        throw Error(' make tx version check error ');
    }
}
const POINT = 10000;
function getTransferAmountFee(amount, feeConfig, epochInfo, addFee) {
    if (feeConfig === undefined) {
        return {
            amount,
            fee: undefined,
            expirationTime: undefined,
        };
    }
    const nowFeeConfig = epochInfo.epoch < feeConfig.newerTransferFee.epoch ? feeConfig.olderTransferFee : feeConfig.newerTransferFee;
    const maxFee = new bn_js_1.default(nowFeeConfig.maximumFee.toString());
    const expirationTime = epochInfo.epoch < feeConfig.newerTransferFee.epoch
        ? ((Number(feeConfig.newerTransferFee.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400) / 1000
        : undefined;
    if (addFee) {
        if (nowFeeConfig.transferFeeBasisPoints === POINT) {
            const nowMaxFee = new bn_js_1.default(nowFeeConfig.maximumFee.toString());
            return {
                amount: amount.add(nowMaxFee),
                fee: nowMaxFee,
                expirationTime,
            };
        }
        else {
            const _TAmount = BNDivCeil(amount.mul(new bn_js_1.default(POINT)), new bn_js_1.default(POINT - nowFeeConfig.transferFeeBasisPoints));
            const nowMaxFee = new bn_js_1.default(nowFeeConfig.maximumFee.toString());
            const TAmount = _TAmount.sub(amount).gt(nowMaxFee) ? amount.add(nowMaxFee) : _TAmount;
            const _fee = BNDivCeil(TAmount.mul(new bn_js_1.default(nowFeeConfig.transferFeeBasisPoints)), new bn_js_1.default(POINT));
            const fee = _fee.gt(maxFee) ? maxFee : _fee;
            return {
                amount: TAmount,
                fee,
                expirationTime,
            };
        }
    }
    else {
        const _fee = BNDivCeil(amount.mul(new bn_js_1.default(nowFeeConfig.transferFeeBasisPoints)), new bn_js_1.default(POINT));
        const fee = _fee.gt(maxFee) ? maxFee : _fee;
        return {
            amount,
            fee,
            expirationTime,
        };
    }
}
exports.getTransferAmountFee = getTransferAmountFee;
function minExpirationTime(expirationTime1, expirationTime2) {
    if (expirationTime1 === undefined)
        return expirationTime2;
    if (expirationTime2 === undefined)
        return expirationTime1;
    return Math.min(expirationTime1, expirationTime2);
}
exports.minExpirationTime = minExpirationTime;
function fetchMultipleMintInfos({ connection, mints }) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        if (mints.length === 0)
            return {};
        const mintInfos = yield (0, common_1.getMultipleAccountsInfoWithCustomFlags)(connection, mints.map((i) => ({ pubkey: i })));
        const mintK = {};
        for (const i of mintInfos) {
            const t = (0, spl_token_1.unpackMint)(i.pubkey, i.accountInfo, (_a = i.accountInfo) === null || _a === void 0 ? void 0 : _a.owner);
            mintK[i.pubkey.toString()] = Object.assign(Object.assign({}, t), { feeConfig: (_b = (0, spl_token_1.getTransferFeeConfig)(t)) !== null && _b !== void 0 ? _b : undefined });
        }
        return mintK;
    });
}
exports.fetchMultipleMintInfos = fetchMultipleMintInfos;
function BNDivCeil(bn1, bn2) {
    const { div, mod } = bn1.divmod(bn2);
    if (mod.gt(entity_1.ZERO)) {
        return div.add(entity_1.ONE);
    }
    else {
        return div;
    }
}
exports.BNDivCeil = BNDivCeil;
//# sourceMappingURL=util.js.map