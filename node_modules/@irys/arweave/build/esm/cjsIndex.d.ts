import { Arweave as NodeArweave } from "./node/index.js";
import { Arweave as WebArweave } from "./web/index.js";
declare class Arweave extends NodeArweave {
    static default: typeof Arweave;
    static NodeArweave: typeof NodeArweave;
    static WebArweave: typeof WebArweave;
}
export = Arweave;
