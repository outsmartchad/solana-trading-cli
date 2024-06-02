/// <reference types="node" />
import BN from 'bn.js';
import { Action, SignedTransaction } from './transaction';
import { FinalExecutionOutcome } from './providers';
import { Finality, BlockId, AccountView, AccessKeyView, AccessKeyInfoView } from './providers/provider';
import { Connection } from './connection';
import { PublicKey } from './utils/key_pair';
export interface AccountBalance {
    total: string;
    stateStaked: string;
    staked: string;
    available: string;
}
export interface AccountAuthorizedApp {
    contractId: string;
    amount: string;
    publicKey: string;
}
/**
 * Options used to initiate sining and sending transactions
 */
export interface SignAndSendTransactionOptions {
    receiverId: string;
    actions: Action[];
    /**
     * Metadata to send the NEAR Wallet if using it to sign transactions.
     * @see {@link RequestSignTransactionsOptions}
     */
    walletMeta?: string;
    /**
     * Callback url to send the NEAR Wallet if using it to sign transactions.
     * @see {@link RequestSignTransactionsOptions}
     */
    walletCallbackUrl?: string;
    returnError?: boolean;
}
/**
 * Options used to initiate a function call (especially a change function call)
 * @see {@link viewFunction} to initiate a view function call
 */
export interface FunctionCallOptions {
    /** The NEAR account id where the contract is deployed */
    contractId: string;
    /** The name of the method to invoke */
    methodName: string;
    /**
     * named arguments to pass the method `{ messageText: 'my message' }`
     */
    args: object;
    /** max amount of gas that method call can use */
    gas?: BN;
    /** amount of NEAR (in yoctoNEAR) to send together with the call */
    attachedDeposit?: BN;
    /**
     * Metadata to send the NEAR Wallet if using it to sign transactions.
     * @see {@link RequestSignTransactionsOptions}
     */
    walletMeta?: string;
    /**
     * Callback url to send the NEAR Wallet if using it to sign transactions.
     * @see {@link RequestSignTransactionsOptions}
     */
    walletCallbackUrl?: string;
    /**
     * Convert input arguments into bytes array.
     */
    stringify?: (input: any) => Buffer;
}
declare function parseJsonFromRawResponse(response: Uint8Array): any;
declare function bytesJsonStringify(input: any): Buffer;
/**
 * This class provides common account related RPC calls including signing transactions with a {@link KeyPair}.
 *
 * @example {@link https://docs.near.org/docs/develop/front-end/naj-quick-reference#account}
 * @hint Use {@link WalletConnection} in the browser to redirect to {@link https://docs.near.org/docs/tools/near-wallet | NEAR Wallet} for Account/key management using the {@link BrowserLocalStorageKeyStore}.
 * @see {@link https://nomicon.io/DataStructures/Account.html | Account Spec}
 */
