"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletConnection = exports.WalletAccount = exports.ConnectedWalletAccount = exports.Near = exports.KeyPair = exports.Signer = exports.InMemorySigner = exports.Contract = exports.Connection = exports.Account = exports.multisig = exports.validators = exports.transactions = exports.utils = exports.providers = exports.accountCreator = void 0;
/** @hidden @module */
const providers = __importStar(require("./providers"));
exports.providers = providers;
const utils = __importStar(require("./utils"));
exports.utils = utils;
const transactions = __importStar(require("./transaction"));
exports.transactions = transactions;
const validators = __importStar(require("./validators"));
exports.validators = validators;
const account_1 = require("./account");
Object.defineProperty(exports, "Account", { enumerable: true, get: function () { return account_1.Account; } });
const multisig = __importStar(require("./account_multisig"));
exports.multisig = multisig;
const accountCreator = __importStar(require("./account_creator"));
exports.accountCreator = accountCreator;
const connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
const signer_1 = require("./signer");
Object.defineProperty(exports, "Signer", { enumerable: true, get: function () { return signer_1.Signer; } });
Object.defineProperty(exports, "InMemorySigner", { enumerable: true, get: function () { return signer_1.InMemorySigner; } });
const contract_1 = require("./contract");
Object.defineProperty(exports, "Contract", { enumerable: true, get: function () { return contract_1.Contract; } });
const key_pair_1 = require("./utils/key_pair");
Object.defineProperty(exports, "KeyPair", { enumerable: true, get: function () { return key_pair_1.KeyPair; } });
const near_1 = require("./near");
Object.defineProperty(exports, "Near", { enumerable: true, get: function () { return near_1.Near; } });
// TODO: Deprecate and remove WalletAccount
const wallet_account_1 = require("./wallet-account");
Object.defineProperty(exports, "ConnectedWalletAccount", { enumerable: true, get: function () { return wallet_account_1.ConnectedWalletAccount; } });
Object.defineProperty(exports, "WalletAccount", { enumerable: true, get: function () { return wallet_account_1.WalletAccount; } });
Object.defineProperty(exports, "WalletConnection", { enumerable: true, get: function () { return wallet_account_1.WalletConnection; } });
