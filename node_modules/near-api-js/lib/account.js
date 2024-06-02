"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
const depd_1 = __importDefault(require("depd"));
const transaction_1 = require("./transaction");
const providers_1 = require("./providers");
const borsh_1 = require("borsh");
const key_pair_1 = require("./utils/key_pair");
const errors_1 = require("./utils/errors");
const rpc_errors_1 = require("./utils/rpc_errors");
const constants_1 = require("./constants");
const exponential_backoff_1 = __importDefault(require("./utils/exponential-backoff"));
// Default number of retries with different nonce before giving up on a transaction.
const TX_NONCE_RETRY_NUMBER = 12;
// Default wait until next retry in millis.
const TX_NONCE_RETRY_WAIT = 500;
// Exponential back off for waiting to retry.
const TX_NONCE_RETRY_WAIT_BACKOFF = 1.5;
function parseJsonFromRawResponse(response) {
    return JSON.parse(Buffer.from(response).toString());
}
function bytesJsonStringify(input) {
    return Buffer.from(JSON.stringify(input));
}
/**
 * This class provides common account related RPC calls including signing transactions with a {@link KeyPair}.
 *
 * @example {@link https://docs.near.org/docs/develop/front-end/naj-quick-reference#account}
 * @hint Use {@link WalletConnection} in the browser to redirect to {@link https://docs.near.org/docs/tools/near-wallet | NEAR Wallet} for Account/key management using the {@link BrowserLocalStorageKeyStore}.
 * @see {@link https://nomicon.io/DataStructures/Account.html | Account Spec}
 */
