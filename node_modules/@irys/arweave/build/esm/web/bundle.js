import WebArweave from "./arweave.js";
if (typeof globalThis === "object") {
    globalThis.Arweave = WebArweave;
}
else if (typeof self === "object") {
    self.Arweave = WebArweave;
}
//# sourceMappingURL=bundle.js.map