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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSignInMessageSignerWalletAdapter = exports.BaseMessageSignerWalletAdapter = exports.BaseSignerWalletAdapter = void 0;
const adapter_js_1 = require("./adapter.js");
const errors_js_1 = require("./errors.js");
const transaction_js_1 = require("./transaction.js");
class BaseSignerWalletAdapter extends adapter_js_1.BaseWalletAdapter {
    sendTransaction(transaction, connection, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let emit = true;
            try {
                if ((0, transaction_js_1.isVersionedTransaction)(transaction)) {
                    if (!this.supportedTransactionVersions)
                        throw new errors_js_1.WalletSendTransactionError(`Sending versioned transactions isn't supported by this wallet`);
                    if (!this.supportedTransactionVersions.has(transaction.version))
                        throw new errors_js_1.WalletSendTransactionError(`Sending transaction version ${transaction.version} isn't supported by this wallet`);
                    try {
                        transaction = yield this.signTransaction(transaction);
                        const rawTransaction = transaction.serialize();
                        return yield connection.sendRawTransaction(rawTransaction, options);
                    }
                    catch (error) {
                        // If the error was thrown by `signTransaction`, rethrow it and don't emit a duplicate event
                        if (error instanceof errors_js_1.WalletSignTransactionError) {
                            emit = false;
                            throw error;
                        }
                        throw new errors_js_1.WalletSendTransactionError(error === null || error === void 0 ? void 0 : error.message, error);
                    }
                }
                else {
                    try {
                        const { signers } = options, sendOptions = __rest(options, ["signers"]);
                        transaction = yield this.prepareTransaction(transaction, connection, sendOptions);
                        (signers === null || signers === void 0 ? void 0 : signers.length) && transaction.partialSign(...signers);
                        transaction = yield this.signTransaction(transaction);
                        const rawTransaction = transaction.serialize();
                        return yield connection.sendRawTransaction(rawTransaction, sendOptions);
                    }
                    catch (error) {
                        // If the error was thrown by `signTransaction`, rethrow it and don't emit a duplicate event
                        if (error instanceof errors_js_1.WalletSignTransactionError) {
                            emit = false;
                            throw error;
                        }
                        throw new errors_js_1.WalletSendTransactionError(error === null || error === void 0 ? void 0 : error.message, error);
                    }
                }
            }
            catch (error) {
                if (emit) {
                    this.emit('error', error);
                }
                throw error;
            }
        });
    }
    signAllTransactions(transactions) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const transaction of transactions) {
                if ((0, transaction_js_1.isVersionedTransaction)(transaction)) {
                    if (!this.supportedTransactionVersions)
                        throw new errors_js_1.WalletSignTransactionError(`Signing versioned transactions isn't supported by this wallet`);
                    if (!this.supportedTransactionVersions.has(transaction.version))
                        throw new errors_js_1.WalletSignTransactionError(`Signing transaction version ${transaction.version} isn't supported by this wallet`);
                }
            }
            const signedTransactions = [];
            for (const transaction of transactions) {
                signedTransactions.push(yield this.signTransaction(transaction));
            }
            return signedTransactions;
        });
    }
}
exports.BaseSignerWalletAdapter = BaseSignerWalletAdapter;
class BaseMessageSignerWalletAdapter extends BaseSignerWalletAdapter {
}
exports.BaseMessageSignerWalletAdapter = BaseMessageSignerWalletAdapter;
class BaseSignInMessageSignerWalletAdapter extends BaseMessageSignerWalletAdapter {
}
exports.BaseSignInMessageSignerWalletAdapter = BaseSignInMessageSignerWalletAdapter;
//# sourceMappingURL=signer.js.map