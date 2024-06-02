import { Connection, PublicKey, Signer, Transaction, TransactionInstruction } from '@solana/web3.js';
import { BigNumberish } from '../entity';
import { SplAccount } from '../spl';
import { InstructionType } from './type';
export interface TokenAccount {
    programId: PublicKey;
    pubkey: PublicKey;
    accountInfo: SplAccount;
}
export interface SelectTokenAccountParams {
    tokenAccounts: TokenAccount[];
    programId: PublicKey;
    mint: PublicKey;
    owner: PublicKey;
    config?: {
        associatedOnly?: boolean;
    };
}
export interface HandleTokenAccountParams {
    connection: Connection;
    side: 'in' | 'out';
    amount: BigNumberish;
    programId: PublicKey;
    mint: PublicKey;
    tokenAccount: PublicKey | null;
    owner: PublicKey;
    payer?: PublicKey;
    frontInstructions: TransactionInstruction[];
    endInstructions?: TransactionInstruction[];
    frontInstructionsType: InstructionType[];
    endInstructionsType?: InstructionType[];
    signers: Signer[];
    bypassAssociatedCheck: boolean;
    checkCreateATAOwner: boolean;
}
export interface SelectOrCreateTokenAccountParams {
    programId: PublicKey;
    mint: PublicKey;
    tokenAccounts: TokenAccount[];
    owner: PublicKey;
    createInfo?: {
        connection: Connection;
        payer: PublicKey;
        amount?: BigNumberish;
        frontInstructions: TransactionInstruction[];
        endInstructions?: TransactionInstruction[];
        signers: Signer[];
        frontInstructionsType: InstructionType[];
        endInstructionsType?: InstructionType[];
    };
    associatedOnly: boolean;
    checkCreateATAOwner: boolean;
}
export interface UnsignedTransactionAndSigners {
    transaction: Transaction;
    signers: Signer[];
}
export declare class Base {
    static _selectTokenAccount(params: SelectTokenAccountParams): PublicKey | null;
    static _handleTokenAccount(params: HandleTokenAccountParams): Promise<PublicKey>;
    static _selectOrCreateTokenAccount<T extends SelectOrCreateTokenAccountParams>(params: T): Promise<T['createInfo'] extends undefined ? PublicKey | undefined : PublicKey>;
}
export declare function generatePubKey({ fromPublicKey, programId, }: {
    fromPublicKey: PublicKey;
    programId: PublicKey;
}): {
    publicKey: PublicKey;
    seed: string;
};
//# sourceMappingURL=base.d.ts.map