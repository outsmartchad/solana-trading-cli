import { ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js'

import { ComputeBudgetConfig, InnerTransaction, InstructionType } from '../base'

export function addComputeBudget(config: ComputeBudgetConfig) {
  const ins: TransactionInstruction[] = []
  const insTypes: InstructionType[] = []
  if (config.microLamports) {
    ins.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.microLamports }))
    insTypes.push(InstructionType.setComputeUnitPrice)
  }
  if (config.units) {
    ins.push(ComputeBudgetProgram.setComputeUnitLimit({ units: config.units }))
    insTypes.push(InstructionType.setComputeUnitLimit)
  }

  return {
    address: {},
    innerTransaction: {
      instructions: ins,
      signers: [],
      instructionTypes: insTypes,
    } as InnerTransaction,
  }
}
