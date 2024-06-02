"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getATAAddress = void 0;
const web3_js_1 = require("@solana/web3.js");
const common_1 = require("../common");
function getATAAddress(owner, mint, programId) {
    return (0, common_1.findProgramAddress)([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], new web3_js_1.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'));
}
exports.getATAAddress = getATAAddress;
//# sourceMappingURL=pda.js.map