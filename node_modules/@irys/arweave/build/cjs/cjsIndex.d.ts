import { Arweave as NodeArweave } from "./node/index";
import { Arweave as WebArweave } from "./web/index";
declare class Arweave extends NodeArweave {
    static default: typeof Arweave;
    static NodeArweave: typeof NodeArweave;
    static WebArweave: typeof WebArweave;
}
export = Arweave;
