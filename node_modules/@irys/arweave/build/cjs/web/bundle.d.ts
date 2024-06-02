import WebArweave from "./arweave";
declare global {
    interface Window {
        Arweave: typeof WebArweave;
    }
    var Arweave: typeof WebArweave;
}
