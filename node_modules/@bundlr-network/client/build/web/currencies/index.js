"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import AlgorandConfig from "./algorand";
const ethereum_1 = __importDefault(require("./ethereum"));
const near_1 = __importDefault(require("./near"));
const solana_1 = __importDefault(require("./solana"));
const erc20_1 = __importDefault(require("./erc20"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = __importDefault(require("../../common/utils"));
function getCurrency(currency, wallet, providerUrl, contractAddress) {
    switch (currency) {
        case "ethereum":
            return new ethereum_1.default({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://cloudflare-eth.com/", wallet });
        case "matic":
            return new ethereum_1.default({ name: "matic", ticker: "MATIC", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://polygon-rpc.com", wallet, minConfirm: 1 });
        case "arbitrum":
            return new ethereum_1.default({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://arb1.arbitrum.io/rpc", wallet });
        case "bnb":
            return new ethereum_1.default({ name: "bnb", ticker: "BNB", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://bsc-dataseed.binance.org", wallet });
        case "avalanche":
            return new ethereum_1.default({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.avax.network/ext/bc/C/rpc", wallet });
        case "boba-eth":
            return new ethereum_1.default({ name: "boba-eth", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://mainnet.boba.network/", minConfirm: 1, wallet });
        case "boba": {
            const k = new erc20_1.default({ name: "boba", ticker: "BOBA", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://mainnet.boba.network/", contractAddress: contractAddress !== null && contractAddress !== void 0 ? contractAddress : "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", minConfirm: 1, wallet });
            // for L1 mainnet: "https://main-light.eth.linkpool.io/" and "0x42bbfa2e77757c645eeaad1655e0911a7553efbc"
            k.price = async () => {
                var _a;
                const res = await axios_1.default.post("https://api.livecoinwatch.com/coins/single", JSON.stringify({ "currency": "USD", "code": `${k.ticker}` }), { headers: { "x-api-key": "75a7a824-6577-45e6-ad86-511d590c7cc8", "content-type": "application/json" } });
                await utils_1.default.checkAndThrow(res, "Getting price data");
                if (!((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.rate)) {
                    throw new Error(`unable to get price for ${k.name}`);
                }
                return +res.data.rate;
            };
            return k;
        }
        case "solana":
            return new solana_1.default({ name: "solana", ticker: "SOL", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.mainnet-beta.solana.com/", wallet });
        // case "algorand":
        //     return new AlgorandConfig({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl ?? "https://api.mainnet-beta.solana.com/", wallet })
        case "near":
            return new near_1.default({ name: "near", ticker: "NEAR", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://rpc.mainnet.near.org", wallet });
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
exports.default = getCurrency;
//# sourceMappingURL=index.js.map