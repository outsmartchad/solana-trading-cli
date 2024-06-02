import CommonArweave from "../common/index.js";
import NodeCryptoDriver from "./node-driver.js";
import { Stream } from "./stream/index.js";
export class Arweave extends CommonArweave {
    stream;
    /**
     * Constructor for a new `Arweave` instance - this one uses the node crypto driver
     * @param gateways - Specify the Arweave gateway(s) you want to use for requests
     * @param options - Other configuration options
     * @param options.miners - A list of Arweave miners (peers) to use for requests
     * @param options.gateways - A list of Arweave miners (peers) to use for requests
     */
    constructor(gateways, options) {
        super({ crypto: options?.crypto ?? new NodeCryptoDriver(), ...options, gateways: gateways ?? "https://arweave.net" });
        this.stream = new Stream({
            deps: { crypto: this.crypto, api: this.api, merkle: this.merkle, transactions: this.transactions, deepHash: this.deepHash },
        });
    }
    static init(apiConfig) {
        return new Arweave(apiConfig);
    }
}
export const NodeArweave = Arweave;
export default Arweave;
//# sourceMappingURL=arweave.js.map