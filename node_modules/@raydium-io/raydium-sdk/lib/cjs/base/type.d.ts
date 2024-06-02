import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { CacheLTA } from '../common';
export interface ComputeBudgetConfig {
    units?: number;
    microLamports?: number;
}
export interface InnerTransaction {
    instructionTypes: InstructionType[];
    instructions: TransactionInstruction[];
    signers: Signer[];
    lookupTableAddress?: PublicKey[];
}
export interface MakeInstructionOutType<T extends {
    [name: string]: PublicKey;
} = {
    [name: string]: PublicKey;
}> {
    address: T;
    innerTransaction: InnerTransaction;
}
export type InnerSimpleTransaction = InnerSimpleLegacyTransaction | InnerSimpleV0Transaction;
export interface InnerSimpleLegacyTransaction {
    instructionTypes: InstructionType[];
    instructions: TransactionInstruction[];
    signers: Signer[];
}
export interface InnerSimpleV0Transaction {
    instructionTypes: InstructionType[];
    instructions: TransactionInstruction[];
    signers: Signer[];
    lookupTableAddress?: CacheLTA;
}
export declare enum TxVersion {
    'V0' = 0,
    'LEGACY' = 1
}
export declare enum InstructionType {
    'createAccount' = 0,
    'initAccount' = 1,
    'createATA' = 2,
    'closeAccount' = 3,
    'transferAmount' = 4,
    'initMint' = 5,
    'mintTo' = 6,
    'initMarket' = 7,// create market main ins
    'util1216OwnerClaim' = 8,// owner claim token ins
    'setComputeUnitPrice' = 9,// addComputeBudget
    'setComputeUnitLimit' = 10,// addComputeBudget
    'clmmCreatePool' = 11,
    'clmmOpenPosition' = 12,
    'clmmIncreasePosition' = 13,
    'clmmDecreasePosition' = 14,
    'clmmClosePosition' = 15,
    'clmmSwapBaseIn' = 16,
    'clmmSwapBaseOut' = 17,
    'clmmInitReward' = 18,
    'clmmSetReward' = 19,
    'clmmCollectReward' = 20,
    'ammV4Swap' = 21,
    'ammV4AddLiquidity' = 22,
    'ammV4RemoveLiquidity' = 23,
    'ammV4SimulatePoolInfo' = 24,
    'ammV4SwapBaseIn' = 25,
    'ammV4SwapBaseOut' = 26,
    'ammV4CreatePool' = 27,
    'ammV4InitPool' = 28,
    'ammV4CreatePoolV2' = 29,
    'ammV5AddLiquidity' = 30,
    'ammV5RemoveLiquidity' = 31,
    'ammV5SimulatePoolInfo' = 32,
    'ammV5SwapBaseIn' = 33,
    'ammV5SwapBaseOut' = 34,
    'routeSwap' = 35,
    'routeSwap1' = 36,
    'routeSwap2' = 37,
    'farmV3Deposit' = 38,
    'farmV3Withdraw' = 39,
    'farmV3CreateLedger' = 40,
    'farmV5Deposit' = 41,
    'farmV5Withdraw' = 42,
    'farmV5CreateLedger' = 43,
    'farmV6Deposit' = 44,
    'farmV6Withdraw' = 45,
    'farmV6Create' = 46,
    'farmV6Restart' = 47,
    'farmV6CreatorAddReward' = 48,
    'farmV6CreatorWithdraw' = 49,
    'test' = 50
}
