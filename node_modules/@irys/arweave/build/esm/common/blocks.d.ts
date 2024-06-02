import type { Tag } from "./lib/transaction.js";
import type FallbackApi from "./lib/fallbackApi.js";
import type Network from "./network.js";
export type BlockData = {
    nonce: string;
    previous_block: string;
    timestamp: number;
    last_retarget: number;
    diff: string;
    height: number;
    hash: string;
    indep_hash: string;
    txs: string[];
    tx_root: string;
    wallet_list: string;
    reward_addr: string;
    tags: Tag[];
    reward_pool: number;
    weave_size: number;
    block_size: number;
    cumulative_diff: string;
    hash_list_merkle: string;
};
export default class Blocks {
    private readonly api;
    private readonly network;
    constructor(api: FallbackApi, network: Network);
    /**
     * Gets a block by its "indep_hash"
     */
    getByHash(indepHash: string): Promise<BlockData>;
    /**
     * Gets a block by its "indep_hash"
     */
    getByHeight(height: number): Promise<BlockData>;
    /**
     * Gets current block data (ie. block with indep_hash = Network.getInfo().current)
     */
    getCurrent(): Promise<BlockData>;
}
