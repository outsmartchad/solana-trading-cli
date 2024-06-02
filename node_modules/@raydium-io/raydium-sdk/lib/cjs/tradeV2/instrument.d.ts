import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { PoolType } from './trade';
export declare function route1Instruction(programId: PublicKey, poolKeyA: PoolType, poolKeyB: PoolType, userSourceToken: PublicKey, userRouteToken: PublicKey, userPdaAccount: PublicKey, ownerWallet: PublicKey, inputMint: PublicKey, amountIn: BN, amountOut: BN, tickArrayA?: PublicKey[]): TransactionInstruction;
export declare function route2Instruction(programId: PublicKey, poolKeyA: PoolType, poolKeyB: PoolType, userRouteToken: PublicKey, userDestinationToken: PublicKey, userPdaAccount: PublicKey, ownerWallet: PublicKey, routeMint: PublicKey, tickArrayB?: PublicKey[]): TransactionInstruction;
export declare function routeInstruction(programId: PublicKey, wallet: PublicKey, userSourceToken: PublicKey, userRouteToken: PublicKey, userDestinationToken: PublicKey, inputMint: string, routeMint: string, poolKeyA: PoolType, poolKeyB: PoolType, amountIn: BN, amountOut: BN, remainingAccounts: (PublicKey[] | undefined)[]): TransactionInstruction;
