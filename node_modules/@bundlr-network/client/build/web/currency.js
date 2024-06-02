"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedstonePrice = void 0;
const arweave_1 = __importDefault(require("arweave"));
const base64url_1 = __importDefault(require("base64url"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = __importDefault(require("../common/utils"));
class BaseWebCurrency {
    constructor(config) {
        this.minConfirm = 5;
        this.isSlow = false;
        this.needsFee = true;
        Object.assign(this, config);
    }
    // common methods
    get address() {
        return this._address;
    }
    async ready() {
        this._address = this.wallet ? this.ownerToAddress(await this.getPublicKey()) : undefined;
    }
    async getId(item) {
        return base64url_1.default.encode(Buffer.from(await arweave_1.default.crypto.hash(await item.rawSignature())));
    }
    async price() {
        return getRedstonePrice(this.ticker);
    }
}
exports.default = BaseWebCurrency;
async function getRedstonePrice(currency) {
    const res = await axios_1.default.get(`https://api.redstone.finance/prices?symbol=${currency}&provider=redstone&limit=1`);
    await utils_1.default.checkAndThrow(res, "Getting price data");
    return res.data[0].value;
}
exports.getRedstonePrice = getRedstonePrice;
//# sourceMappingURL=currency.js.map