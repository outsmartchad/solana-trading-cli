import CommonArweave from "../common/index.js";
import WebCryptoDriver from "./webcrypto-driver.js";
export class Arweave extends CommonArweave {
    /**
     * Constructor for a new `Arweave` instance - this one uses the web crypto driver
     * @param gatways - Specify the Arweave gateway(s) you want to use for requests
     * @param options - Other configuration options
     * @param options.miners - A list of Arweave miners (peers) to use for requests
     * @param options.gateways - A list of Arweave miners (peers) to use for requests
     */
    constructor(gateways, options) {
        super({ crypto: options?.crypto ?? new WebCryptoDriver(), ...options, gateways: gateways ?? "https://arweave.net" });
    }
    static init(apiConfig) {
        return new Arweave(apiConfig);
    }
}
export const WebArweave = Arweave;
export default Arweave;
//# sourceMappingURL=arweave.js.map