class Account {
    constructor(connection, accountId) {
        /** @hidden */
        this.accessKeyByPublicKeyCache = {};
        this.connection = connection;
        this.accountId = accountId;
    }
    /** @hidden */
    get ready() {
        const deprecate = depd_1.default('Account.ready()');
        deprecate('not needed anymore, always ready');
        return Promise.resolve();
    }
    async fetchState() {
        const deprecate = depd_1.default('Account.fetchState()');
        deprecate('use `Account.state()` instead');
    }
    /**
     * Returns basic NEAR account information via the `view_account` RPC query method
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-account}
     */
    async state() {
        return this.connection.provider.query({
            request_type: 'view_account',
            account_id: this.accountId,
            finality: 'optimistic'
        });
    }
    /** @hidden */
    printLogsAndFailures(contractId, results) {
        if (!process.env["NEAR_NO_LOGS"]) {
            for (const result of results) {
                console.log(`Receipt${result.receiptIds.length > 1 ? 's' : ''}: ${result.receiptIds.join(', ')}`);
                this.printLogs(contractId, result.logs, '\t');
                if (result.failure) {
                    console.warn(`\tFailure [${contractId}]: ${result.failure}`);
                }
            }
        }
    }
    /** @hidden */
    printLogs(contractId, logs, prefix = '') {
        if (!process.env["NEAR_NO_LOGS"]) {
            for (const log of logs) {
                console.log(`${prefix}Log [${contractId}]: ${log}`);
            }
        }
    }
    /**
     * Create a signed transaction which can be broadcast to the network
     * @param receiverId NEAR account receiving the transaction
     * @param actions list of actions to perform as part of the transaction
     * @see {@link JsonRpcProvider.sendTransaction}
     */
    async signTransaction(receiverId, actions) {
        const accessKeyInfo = await this.findAccessKey(receiverId, actions);
        if (!accessKeyInfo) {
            throw new providers_1.TypedError(`Can not sign transactions for account ${this.accountId} on network ${this.connection.networkId}, no matching key pair found in ${this.connection.signer}.`, 'KeyNotFound');
        }
        const { accessKey } = accessKeyInfo;
        const block = await this.connection.provider.block({ finality: 'final' });
        const blockHash = block.header.hash;
        const nonce = ++accessKey.nonce;
        return await transaction_1.signTransaction(receiverId, nonce, actions, borsh_1.baseDecode(blockHash), this.connection.signer, this.accountId, this.connection.networkId);
    }
    signAndSendTransaction(...args) {
        if (typeof args[0] === 'string') {
            return this.signAndSendTransactionV1(args[0], args[1]);
        }
        else {
            return this.signAndSendTransactionV2(args[0]);
        }
    }
    signAndSendTransactionV1(receiverId, actions) {
        const deprecate = depd_1.default('Account.signAndSendTransaction(receiverId, actions');
        deprecate('use `Account.signAndSendTransaction(SignAndSendTransactionOptions)` instead');
        return this.signAndSendTransactionV2({ receiverId, actions });
    }
    async signAndSendTransactionV2({ receiverId, actions, returnError }) {
        let txHash, signedTx;
        // TODO: TX_NONCE (different constants for different uses of exponentialBackoff?)
        const result = await exponential_backoff_1.default(TX_NONCE_RETRY_WAIT, TX_NONCE_RETRY_NUMBER, TX_NONCE_RETRY_WAIT_BACKOFF, async () => {
            [txHash, signedTx] = await this.signTransaction(receiverId, actions);
            const publicKey = signedTx.transaction.publicKey;
            try {
                return await this.connection.provider.sendTransaction(signedTx);
            }
            catch (error) {
                if (error.type === 'InvalidNonce') {
                    errors_1.logWarning(`Retrying transaction ${receiverId}:${borsh_1.baseEncode(txHash)} with new nonce.`);
                    delete this.accessKeyByPublicKeyCache[publicKey.toString()];
                    return null;
                }
                if (error.type === 'Expired') {
                    errors_1.logWarning(`Retrying transaction ${receiverId}:${borsh_1.baseEncode(txHash)} due to expired block hash`);
                    return null;
                }
                error.context = new providers_1.ErrorContext(borsh_1.baseEncode(txHash));
                throw error;
            }
        });
        if (!result) {
            // TODO: This should have different code actually, as means "transaction not submitted for sure"
            throw new providers_1.TypedError('nonce retries exceeded for transaction. This usually means there are too many parallel requests with the same access key.', 'RetriesExceeded');
        }
        const flatLogs = [result.transaction_outcome, ...result.receipts_outcome].reduce((acc, it) => {
            if (it.outcome.logs.length ||
                (typeof it.outcome.status === 'object' && typeof it.outcome.status.Failure === 'object')) {
                return acc.concat({
                    'receiptIds': it.outcome.receipt_ids,
                    'logs': it.outcome.logs,
                    'failure': typeof it.outcome.status.Failure != 'undefined' ? rpc_errors_1.parseRpcError(it.outcome.status.Failure) : null
                });
            }
            else
                return acc;
        }, []);
        this.printLogsAndFailures(signedTx.transaction.receiverId, flatLogs);
        if (!returnError && typeof result.status === 'object' && typeof result.status.Failure === 'object') {
            // if error data has error_message and error_type properties, we consider that node returned an error in the old format
            if (result.status.Failure.error_message && result.status.Failure.error_type) {
                throw new providers_1.TypedError(`Transaction ${result.transaction_outcome.id} failed. ${result.status.Failure.error_message}`, result.status.Failure.error_type);
            }
            else {
                throw rpc_errors_1.parseResultError(result);
            }
        }
        // TODO: if Tx is Unknown or Started.
        return result;
    }
    /**
     * Finds the {@link AccessKeyView} associated with the accounts {@link PublicKey} stored in the {@link KeyStore}.
     *
     * @todo Find matching access key based on transaction (i.e. receiverId and actions)
     *
     * @param receiverId currently unused (see todo)
     * @param actions currently unused (see todo)
     * @returns `{ publicKey PublicKey; accessKey: AccessKeyView }`
     */
    async findAccessKey(receiverId, actions) {
        // TODO: Find matching access key based on transaction (i.e. receiverId and actions)
        const publicKey = await this.connection.signer.getPublicKey(this.accountId, this.connection.networkId);
        if (!publicKey) {
            return null;
        }
        const cachedAccessKey = this.accessKeyByPublicKeyCache[publicKey.toString()];
        if (cachedAccessKey !== undefined) {
            return { publicKey, accessKey: cachedAccessKey };
        }
        try {
            const accessKey = await this.connection.provider.query({
                request_type: 'view_access_key',
                account_id: this.accountId,
                public_key: publicKey.toString(),
                finality: 'optimistic'
            });
            // this function can be called multiple times and retrieve the same access key
            // this checks to see if the access key was already retrieved and cached while
            // the above network call was in flight. To keep nonce values in line, we return
            // the cached access key.
            if (this.accessKeyByPublicKeyCache[publicKey.toString()]) {
                return { publicKey, accessKey: this.accessKeyByPublicKeyCache[publicKey.toString()] };
            }
            this.accessKeyByPublicKeyCache[publicKey.toString()] = accessKey;
            return { publicKey, accessKey };
        }
        catch (e) {
            if (e.type == 'AccessKeyDoesNotExist') {
                return null;
            }
            throw e;
        }
    }
    /**
     * Create a new account and deploy a contract to it
     *
     * @param contractId NEAR account where the contract is deployed
     * @param publicKey The public key to add to the created contract account
     * @param data The compiled contract code
     * @param amount of NEAR to transfer to the created contract account. Transfer enough to pay for storage https://docs.near.org/docs/concepts/storage-staking
     */
    async createAndDeployContract(contractId, publicKey, data, amount) {
        const accessKey = transaction_1.fullAccessKey();
        await this.signAndSendTransaction({
            receiverId: contractId,
            actions: [transaction_1.createAccount(), transaction_1.transfer(amount), transaction_1.addKey(key_pair_1.PublicKey.from(publicKey), accessKey), transaction_1.deployContract(data)]
        });
        const contractAccount = new Account(this.connection, contractId);
        return contractAccount;
    }
    /**
     * @param receiverId NEAR account receiving Ⓝ
     * @param amount Amount to send in yoctoⓃ
     */
    async sendMoney(receiverId, amount) {
        return this.signAndSendTransaction({
            receiverId,
            actions: [transaction_1.transfer(amount)]
        });
    }
    /**
     * @param newAccountId NEAR account name to be created
     * @param publicKey A public key created from the masterAccount
     */
    async createAccount(newAccountId, publicKey, amount) {
        const accessKey = transaction_1.fullAccessKey();
        return this.signAndSendTransaction({
            receiverId: newAccountId,
            actions: [transaction_1.createAccount(), transaction_1.transfer(amount), transaction_1.addKey(key_pair_1.PublicKey.from(publicKey), accessKey)]
        });
    }
    /**
     * @param beneficiaryId The NEAR account that will receive the remaining Ⓝ balance from the account being deleted
     */
    async deleteAccount(beneficiaryId) {
        return this.signAndSendTransaction({
            receiverId: this.accountId,
            actions: [transaction_1.deleteAccount(beneficiaryId)]
        });
    }
    /**
     * @param data The compiled contract code
     */
    async deployContract(data) {
        return this.signAndSendTransaction({
            receiverId: this.accountId,
            actions: [transaction_1.deployContract(data)]
        });
    }
    async functionCall(...args) {
        if (typeof args[0] === 'string') {
            return this.functionCallV1(args[0], args[1], args[2], args[3], args[4]);
        }
        else {
            return this.functionCallV2(args[0]);
        }
    }
    functionCallV1(contractId, methodName, args, gas, amount) {
        const deprecate = depd_1.default('Account.functionCall(contractId, methodName, args, gas, amount)');
        deprecate('use `Account.functionCall(FunctionCallOptions)` instead');
        args = args || {};
        this.validateArgs(args);
        return this.signAndSendTransaction({
            receiverId: contractId,
            actions: [transaction_1.functionCall(methodName, args, gas || constants_1.DEFAULT_FUNCTION_CALL_GAS, amount)]
        });
    }
    functionCallV2({ contractId, methodName, args = {}, gas = constants_1.DEFAULT_FUNCTION_CALL_GAS, attachedDeposit, walletMeta, walletCallbackUrl, stringify }) {
        this.validateArgs(args);
        const stringifyArg = stringify === undefined ? transaction_1.stringifyJsonOrBytes : stringify;
        return this.signAndSendTransaction({
            receiverId: contractId,
            actions: [transaction_1.functionCall(methodName, args, gas, attachedDeposit, stringifyArg)],
            walletMeta,
            walletCallbackUrl
        });
    }
    /**
     * @see {@link https://docs.near.org/docs/concepts/account#access-keys}
     * @todo expand this API to support more options.
     * @param publicKey A public key to be associated with the contract
     * @param contractId NEAR account where the contract is deployed
     * @param methodNames The method names on the contract that should be allowed to be called. Pass null for no method names and '' or [] for any method names.
     * @param amount Payment in yoctoⓃ that is sent to the contract during this function call
     */
    async addKey(publicKey, contractId, methodNames, amount) {
        if (!methodNames) {
            methodNames = [];
        }
        if (!Array.isArray(methodNames)) {
            methodNames = [methodNames];
        }
        let accessKey;
        if (!contractId) {
            accessKey = transaction_1.fullAccessKey();
        }
        else {
            accessKey = transaction_1.functionCallAccessKey(contractId, methodNames, amount);
        }
        return this.signAndSendTransaction({
            receiverId: this.accountId,
            actions: [transaction_1.addKey(key_pair_1.PublicKey.from(publicKey), accessKey)]
        });
    }
    /**
     * @param publicKey The public key to be deleted
     * @returns {Promise<FinalExecutionOutcome>}
     */
    async deleteKey(publicKey) {
        return this.signAndSendTransaction({
            receiverId: this.accountId,
            actions: [transaction_1.deleteKey(key_pair_1.PublicKey.from(publicKey))]
        });
    }
    /**
     * @see {@link https://docs.near.org/docs/validator/staking-overview}
     *
     * @param publicKey The public key for the account that's staking
     * @param amount The account to stake in yoctoⓃ
     */
    async stake(publicKey, amount) {
        return this.signAndSendTransaction({
            receiverId: this.accountId,
            actions: [transaction_1.stake(amount, key_pair_1.PublicKey.from(publicKey))]
        });
    }
    /** @hidden */
    validateArgs(args) {
        const isUint8Array = args.byteLength !== undefined && args.byteLength === args.length;
        if (isUint8Array) {
            return;
        }
        if (Array.isArray(args) || typeof args !== 'object') {
            throw new errors_1.PositionalArgsError();
        }
    }
    /**
     * Invoke a contract view function using the RPC API.
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#call-a-contract-function}
     *
     * @param contractId NEAR account where the contract is deployed
     * @param methodName The view-only method (no state mutations) name on the contract as it is written in the contract code
     * @param args Any arguments to the view contract method, wrapped in JSON
     * @param options.parse Parse the result of the call. Receives a Buffer (bytes array) and converts it to any object. By default result will be treated as json.
     * @param options.stringify Convert input arguments into a bytes array. By default the input is treated as a JSON.
     * @returns {Promise<any>}
     */
    async viewFunction(contractId, methodName, args = {}, { parse = parseJsonFromRawResponse, stringify = bytesJsonStringify } = {}) {
        this.validateArgs(args);
        const serializedArgs = stringify(args).toString('base64');
        const result = await this.connection.provider.query({
            request_type: 'call_function',
            account_id: contractId,
            method_name: methodName,
            args_base64: serializedArgs,
            finality: 'optimistic'
        });
        if (result.logs) {
            this.printLogs(contractId, result.logs);
        }
        return result.result && result.result.length > 0 && parse(Buffer.from(result.result));
    }
    /**
     * Returns the state (key value pairs) of this account's contract based on the key prefix.
     * Pass an empty string for prefix if you would like to return the entire state.
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-contract-state}
     *
     * @param prefix allows to filter which keys should be returned. Empty prefix means all keys. String prefix is utf-8 encoded.
     * @param blockQuery specifies which block to query state at. By default returns last "optimistic" block (i.e. not necessarily finalized).
     */
    async viewState(prefix, blockQuery = { finality: 'optimistic' }) {
        const { values } = await this.connection.provider.query({
            request_type: 'view_state',
            ...blockQuery,
            account_id: this.accountId,
            prefix_base64: Buffer.from(prefix).toString('base64')
        });
        return values.map(({ key, value }) => ({
            key: Buffer.from(key, 'base64'),
            value: Buffer.from(value, 'base64')
        }));
    }
    /**
     * Get all access keys for the account
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-access-key-list}
     */
    async getAccessKeys() {
        const response = await this.connection.provider.query({
            request_type: 'view_access_key_list',
            account_id: this.accountId,
            finality: 'optimistic'
        });
        // A breaking API change introduced extra information into the
        // response, so it now returns an object with a `keys` field instead
        // of an array: https://github.com/nearprotocol/nearcore/pull/1789
        if (Array.isArray(response)) {
            return response;
        }
        return response.keys;
    }
    /**
     * Returns a list of authorized apps
     * @todo update the response value to return all the different keys, not just app keys.
     */
    async getAccountDetails() {
        // TODO: update the response value to return all the different keys, not just app keys.
        // Also if we need this function, or getAccessKeys is good enough.
        const accessKeys = await this.getAccessKeys();
        const authorizedApps = accessKeys
            .filter(item => item.access_key.permission !== 'FullAccess')
            .map(item => {
            const perm = item.access_key.permission;
            return {
                contractId: perm.FunctionCall.receiver_id,
                amount: perm.FunctionCall.allowance,
                publicKey: item.public_key,
            };
        });
        return { authorizedApps };
    }
    /**
     * Returns calculated account balance
     */
    async getAccountBalance() {
        const protocolConfig = await this.connection.provider.experimental_protocolConfig({ finality: 'final' });
        const state = await this.state();
        const costPerByte = new bn_js_1.default(protocolConfig.runtime_config.storage_amount_per_byte);
        const stateStaked = new bn_js_1.default(state.storage_usage).mul(costPerByte);
        const staked = new bn_js_1.default(state.locked);
        const totalBalance = new bn_js_1.default(state.amount).add(staked);
        const availableBalance = totalBalance.sub(bn_js_1.default.max(staked, stateStaked));
        return {
            total: totalBalance.toString(),
            stateStaked: stateStaked.toString(),
            staked: staked.toString(),
            available: availableBalance.toString()
        };
    }
}
exports.Account = Account;
