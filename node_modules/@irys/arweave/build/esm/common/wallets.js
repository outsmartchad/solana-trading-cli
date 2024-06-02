import * as ArweaveUtils from "./lib/utils.js";
export default class Wallets {
    api;
    crypto;
    constructor(api, crypto) {
        this.api = api;
        this.crypto = crypto;
    }
    /**
     * Get the wallet balance for the given address.
     *
     * @param {string} address - The arweave address to get the balance for.
     *
     * @returns {Promise<string>} - Promise which resolves with a winston string balance.
     */
    getBalance(address) {
        return this.api
            .get(`wallet/${address}/balance`, {
            transformResponse: [
                /**
                 * We need to specify a response transformer to override
                 * the default JSON.parse behaviour, as this causes
                 * balances to be converted to a number and we want to
                 * return it as a winston string.
                 * @param data
                 */
                function (data) {
                    return data;
                },
            ],
        })
            .then((response) => {
            return response.data;
        });
    }
    /**
     * Get the last transaction ID for the given wallet address.
     *
     * @param {string} address - The arweave address to get the transaction for.
     *
     * @returns {Promise<string>} - Promise which resolves with a transaction ID.
     */
    getLastTransactionID(address) {
        return this.api.get(`wallet/${address}/last_tx`).then((response) => {
            return response.data;
        });
    }
    generate() {
        return this.crypto.generateJWK();
    }
    async jwkToAddress(jwk) {
        if (!jwk || jwk === "use_wallet") {
            return this.getAddress();
        }
        else {
            return this.getAddress(jwk);
        }
    }
    async getAddress(jwk) {
        if (!jwk || jwk === "use_wallet") {
            try {
                await arweaveWallet.connect(["ACCESS_ADDRESS"]);
            }
            catch {
                // Permission is already granted
            }
            return arweaveWallet.getActiveAddress();
        }
        else {
            return this.ownerToAddress(jwk.n);
        }
    }
    async ownerToAddress(owner) {
        return ArweaveUtils.bufferTob64Url(await this.crypto.hash(ArweaveUtils.b64UrlToBuffer(owner)));
    }
}
//# sourceMappingURL=wallets.js.map