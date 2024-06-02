import { Commitment, Connection, PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { InstructionType } from '../base';
import { BigNumberish } from '../entity';
export declare class Spl {
    static getAssociatedTokenAccount({ mint, owner, programId, }: {
        mint: PublicKey;
        owner: PublicKey;
        programId: PublicKey;
    }): PublicKey;
    static makeCreateAssociatedTokenAccountInstruction({ programId, mint, associatedAccount, owner, payer, instructionsType, }: {
        programId: PublicKey;
        mint: PublicKey;
        associatedAccount: PublicKey;
        owner: PublicKey;
        payer: PublicKey;
        instructionsType: InstructionType[];
    }): TransactionInstruction;
    static makeCreateWrappedNativeAccountInstructions({ connection, owner, payer, amount, commitment, }: {
        connection: Connection;
        owner: PublicKey;
        payer: PublicKey;
        amount: BigNumberish;
        commitment?: Commitment;
    }): Promise<{
        address: {
            newAccount: PublicKey;
        };
        innerTransaction: {
            instructions: TransactionInstruction[];
            signers: never[];
            lookupTableAddress: never[];
            instructionTypes: InstructionType[];
        };
    }>;
    static insertCreateWrappedNativeAccount({ connection, owner, payer, amount, instructions, instructionsType, signers, commitment, }: {
        connection: Connection;
        owner: PublicKey;
        payer: PublicKey;
        amount: BigNumberish;
        instructions: TransactionInstruction[];
        instructionsType: InstructionType[];
        signers: Signer[];
        commitment?: Commitment;
    }): Promise<PublicKey>;
    static makeInitMintInstruction({ programId, mint, decimals, mintAuthority, freezeAuthority, instructionTypes, }: {
        programId: PublicKey;
        mint: PublicKey;
        decimals: number;
        mintAuthority: PublicKey;
        freezeAuthority?: PublicKey | null;
        instructionTypes: InstructionType[];
    }): TransactionInstruction;
    static makeMintToInstruction({ programId, mint, dest, authority, amount, multiSigners, instructionTypes, }: {
        programId: PublicKey;
        mint: PublicKey;
        dest: PublicKey;
        authority: PublicKey;
        amount: BigNumberish;
        multiSigners?: Signer[];
        instructionTypes: InstructionType[];
    }): TransactionInstruction;
    static makeInitAccountInstruction({ programId, mint, tokenAccount, owner, instructionTypes, }: {
        programId: PublicKey;
        mint: PublicKey;
        tokenAccount: PublicKey;
        owner: PublicKey;
        instructionTypes: InstructionType[];
    }): TransactionInstruction;
    static makeTransferInstruction({ programId, source, destination, owner, amount, multiSigners, instructionsType, }: {
        programId: PublicKey;
        source: PublicKey;
        destination: PublicKey;
        owner: PublicKey;
        amount: BigNumberish;
        multiSigners?: Signer[];
        instructionsType: InstructionType[];
    }): TransactionInstruction;
    static makeCloseAccountInstruction({ programId, tokenAccount, owner, payer, multiSigners, instructionsType, }: {
        programId: PublicKey;
        tokenAccount: PublicKey;
        owner: PublicKey;
        payer: PublicKey;
        multiSigners?: Signer[];
        instructionsType: InstructionType[];
    }): TransactionInstruction;
    static createInitAccountInstruction(programId: PublicKey, mint: PublicKey, account: PublicKey, owner: PublicKey): TransactionInstruction;
}
//# sourceMappingURL=spl.d.ts.map