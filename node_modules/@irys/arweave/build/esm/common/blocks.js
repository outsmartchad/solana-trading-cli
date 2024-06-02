/* eslint-disable @typescript-eslint/naming-convention */
import ArweaveError from "./lib/error.js";
export default class Blocks {
    api;
    network;
    constructor(api, network) {
        this.api = api;
        this.network = network;
    }
    /**
     * Gets a block by its "indep_hash"
     */
    async getByHash(indepHash) {
        const response = await this.api.get(`block/hash/${indepHash}`);
        if (response.status === 200) {
            return response.data;
        }
        else {
            if (response.status === 404) {
                throw new ArweaveError("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
            }
            else {
                throw new Error(`Error while loading block data: ${response}`);
            }
        }
    }
    /**
     * Gets a block by its "indep_hash"
     */
    async getByHeight(height) {
        const response = await this.api.get(`block/height/${height}`);
        if (response.status === 200) {
            return response.data;
        }
        else {
            if (response.status === 404) {
                throw new ArweaveError("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
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
        return await this.getByHash(current);
    }
}
//# sourceMappingURL=blocks.js.map