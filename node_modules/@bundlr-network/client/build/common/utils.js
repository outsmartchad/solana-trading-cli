"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
const bignumber_js_1 = __importDefault(require("bignumber.js"));
bignumber_js_1.default.set({ DECIMAL_PLACES: 50 });
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
class Utils {
    constructor(api, currency, currencyConfig) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
    }
    ;
    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param res an axios response
     * @returns nothing if the status code is 200
     */
    static checkAndThrow(res, context, exceptions) {
        if ((res === null || res === void 0 ? void 0 : res.status) && !(exceptions !== null && exceptions !== void 0 ? exceptions : []).includes(res.status) && res.status != 200) {
            throw new Error(`HTTP Error: ${context}: ${res.status} ${typeof res.data !== "string" ? res.statusText : res.data}`);
        }
        return;
    }
    /**
     * Gets the nonce used for withdrawal request validation from the bundler
     * @returns nonce for the current user
     */
    async getNonce() {
        const res = await this.api.get(`/account/withdrawals/${this.currency}?address=${this.currencyConfig.address}`);
        Utils.checkAndThrow(res, "Getting withdrawal nonce");
        return (res).data;
    }
    /**
     * Gets the balance on the current bundler for the specified user
     * @param address the user's address to query
     * @returns the balance in winston
     */
    async getBalance(address) {
        const res = await this.api.get(`/account/balance/${this.currency}?address=${address}`);
        Utils.checkAndThrow(res, "Getting balance");
        return new bignumber_js_1.default(res.data.balance);
    }
    /**
     * Queries the bundler to get it's address for a specific currency
     * @returns the bundler's address
     */
    async getBundlerAddress(currency) {
        const res = await this.api.get("/info");
        Utils.checkAndThrow(res, "Getting Bundler address");
        const address = res.data.addresses[currency];
        if (!address) {
            throw new Error(`Specified bundler does not support currency ${currency}`);
        }
        return address;
    }
    /**
     * Calculates the price for [bytes] bytes paid for with [currency] for the loaded bundlr node.
     * @param currency
     * @param bytes
     * @returns
     */
    async getPrice(currency, bytes) {
        const res = await this.api.get(`/price/${currency}/${bytes}`);
        Utils.checkAndThrow(res, "Getting storage cost");
        return new bignumber_js_1.default((res).data);
    }
    /**
     * Polls for transaction confirmation (or at least pending status) - used for fast currencies (i.e not arweave)
     * before posting the fund request to the server (so the server doesn't have to poll)
     * @param txid
     * @returns
     */
    async confirmationPoll(txid) {
        if (this.currencyConfig.isSlow) {
            return;
        }
        for (let i = 0; i < 30; i++) {
            await (0, exports.sleep)(1000);
            if (await this.currencyConfig.getTx(txid).then(v => { return v === null || v === void 0 ? void 0 : v.confirmed; }).catch(_ => { return false; })) {
                return;
            }
        }
        // throw new Error(`Tx ${txid} didn't finalize after 30 seconds`);
        console.warn(`Tx ${txid} didn't finalize after 30 seconds`);
    }
    unitConverter(baseUnits) {
        return new bignumber_js_1.default(baseUnits).dividedBy(this.currencyConfig.base[1]);
    }
}
exports.default = Utils;
//# sourceMappingURL=utils.js.map