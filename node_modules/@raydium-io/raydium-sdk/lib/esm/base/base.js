import { sha256 } from '@noble/hashes/sha256';
import { AccountLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, SystemProgram, } from '@solana/web3.js';
import { Token } from '../entity';
import { Spl } from '../spl';
import { InstructionType } from './type';
export class Base {
    static _selectTokenAccount(params) {
        const { tokenAccounts, programId, mint, owner, config } = params;
        const { associatedOnly } = {
            // default
            ...{ associatedOnly: true },
            // custom
            ...config,
        };
        const _tokenAccounts = tokenAccounts
            // filter by mint
            .filter(({ accountInfo }) => accountInfo.mint.equals(mint))
            // sort by balance
            .sort((a, b) => (a.accountInfo.amount.lt(b.accountInfo.amount) ? 1 : -1));
        const ata = Spl.getAssociatedTokenAccount({ mint, owner, programId });
        for (const tokenAccount of _tokenAccounts) {
            const { pubkey } = tokenAccount;
            if (associatedOnly) {
                // return ata only
                if (ata.equals(pubkey))
                    return pubkey;
            }
            else {
                // return the first account
                return pubkey;
            }
        }
        return null;
    }
    static async _handleTokenAccount(params) {
        const { connection, side, amount, programId, mint, tokenAccount, owner, payer = owner, frontInstructions, endInstructions, signers, bypassAssociatedCheck, frontInstructionsType, endInstructionsType, checkCreateATAOwner, } = params;
        const ata = Spl.getAssociatedTokenAccount({ mint, owner, programId });
        if (Token.WSOL.mint.equals(mint)) {
            const newTokenAccount = await Spl.insertCreateWrappedNativeAccount({
                connection,
                owner,
                payer,
                instructions: frontInstructions,
                instructionsType: frontInstructionsType,
                signers,
                amount,
            });
            // if no endInstructions provide, no need to close
            if (endInstructions) {
                endInstructions.push(Spl.makeCloseAccountInstruction({
                    programId: TOKEN_PROGRAM_ID,
                    tokenAccount: newTokenAccount,
                    owner,
                    payer,
                    instructionsType: endInstructionsType ?? [],
                }));
            }
            return newTokenAccount;
        }
        else if (!tokenAccount || (side === 'out' && !ata.equals(tokenAccount) && !bypassAssociatedCheck)) {
            const _createATAIns = Spl.makeCreateAssociatedTokenAccountInstruction({
                programId,
                mint,
                associatedAccount: ata,
                owner,
                payer,
                instructionsType: frontInstructionsType,
            });
            if (checkCreateATAOwner) {
                const ataInfo = await connection.getAccountInfo(ata);
                if (ataInfo === null) {
                    frontInstructions.push(_createATAIns);
                }
                else if (ataInfo.owner.equals(TOKEN_PROGRAM_ID) &&
                    AccountLayout.decode(ataInfo.data).mint.equals(mint) &&
                    AccountLayout.decode(ataInfo.data).owner.equals(owner)) {
                    /* empty */
                }
                else {
                    throw Error(`create ata check error -> mint: ${mint.toString()}, ata: ${ata.toString()}`);
                }
            }
            else {
                frontInstructions.push(_createATAIns);
            }
            return ata;
        }
        return tokenAccount;
    }
    static async _selectOrCreateTokenAccount(params) {
        const { mint, tokenAccounts, createInfo, associatedOnly, owner, checkCreateATAOwner, programId } = params;
        const ata = Spl.getAssociatedTokenAccount({ mint, owner, programId });
        const accounts = tokenAccounts
            .filter((i) => i.accountInfo.mint.equals(mint) && (!associatedOnly || i.pubkey.equals(ata)))
            .sort((a, b) => (a.accountInfo.amount.lt(b.accountInfo.amount) ? 1 : -1));
        // find token or don't need create
        if (createInfo === undefined || accounts.length > 0) {
            return accounts.length > 0 ? accounts[0].pubkey : undefined;
        }
        if (associatedOnly) {
            const _createATAIns = Spl.makeCreateAssociatedTokenAccountInstruction({
                programId,
                mint,
                associatedAccount: ata,
                owner,
                payer: createInfo.payer,
                instructionsType: createInfo.frontInstructionsType,
            });
            if (checkCreateATAOwner) {
                const ataInfo = await createInfo.connection.getAccountInfo(ata);
                if (ataInfo === null) {
                    createInfo.frontInstructions.push(_createATAIns);
                }
                else if (ataInfo.owner.equals(programId) &&
                    AccountLayout.decode(ataInfo.data).mint.equals(mint) &&
                    AccountLayout.decode(ataInfo.data).owner.equals(owner)) {
                    /* empty */
                }
                else {
                    throw Error(`create ata check error -> mint: ${mint.toString()}, ata: ${ata.toString()}`);
                }
            }
            else {
                createInfo.frontInstructions.push(_createATAIns);
            }
            if (mint.equals(Token.WSOL.mint) && createInfo.amount) {
                const newTokenAccount = await Spl.insertCreateWrappedNativeAccount({
                    connection: createInfo.connection,
                    owner,
                    payer: createInfo.payer,
                    instructions: createInfo.frontInstructions,
                    instructionsType: createInfo.frontInstructionsType,
                    signers: createInfo.signers,
                    amount: createInfo.amount ?? 0,
                });
                (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({
                    programId: TOKEN_PROGRAM_ID,
                    tokenAccount: newTokenAccount,
                    owner,
                    payer: createInfo.payer,
                    instructionsType: createInfo.endInstructionsType ?? [],
                }));
                if (createInfo.amount) {
                    createInfo.frontInstructions.push(Spl.makeTransferInstruction({
                        programId: TOKEN_PROGRAM_ID,
                        source: newTokenAccount,
                        destination: ata,
                        owner,
                        amount: createInfo.amount,
                        instructionsType: createInfo.frontInstructionsType,
                    }));
                }
            }
            ;
            (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({
                programId,
                tokenAccount: ata,
                owner,
                payer: createInfo.payer,
                instructionsType: createInfo.endInstructionsType ?? [],
            }));
            return ata;
        }
        else {
            if (mint.equals(Token.WSOL.mint)) {
                const newTokenAccount = await Spl.insertCreateWrappedNativeAccount({
                    connection: createInfo.connection,
                    owner,
                    payer: createInfo.payer,
                    instructions: createInfo.frontInstructions,
                    instructionsType: createInfo.frontInstructionsType,
                    signers: createInfo.signers,
                    amount: createInfo.amount ?? 0,
                });
                (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({
                    programId: TOKEN_PROGRAM_ID,
                    tokenAccount: newTokenAccount,
                    owner,
                    payer: createInfo.payer,
                    instructionsType: createInfo.endInstructionsType ?? [],
                }));
                return newTokenAccount;
            }
            else {
                const newTokenAccount = generatePubKey({ fromPublicKey: owner, programId });
                const balanceNeeded = await createInfo.connection.getMinimumBalanceForRentExemption(AccountLayout.span);
                const createAccountIns = SystemProgram.createAccountWithSeed({
                    fromPubkey: owner,
                    basePubkey: owner,
                    seed: newTokenAccount.seed,
                    newAccountPubkey: newTokenAccount.publicKey,
                    lamports: balanceNeeded,
                    space: AccountLayout.span,
                    programId,
                });
                const initAccountIns = Spl.createInitAccountInstruction(programId, mint, newTokenAccount.publicKey, owner);
                createInfo.frontInstructions.push(createAccountIns, initAccountIns);
                createInfo.frontInstructionsType.push(InstructionType.createAccount, InstructionType.initAccount);
                (createInfo.endInstructions ?? []).push(Spl.makeCloseAccountInstruction({
                    programId,
                    tokenAccount: newTokenAccount.publicKey,
                    owner,
                    payer: createInfo.payer,
                    instructionsType: createInfo.endInstructionsType ?? [],
                }));
                return newTokenAccount.publicKey;
            }
        }
    }
}
export function generatePubKey({ fromPublicKey, programId = TOKEN_PROGRAM_ID, }) {
    const seed = Keypair.generate().publicKey.toBase58().slice(0, 32);
    const publicKey = createWithSeed(fromPublicKey, seed, programId);
    return { publicKey, seed };
}
function createWithSeed(fromPublicKey, seed, programId) {
    const buffer = Buffer.concat([fromPublicKey.toBuffer(), Buffer.from(seed), programId.toBuffer()]);
    const publicKeyBytes = sha256(buffer);
    return new PublicKey(publicKeyBytes);
}
//# sourceMappingURL=base.js.map