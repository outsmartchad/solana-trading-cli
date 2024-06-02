"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComputeBudget = void 0;
const web3_js_1 = require("@solana/web3.js");
const base_1 = require("../base");
function addComputeBudget(config) {
    const ins = [];
    const insTypes = [];
    if (config.microLamports) {
        ins.push(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.microLamports }));
        insTypes.push(base_1.InstructionType.setComputeUnitPrice);
    }
    if (config.units) {
        ins.push(web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: config.units }));
        insTypes.push(base_1.InstructionType.setComputeUnitLimit);
    }
    return {
        address: {},
        innerTransaction: {
            instructions: ins,
            signers: [],
            instructionTypes: insTypes,
        },
    };
}
exports.addComputeBudget = addComputeBudget;
//# sourceMappingURL=instrument.js.map