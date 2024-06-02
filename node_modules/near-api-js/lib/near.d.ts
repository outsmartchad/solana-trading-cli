/**
 * This module contains the main class developers will use to interact with NEAR.
 * The {@link Near} class is used to interact with {@link Account | Accounts} through the {@link JsonRpcProvider.JsonRpcProvider | JsonRpcProvider}.
 * It is configured via the {@link NearConfig}.
 *
 * @example {@link https://docs.near.org/docs/develop/front-end/naj-quick-reference#account}
 *
 * @module near
 */
import BN from 'bn.js';
import { Account } from './account';
import { Connection } from './connection';
import { Signer } from './signer';
import { Contract } from './contract';
import { PublicKey } from './utils/key_pair';
import { AccountCreator } from './account_creator';
import { KeyStore } from './key_stores';
export interface NearConfig {
    /** Holds {@link KeyPair | KeyPairs} for signing transactions */
    keyStore?: KeyStore;
    /** @hidden */
    signer?: Signer;
    /** @deprecated use {@link NearConfig.keyStore} */
    deps?: {
        keyStore: KeyStore;
    };
    /**
     * {@link https://github.com/near/near-contract-helper | NEAR Contract Helper} url used to create accounts if no master account is provided
     * @see {@link UrlAccountCreator}
     */
    helperUrl?: string;
    /**
     * The balance transferred from the {@link NearConfig.masterAccount | masterAccount} to a created account
     * @see {@link LocalAccountCreator}
     */
    initialBalance?: string;
    /**
     * The account to use when creating new accounts
     * @see {@link LocalAccountCreator}
     */
    masterAccount?: string;
    /**
     * {@link KeyPair | KeyPairs} are stored in a {@link KeyStore} under the `networkId` namespace.
     */
    networkId: string;
    /**
     * NEAR RPC API url. used to make JSON RPC calls to interact with NEAR.
     * @see {@link JsonRpcProvider.JsonRpcProvider | JsonRpcProvider}
     */
    nodeUrl: string;
    /**
     * NEAR RPC API headers. Can be used to pass API KEY and other parameters.
     * @see {@link JsonRpcProvider.JsonRpcProvider | JsonRpcProvider}
     */
    headers: {
        [key: string]: string | number;
    };
    /**
     * NEAR wallet url used to redirect users to their wallet in browser applications.
     * @see {@link https://docs.near.org/docs/tools/near-wallet}
     */
    walletUrl?: string;
}
/**
 * This is the main class developers should use to interact with NEAR.
 * @example
 * ```js
 * const near = new Near(config);
 * ```
 */
export declare class Near {
    readonly config: any;
    readonly connection: Connection;
    readonly accountCreator: AccountCreator;
    constructor(config: NearConfig);
    /**
     * @param accountId near accountId used to interact with the network.
     */
    account(accountId: string): Promise<Account>;
    /**
     * Create an account using the {@link AccountCreator}. Either:
     * * using a masterAccount with {@link LocalAccountCreator}
     * * using the helperUrl with {@link UrlAccountCreator}
     * @see {@link NearConfig.masterAccount} and {@link NearConfig.helperUrl}-
     *
     * @param accountId
     * @param publicKey
     */
    createAccount(accountId: string, publicKey: PublicKey): Promise<Account>;
    /**
     * @deprecated Use {@link Contract} instead.
     * @param contractId
     * @param options
     */
    loadContract(contractId: string, options: {
        viewMethods: string[];
        changeMethods: string[];
        sender: string;
    }): Promise<Contract>;
    /**
     * @deprecated Use {@link Account.sendMoney} instead.
     * @param amount
     * @param originator
     * @param receiver
     */
    sendTokens(amount: BN, originator: string, receiver: string): Promise<string>;
}
