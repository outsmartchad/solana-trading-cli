import WebArweave from "./arweave.js";
declare global {
    interface Window {
        Arweave: typeof WebArweave;
    }
    var Arweave: typeof WebArweave;
}
