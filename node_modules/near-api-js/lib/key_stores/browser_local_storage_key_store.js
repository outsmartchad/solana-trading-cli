"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserLocalStorageKeyStore = void 0;
const keystore_1 = require("./keystore");
const key_pair_1 = require("../utils/key_pair");
const LOCAL_STORAGE_KEY_PREFIX = 'near-api-js:keystore:';
/**
 * This class is used to store keys in the browsers local storage.
 *
 * @example {@link https://docs.near.org/docs/develop/front-end/naj-quick-reference#key-store}
 * @example
 * ```js
 * import { connect, keyStores } from 'near-api-js';
 *
 * const keyStore = new keyStores.BrowserLocalStorageKeyStore();
 * const config = {
 *   keyStore, // instance of BrowserLocalStorageKeyStore
 *   networkId: 'testnet',
 *   nodeUrl: 'https://rpc.testnet.near.org',
 *   walletUrl: 'https://wallet.testnet.near.org',
 *   helperUrl: 'https://helper.testnet.near.org',
 *   explorerUrl: 'https://explorer.testnet.near.org'
 * };
 *
 * // inside an async function
 * const near = await connect(config)
 * ```
 */
class BrowserLocalStorageKeyStore extends keystore_1.KeyStore {
    /**
     * @param localStorage defaults to window.localStorage
     * @param prefix defaults to `near-api-js:keystore:`
     */
    constructor(localStorage = window.localStorage, prefix = LOCAL_STORAGE_KEY_PREFIX) {
        super();
        this.localStorage = localStorage;
        this.prefix = prefix;
    }
    /**
     * Stores a {@link KeyPair} in local storage.
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     * @param keyPair The key pair to store in local storage
     */
    async setKey(networkId, accountId, keyPair) {
        this.localStorage.setItem(this.storageKeyForSecretKey(networkId, accountId), keyPair.toString());
    }
    /**
     * Gets a {@link KeyPair} from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     * @returns {Promise<KeyPair>}
     */
    async getKey(networkId, accountId) {
        const value = this.localStorage.getItem(this.storageKeyForSecretKey(networkId, accountId));
        if (!value) {
            return null;
        }
        return key_pair_1.KeyPair.fromString(value);
    }
    /**
     * Removes a {@link KeyPair} from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the key pair
     */
    async removeKey(networkId, accountId) {
        this.localStorage.removeItem(this.storageKeyForSecretKey(networkId, accountId));
    }
    /**
     * Removes all items that start with `prefix` from local storage
     */
    async clear() {
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                this.localStorage.removeItem(key);
            }
        }
    }
    /**
     * Get the network(s) from local storage
     * @returns {Promise<string[]>}
     */
    async getNetworks() {
        const result = new Set();
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                const parts = key.substring(this.prefix.length).split(':');
                result.add(parts[1]);
            }
        }
        return Array.from(result.values());
    }
    /**
     * Gets the account(s) from local storage
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @returns{Promise<string[]>}
     */
    async getAccounts(networkId) {
        const result = new Array();
        for (const key of this.storageKeys()) {
            if (key.startsWith(this.prefix)) {
                const parts = key.substring(this.prefix.length).split(':');
                if (parts[1] === networkId) {
                    result.push(parts[0]);
                }
            }
        }
        return result;
    }
    /**
     * @hidden
     * Helper function to retrieve a local storage key
     * @param networkId The targeted network. (ex. default, betanet, etc…)
     * @param accountId The NEAR account tied to the storage keythat's sought
     * @returns {string} An example might be: `near-api-js:keystore:near-friend:default`
     */
    storageKeyForSecretKey(networkId, accountId) {
        return `${this.prefix}${accountId}:${networkId}`;
    }
    /** @hidden */
    *storageKeys() {
        for (let i = 0; i < this.localStorage.length; i++) {
            yield this.localStorage.key(i);
        }
    }
}
exports.BrowserLocalStorageKeyStore = BrowserLocalStorageKeyStore;
