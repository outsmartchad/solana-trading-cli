import { ComputeBudgetProgram } from '@solana/web3.js';
import { InstructionType } from '../base';
export function addComputeBudget(config) {
    const ins = [];
    const insTypes = [];
    if (config.microLamports) {
        ins.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.microLamports }));
        insTypes.push(InstructionType.setComputeUnitPrice);
    }
    if (config.units) {
        ins.push(ComputeBudgetProgram.setComputeUnitLimit({ units: config.units }));
        insTypes.push(InstructionType.setComputeUnitLimit);
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
//# sourceMappingURL=instrument.js.map