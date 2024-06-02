"use strict";
// import BN from 'bn.js';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultipleLookupTableInfo = exports.MAX_BASE64_SIZE = exports.splitTxAndSigners = exports.simulateTransaction = exports.parseSimulateValue = exports.parseSimulateLogToJson = exports.simulateMultipleInstruction = exports.forecastTransactionSize = exports.getMultipleAccountsInfoWithCustomFlags = exports.getMultipleAccountsInfo = void 0;
// import { Spl, SPL_ACCOUNT_LAYOUT } from '../spl';
// import { TOKEN_PROGRAM_ID } from './id';
const web3_js_1 = require("@solana/web3.js");
const base_1 = require("../base");
const instrument_1 = require("../base/instrument");
const lodash_1 = require("./lodash");
const logger_1 = require("./logger");
const logger = logger_1.Logger.from('common/web3');
// export async function batchGetMultipleAccountsInfo() {}
function getMultipleAccountsInfo(connection, publicKeys, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const { batchRequest, commitment } = Object.assign({
            batchRequest: false,
        }, config);
        const chunkedKeys = (0, lodash_1.chunkArray)(publicKeys, 100);
        let results = new Array(chunkedKeys.length).fill([]);
        if (batchRequest) {
            const batch = chunkedKeys.map((keys) => {
                const args = connection._buildArgs([keys.map((key) => key.toBase58())], commitment, 'base64');
                return {
                    methodName: 'getMultipleAccounts',
                    args,
                };
            });
            const _batch = (0, lodash_1.chunkArray)(batch, 10);
            const unsafeResponse = yield (yield Promise.all(_batch.map((i) => __awaiter(this, void 0, void 0, function* () { 
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return yield connection._rpcBatchRequest(i); })))).flat();
            results = unsafeResponse.map((unsafeRes) => {
                if (unsafeRes.error) {
                    return logger.throwError('failed to get info for multiple accounts', logger_1.Logger.errors.RPC_ERROR, {
                        message: unsafeRes.error.message,
                    });
                }
                return unsafeRes.result.value.map((accountInfo) => {
                    if (accountInfo) {
                        const { data, executable, lamports, owner, rentEpoch } = accountInfo;
                        if (data.length !== 2 && data[1] !== 'base64') {
                            return logger.throwError('info must be base64 encoded', logger_1.Logger.errors.RPC_ERROR);
                        }
                        return {
                            data: Buffer.from(data[0], 'base64'),
                            executable,
                            lamports,
                            owner: new web3_js_1.PublicKey(owner),
                            rentEpoch,
                        };
                    }
                    else {
                        return null;
                    }
                });
            });
        }
        else {
            try {
                results = (yield Promise.all(chunkedKeys.map((keys) => connection.getMultipleAccountsInfo(keys, commitment))));
            }
            catch (error) {
                if (error instanceof Error) {
                    return logger.throwError('failed to get info for multiple accounts', logger_1.Logger.errors.RPC_ERROR, {
                        message: error.message,
                    });
                }
            }
        }
        return results.flat();
    });
}
exports.getMultipleAccountsInfo = getMultipleAccountsInfo;
function getMultipleAccountsInfoWithCustomFlags(connection, publicKeysWithCustomFlag, config) {
    return __awaiter(this, void 0, void 0, function* () {
        const multipleAccountsInfo = yield getMultipleAccountsInfo(connection, publicKeysWithCustomFlag.map((o) => o.pubkey), config);
        return publicKeysWithCustomFlag.map((o, idx) => (Object.assign(Object.assign({}, o), { accountInfo: multipleAccountsInfo[idx] })));
    });
}
exports.getMultipleAccountsInfoWithCustomFlags = getMultipleAccountsInfoWithCustomFlags;
// export async function getTokenAccountsByOwner(
//   connection: Connection,
//   owner: PublicKey,
//   config?: GetTokenAccountsByOwnerConfig
// ) {
//   const defaultConfig = {};
//   const customConfig = { ...defaultConfig, ...config };
//   const solReq = connection.getAccountInfo(owner, customConfig.commitment);
//   const tokenReq = connection.getTokenAccountsByOwner(
//     owner,
//     {
//       programId: TOKEN_PROGRAM_ID
//     },
//     customConfig.commitment
//   );
//   const [solResp, tokenResp] = await Promise.all([solReq, tokenReq]);
//   const accounts: {
//     publicKey?: PublicKey;
//     mint?: PublicKey;
//     isAssociated?: boolean;
//     amount: BN;
//     isNative: boolean;
//   }[] = [];
//   for (const { pubkey, account } of tokenResp.value) {
//     // double check layout length
//     if (account.data.length !== SPL_ACCOUNT_LAYOUT.span) {
//       return logger.throwArgumentError('invalid token account layout length', 'publicKey', pubkey);
//     }
//     const { mint, amount } = SPL_ACCOUNT_LAYOUT.decode(account.data);
//     const associatedTokenAddress = await Spl.getAssociatedTokenAddress({ mint, owner });
//     accounts.push({
//       publicKey: pubkey,
//       mint,
//       isAssociated: associatedTokenAddress.equals(pubkey),
//       amount,
//       isNative: false
//     });
//   }
//   if (solResp) {
//     accounts.push({
//       amount: new BN(solResp.lamports),
//       isNative: true
//     });
//   }
//   return accounts;
// }
/**
 * Forecast transaction size
 */
