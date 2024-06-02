"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("./lib/error"));
require("arconnect");
class Blocks {
    api;
    network;
    static HASH_ENDPOINT = "block/hash/";
    static HEIGHT_ENDPOINT = "block/height/";
    constructor(api, network) {
        this.api = api;
        this.network = network;
    }
    /**
     * Gets a block by its "indep_hash"
     */
    async get(indepHash) {
        const response = await this.api.get(`${Blocks.HASH_ENDPOINT}${indepHash}`);
        if (response.status === 200) {
            return response.data;
        }
        else {
            if (response.status === 404) {
                throw new error_1.default("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
            }
            else {
                throw new Error(`Error while loading block data: ${response}`);
            }
        }
    }
    /**
     * Gets a block by its "height"
     */
    async getByHeight(height) {
        const response = await this.api.get(`${Blocks.HEIGHT_ENDPOINT}${height}`);
        if (response.status === 200) {
            return response.data;
        }
        else {
            if (response.status === 404) {
                throw new error_1.default("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
            }
            else {
                throw new Error(`Error while loading block data: ${response}`);
            }
        }
    }
    /**
     * Gets current block data (ie. block with indep_hash = Network.getInfo().current)
     */
    async getCurrent() {
        const { current } = await this.network.getInfo();
        return await this.get(current);
    }
}
exports.default = Blocks;
//# sourceMappingURL=blocks.js.map