export declare class Account {
    readonly connection: Connection;
    readonly accountId: string;
    /** @hidden */
    protected get ready(): Promise<void>;
    constructor(connection: Connection, accountId: string);
    fetchState(): Promise<void>;
    /**
     * Returns basic NEAR account information via the `view_account` RPC query method
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-account}
     */
    state(): Promise<AccountView>;
    /** @hidden */
    private printLogsAndFailures;
    /** @hidden */
    private printLogs;
    /**
     * Create a signed transaction which can be broadcast to the network
     * @param receiverId NEAR account receiving the transaction
     * @param actions list of actions to perform as part of the transaction
     * @see {@link JsonRpcProvider.sendTransaction}
     */
    protected signTransaction(receiverId: string, actions: Action[]): Promise<[Uint8Array, SignedTransaction]>;
    /**
     * Sign a transaction to preform a list of actions and broadcast it using the RPC API.
     * @see {@link JsonRpcProvider.sendTransaction}
     */
    protected signAndSendTransaction({ receiverId, actions }: SignAndSendTransactionOptions): Promise<FinalExecutionOutcome>;
    /**
     * @deprecated
     * Sign a transaction to preform a list of actions and broadcast it using the RPC API.
     * @see {@link JsonRpcProvider.sendTransaction}
     *
     * @param receiverId NEAR account receiving the transaction
     * @param actions list of actions to perform as part of the transaction
     */
    protected signAndSendTransaction(receiverId: string, actions: Action[]): Promise<FinalExecutionOutcome>;
    private signAndSendTransactionV1;
    private signAndSendTransactionV2;
    /** @hidden */
    accessKeyByPublicKeyCache: {
        [key: string]: AccessKeyView;
    };
    /**
     * Finds the {@link AccessKeyView} associated with the accounts {@link PublicKey} stored in the {@link KeyStore}.
     *
     * @todo Find matching access key based on transaction (i.e. receiverId and actions)
     *
     * @param receiverId currently unused (see todo)
     * @param actions currently unused (see todo)
     * @returns `{ publicKey PublicKey; accessKey: AccessKeyView }`
     */
    findAccessKey(receiverId: string, actions: Action[]): Promise<{
        publicKey: PublicKey;
        accessKey: AccessKeyView;
    }>;
    /**
     * Create a new account and deploy a contract to it
     *
     * @param contractId NEAR account where the contract is deployed
     * @param publicKey The public key to add to the created contract account
     * @param data The compiled contract code
     * @param amount of NEAR to transfer to the created contract account. Transfer enough to pay for storage https://docs.near.org/docs/concepts/storage-staking
     */
    createAndDeployContract(contractId: string, publicKey: string | PublicKey, data: Uint8Array, amount: BN): Promise<Account>;
    /**
     * @param receiverId NEAR account receiving Ⓝ
     * @param amount Amount to send in yoctoⓃ
     */
    sendMoney(receiverId: string, amount: BN): Promise<FinalExecutionOutcome>;
    /**
     * @param newAccountId NEAR account name to be created
     * @param publicKey A public key created from the masterAccount
     */
    createAccount(newAccountId: string, publicKey: string | PublicKey, amount: BN): Promise<FinalExecutionOutcome>;
    /**
     * @param beneficiaryId The NEAR account that will receive the remaining Ⓝ balance from the account being deleted
     */
    deleteAccount(beneficiaryId: string): Promise<FinalExecutionOutcome>;
    /**
     * @param data The compiled contract code
     */
    deployContract(data: Uint8Array): Promise<FinalExecutionOutcome>;
    functionCall(props: FunctionCallOptions): Promise<FinalExecutionOutcome>;
    /**
     * @deprecated
     *
     * @param contractId NEAR account where the contract is deployed
     * @param methodName The method name on the contract as it is written in the contract code
     * @param args arguments to pass to method. Can be either plain JS object which gets serialized as JSON automatically
     *  or `Uint8Array` instance which represents bytes passed as is.
     * @param gas max amount of gas that method call can use
     * @param amount amount of NEAR (in yoctoNEAR) to send together with the call
     * @returns {Promise<FinalExecutionOutcome>}
     */
    functionCall(contractId: string, methodName: string, args: any, gas?: BN, amount?: BN): Promise<FinalExecutionOutcome>;
    private functionCallV1;
    private functionCallV2;
    /**
     * @see {@link https://docs.near.org/docs/concepts/account#access-keys}
     * @todo expand this API to support more options.
     * @param publicKey A public key to be associated with the contract
     * @param contractId NEAR account where the contract is deployed
     * @param methodNames The method names on the contract that should be allowed to be called. Pass null for no method names and '' or [] for any method names.
     * @param amount Payment in yoctoⓃ that is sent to the contract during this function call
     */
    addKey(publicKey: string | PublicKey, contractId?: string, methodNames?: string | string[], amount?: BN): Promise<FinalExecutionOutcome>;
    /**
     * @param publicKey The public key to be deleted
     * @returns {Promise<FinalExecutionOutcome>}
     */
    deleteKey(publicKey: string | PublicKey): Promise<FinalExecutionOutcome>;
    /**
     * @see {@link https://docs.near.org/docs/validator/staking-overview}
     *
     * @param publicKey The public key for the account that's staking
     * @param amount The account to stake in yoctoⓃ
     */
    stake(publicKey: string | PublicKey, amount: BN): Promise<FinalExecutionOutcome>;
    /** @hidden */
    private validateArgs;
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
    viewFunction(contractId: string, methodName: string, args?: any, { parse, stringify }?: {
        parse?: typeof parseJsonFromRawResponse;
        stringify?: typeof bytesJsonStringify;
    }): Promise<any>;
    /**
     * Returns the state (key value pairs) of this account's contract based on the key prefix.
     * Pass an empty string for prefix if you would like to return the entire state.
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-contract-state}
     *
     * @param prefix allows to filter which keys should be returned. Empty prefix means all keys. String prefix is utf-8 encoded.
     * @param blockQuery specifies which block to query state at. By default returns last "optimistic" block (i.e. not necessarily finalized).
     */
    viewState(prefix: string | Uint8Array, blockQuery?: {
        blockId: BlockId;
    } | {
        finality: Finality;
    }): Promise<Array<{
        key: Buffer;
        value: Buffer;
    }>>;
    /**
     * Get all access keys for the account
     * @see {@link https://docs.near.org/docs/develop/front-end/rpc#view-access-key-list}
     */
    getAccessKeys(): Promise<AccessKeyInfoView[]>;
    /**
     * Returns a list of authorized apps
     * @todo update the response value to return all the different keys, not just app keys.
     */
    getAccountDetails(): Promise<{
        authorizedApps: AccountAuthorizedApp[];
    }>;
    /**
     * Returns calculated account balance
     */
    getAccountBalance(): Promise<AccountBalance>;
}
export {};