function forecastTransactionSize(instructions, signers) {
    if (instructions.length < 1) {
        return logger.throwArgumentError('no instructions provided', 'instructions', instructions);
    }
    if (signers.length < 1) {
        return logger.throwArgumentError('no signers provided', 'signers', signers);
    }
    const transaction = new web3_js_1.Transaction({
        recentBlockhash: '11111111111111111111111111111111',
        feePayer: signers[0],
    });
    transaction.add(...instructions);
    try {
        return Buffer.from(transaction.serialize({ verifySignatures: false })).toString('base64').length < exports.MAX_BASE64_SIZE;
    }
    catch (error) {
        return false;
    }
}
exports.forecastTransactionSize = forecastTransactionSize;
/**
 * Simulates multiple instruction
 */
function simulateMultipleInstruction(connection, instructions, keyword, batchRequest = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const feePayer = new web3_js_1.PublicKey('RaydiumSimuLateTransaction11111111111111111');
        const transactions = [];
        let transaction = new web3_js_1.Transaction();
        transaction.feePayer = feePayer;
        for (const instruction of instructions) {
            if (!forecastTransactionSize([...transaction.instructions, instruction], [feePayer])) {
                transactions.push(transaction);
                transaction = new web3_js_1.Transaction();
                transaction.feePayer = feePayer;
            }
            transaction.add(instruction);
        }
        if (transaction.instructions.length > 0) {
            transactions.push(transaction);
        }
        let results = [];
        try {
            results = yield simulateTransaction(connection, transactions, batchRequest);
            if (results.find((i) => i.err !== null))
                throw Error('rpc simulateTransaction error');
        }
        catch (error) {
            if (error instanceof Error) {
                return logger.throwError('failed to simulate for instructions', logger_1.Logger.errors.RPC_ERROR, {
                    message: error.message,
                });
            }
        }
        const logs = [];
        for (const result of results) {
            logger.debug('simulate result:', result);
            if (result.logs) {
                const filteredLog = result.logs.filter((log) => log && log.includes(keyword));
                logger.debug('filteredLog:', logs);
                logger.assertArgument(filteredLog.length !== 0, 'simulate log not match keyword', 'keyword', keyword);
                logs.push(...filteredLog);
            }
        }
        return logs;
    });
}
exports.simulateMultipleInstruction = simulateMultipleInstruction;
function parseSimulateLogToJson(log, keyword) {
    const results = log.match(/{["\w:,]+}/g);
    if (!results || results.length !== 1) {
        return logger.throwArgumentError('simulate log fail to match json', 'keyword', keyword);
    }
    return results[0];
}
exports.parseSimulateLogToJson = parseSimulateLogToJson;
function parseSimulateValue(log, key) {
    const reg = new RegExp(`"${key}":(\\d+)`, 'g');
    const results = reg.exec(log);
    if (!results || results.length !== 2) {
        return logger.throwArgumentError('simulate log fail to match key', 'key', key);
    }
    return results[1];
}
exports.parseSimulateValue = parseSimulateValue;
function simulateTransaction(connection, transactions, batchRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = [];
        if (batchRequest) {
            const getLatestBlockhash = yield connection.getLatestBlockhash();
            const encodedTransactions = [];
            for (const transaction of transactions) {
                transaction.recentBlockhash = getLatestBlockhash.blockhash;
                transaction.lastValidBlockHeight = getLatestBlockhash.lastValidBlockHeight;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const message = transaction._compile();
                const signData = message.serialize();
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const wireTransaction = transaction._serialize(signData);
                const encodedTransaction = wireTransaction.toString('base64');
                encodedTransactions.push(encodedTransaction);
            }
            const batch = encodedTransactions.map((keys) => {
                const args = connection._buildArgs([keys], undefined, 'base64');
                return {
                    methodName: 'simulateTransaction',
                    args,
                };
            });
            const reqData = [];
            const itemReqIndex = 20;
            for (let i = 0; i < Math.ceil(batch.length / itemReqIndex); i++) {
                reqData.push(batch.slice(i * itemReqIndex, (i + 1) * itemReqIndex));
            }
            results = yield (yield Promise.all(reqData.map((i) => __awaiter(this, void 0, void 0, function* () {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const d = yield connection._rpcBatchRequest(i);
                return d.map((ii) => ii.result.value);
            })))).flat();
        }
        else {
            try {
                results = yield Promise.all(transactions.map((transaction) => __awaiter(this, void 0, void 0, function* () { return yield (yield connection.simulateTransaction(transaction)).value; })));
            }
            catch (error) {
                if (error instanceof Error) {
                    return logger.throwError('failed to get info for multiple accounts', logger_1.Logger.errors.RPC_ERROR, {
                        message: error.message,
                    });
                }
            }
        }
        return results;
    });
}
exports.simulateTransaction = simulateTransaction;
function splitTxAndSigners({ connection, makeTxVersion, innerTransaction, lookupTableCache, computeBudgetConfig, payer, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const lookupTableAddressAccount = lookupTableCache !== null && lookupTableCache !== void 0 ? lookupTableCache : {};
        const allLTA = [
            ...new Set(innerTransaction.map((i) => { var _a; return ((_a = i.lookupTableAddress) !== null && _a !== void 0 ? _a : []).map((ii) => ii.toString()); }).flat()),
        ];
        const needCacheLTA = [];
        for (const item of allLTA) {
            if (lookupTableAddressAccount[item] === undefined)
                needCacheLTA.push(new web3_js_1.PublicKey(item));
        }
        const newCacheLTA = yield getMultipleLookupTableInfo({ connection, address: needCacheLTA });
        for (const [key, value] of Object.entries(newCacheLTA))
            lookupTableAddressAccount[key] = value;
        const addComputeBudgetInnerTx = computeBudgetConfig
            ? (0, instrument_1.addComputeBudget)(computeBudgetConfig).innerTransaction
            : undefined;
        const transactions = [];
        let itemIns = [];
        for (const itemInnerTx of innerTransaction) {
            if (itemInnerTx.instructions.length === 0)
                continue;
            const _itemIns = [...itemIns, itemInnerTx];
            const _addComputeBudgetInnerTx = addComputeBudgetInnerTx ? [addComputeBudgetInnerTx, ..._itemIns] : _itemIns;
            if (itemIns.length < 12 &&
                (checkTx({ makeTxVersion, innerIns: _addComputeBudgetInnerTx, payer, lookupTableAddressAccount }) ||
                    checkTx({ makeTxVersion, innerIns: _itemIns, payer, lookupTableAddressAccount }))) {
                itemIns.push(itemInnerTx);
            }
            else {
                if (itemIns.length === 0)
                    throw Error(' item ins too big ');
                let lookupTableAddress = undefined;
                if (makeTxVersion === base_1.TxVersion.V0) {
                    lookupTableAddress = {};
                    for (const item of [
                        ...new Set(itemIns
                            .map((i) => { var _a; return (_a = i.lookupTableAddress) !== null && _a !== void 0 ? _a : []; })
                            .flat()
                            .map((i) => i.toString())),
                    ]) {
                        if (lookupTableAddressAccount[item] !== undefined)
                            lookupTableAddress[item] = lookupTableAddressAccount[item];
                    }
                }
                if (checkTx({
                    makeTxVersion,
                    innerIns: addComputeBudgetInnerTx ? [addComputeBudgetInnerTx, ...itemIns] : itemIns,
                    payer,
                    lookupTableAddressAccount,
                })) {
                    // add fee is ok
                    const _i = addComputeBudgetInnerTx ? [addComputeBudgetInnerTx, ...itemIns] : itemIns;
                    transactions.push({
                        instructionTypes: _i.map((i) => i.instructionTypes).flat(),
                        instructions: _i.map((i) => i.instructions).flat(),
                        signers: itemIns.map((i) => i.signers).flat(),
                        lookupTableAddress,
                    });
                }
                else {
                    transactions.push({
                        instructionTypes: itemIns.map((i) => i.instructionTypes).flat(),
                        instructions: itemIns.map((i) => i.instructions).flat(),
                        signers: itemIns.map((i) => i.signers).flat(),
                        lookupTableAddress,
                    });
                }
                itemIns = [itemInnerTx];
            }
        }
        if (itemIns.length > 0) {
            let lookupTableAddress = undefined;
            if (makeTxVersion === base_1.TxVersion.V0) {
                lookupTableAddress = {};
                for (const item of [
                    ...new Set(itemIns
                        .map((i) => { var _a; return (_a = i.lookupTableAddress) !== null && _a !== void 0 ? _a : []; })
                        .flat()
                        .map((i) => i.toString())),
                ]) {
                    if (lookupTableAddressAccount[item] !== undefined)
                        lookupTableAddress[item] = lookupTableAddressAccount[item];
                }
            }
            if (checkTx({
                makeTxVersion,
                innerIns: addComputeBudgetInnerTx ? [addComputeBudgetInnerTx, ...itemIns] : itemIns,
                payer,
                lookupTableAddressAccount,
            })) {
                const _i = addComputeBudgetInnerTx ? [addComputeBudgetInnerTx, ...itemIns] : itemIns;
                transactions.push({
                    instructionTypes: _i.map((i) => i.instructionTypes).flat(),
                    instructions: _i.map((i) => i.instructions).flat(),
                    signers: itemIns.map((i) => i.signers).flat(),
                    lookupTableAddress,
                });
            }
            else {
                transactions.push({
                    instructionTypes: itemIns.map((i) => i.instructionTypes).flat(),
                    instructions: itemIns.map((i) => i.instructions).flat(),
                    signers: itemIns.map((i) => i.signers).flat(),
                    lookupTableAddress,
                });
            }
        }
        return transactions;
    });
}
exports.splitTxAndSigners = splitTxAndSigners;
function checkTx({ makeTxVersion, innerIns, payer, lookupTableAddressAccount, }) {
    const instructions = innerIns.map((i) => i.instructions).flat();
    const signers = [
        ...new Set(innerIns
            .map((i) => i.signers)
            .flat()
            .map((i) => i.publicKey.toString())),
    ].map((i) => new web3_js_1.PublicKey(i));
    const needLTA = innerIns
        .map((i) => { var _a; return (_a = i.lookupTableAddress) !== null && _a !== void 0 ? _a : []; })
        .flat()
        .map((i) => i.toString());
    const lTaCache = {};
    const _lookupTableAddressAccount = lookupTableAddressAccount !== null && lookupTableAddressAccount !== void 0 ? lookupTableAddressAccount : {};
    for (const item of needLTA) {
        if (_lookupTableAddressAccount[item] !== undefined) {
            lTaCache[item] = _lookupTableAddressAccount[item];
        }
    }
    return makeTxVersion === base_1.TxVersion.V0
        ? _checkV0Tx({ instructions, payer, lookupTableAddressAccount: lTaCache })
        : _checkLegacyTx({ instructions, payer, signers });
}
exports.MAX_BASE64_SIZE = 1644;
function _checkLegacyTx({ instructions, payer, signers, }) {
    return forecastTransactionSize(instructions, [payer, ...signers]);
}
function _checkV0Tx({ instructions, payer, lookupTableAddressAccount, }) {
    const transactionMessage = new web3_js_1.TransactionMessage({
        payerKey: payer,
        recentBlockhash: web3_js_1.Keypair.generate().publicKey.toString(),
        instructions,
    });
    const messageV0 = transactionMessage.compileToV0Message(Object.values(lookupTableAddressAccount !== null && lookupTableAddressAccount !== void 0 ? lookupTableAddressAccount : {}));
    try {
        return Buffer.from(messageV0.serialize()).toString('base64').length < exports.MAX_BASE64_SIZE;
    }
    catch (error) {
        return false;
    }
}
function getMultipleLookupTableInfo({ connection, address, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataInfos = yield getMultipleAccountsInfo(connection, [...new Set(address.map((i) => i.toString()))].map((i) => new web3_js_1.PublicKey(i)));
        const outDict = {};
        for (let i = 0; i < address.length; i++) {
            const info = dataInfos[i];
            const key = address[i];
            if (!info)
                continue;
            outDict[key.toString()] = new web3_js_1.AddressLookupTableAccount({
                key,
                state: web3_js_1.AddressLookupTableAccount.deserialize(info.data),
            });
        }
        return outDict;
    });
}
exports.getMultipleLookupTableInfo = getMultipleLookupTableInfo;
//# sourceMappingURL=web3.js.map