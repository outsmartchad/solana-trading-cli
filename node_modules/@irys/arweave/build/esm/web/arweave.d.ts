import type { ApiConfig } from "../common/lib/api.js";
import type { AbstractConfig } from "../common/index.js";
import CommonArweave from "../common/index.js";
export declare class Arweave extends CommonArweave {
    /**
     * Constructor for a new `Arweave` instance - this one uses the web crypto driver
     * @param gatways - Specify the Arweave gateway(s) you want to use for requests
     * @param options - Other configuration options
     * @param options.miners - A list of Arweave miners (peers) to use for requests
     * @param options.gateways - A list of Arweave miners (peers) to use for requests
     */
    constructor(gateways?: string | URL | ApiConfig | ApiConfig[] | string[] | URL[], options?: Omit<AbstractConfig, "apiConfig">);
    static init(apiConfig: ApiConfig): Arweave;
}
export declare const WebArweave: typeof Arweave;
export default Arweave;
