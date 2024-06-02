"use strict";
const index_1 = require("./node/index");
const index_2 = require("./web/index");
// this class allows for CJS imports without .default, as well as still allowing for destructured Node/WebIrys imports.
class Arweave extends index_1.Arweave {
}
Arweave.default = Arweave;
Arweave.NodeArweave = index_1.Arweave;
Arweave.WebArweave = index_2.Arweave;
module.exports = Arweave;
//# sourceMappingURL=cjsIndex.js.map