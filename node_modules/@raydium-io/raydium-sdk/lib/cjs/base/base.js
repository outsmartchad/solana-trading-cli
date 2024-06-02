"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePubKey = exports.Base = void 0;
const sha256_1 = require("@noble/hashes/sha256");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const entity_1 = require("../entity");
const spl_1 = require("../spl");
const type_1 = require("./type");
class Base {
    static _selectTokenAccount(params) {
        const { tokenAccounts, programId, mint, owner, config } = params;
        const { associatedOnly } = Object.assign({ associatedOnly: true }, config);
        const _tokenAccounts = tokenAccounts
            // filter by mint
            .filter(({ accountInfo }) => accountInfo.mint.equals(mint))
            // sort by balance
            .sort((a, b) => (a.accountInfo.amount.lt(b.accountInfo.amount) ? 1 : -1));
        const ata = spl_1.Spl.getAssociatedTokenAccount({ mint, owner, programId });
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
    static _handleTokenAccount(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connection, side, amount, programId, mint, tokenAccount, owner, payer = owner, frontInstructions, endInstructions, signers, bypassAssociatedCheck, frontInstructionsType, endInstructionsType, checkCreateATAOwner, } = params;
            const ata = spl_1.Spl.getAssociatedTokenAccount({ mint, owner, programId });
            if (entity_1.Token.WSOL.mint.equals(mint)) {
                const newTokenAccount = yield spl_1.Spl.insertCreateWrappedNativeAccount({
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
                    endInstructions.push(spl_1.Spl.makeCloseAccountInstruction({
                        programId: spl_token_1.TOKEN_PROGRAM_ID,
                        tokenAccount: newTokenAccount,
                        owner,
                        payer,
                        instructionsType: endInstructionsType !== null && endInstructionsType !== void 0 ? endInstructionsType : [],
                    }));
                }
                return newTokenAccount;
            }
            else if (!tokenAccount || (side === 'out' && !ata.equals(tokenAccount) && !bypassAssociatedCheck)) {
                const _createATAIns = spl_1.Spl.makeCreateAssociatedTokenAccountInstruction({
                    programId,
                    mint,
                    associatedAccount: ata,
                    owner,
                    payer,
                    instructionsType: frontInstructionsType,
                });
                if (checkCreateATAOwner) {
                    const ataInfo = yield connection.getAccountInfo(ata);
                    if (ataInfo === null) {
                        frontInstructions.push(_createATAIns);
                    }
                    else if (ataInfo.owner.equals(spl_token_1.TOKEN_PROGRAM_ID) &&
                        spl_token_1.AccountLayout.decode(ataInfo.data).mint.equals(mint) &&
                        spl_token_1.AccountLayout.decode(ataInfo.data).owner.equals(owner)) {
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
        });
    }
    static _selectOrCreateTokenAccount(params) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return __awaiter(this, void 0, void 0, function* () {
            const { mint, tokenAccounts, createInfo, associatedOnly, owner, checkCreateATAOwner, programId } = params;
            const ata = spl_1.Spl.getAssociatedTokenAccount({ mint, owner, programId });
            const accounts = tokenAccounts
                .filter((i) => i.accountInfo.mint.equals(mint) && (!associatedOnly || i.pubkey.equals(ata)))
                .sort((a, b) => (a.accountInfo.amount.lt(b.accountInfo.amount) ? 1 : -1));
            // find token or don't need create
            if (createInfo === undefined || accounts.length > 0) {
                return accounts.length > 0 ? accounts[0].pubkey : undefined;
            }
            if (associatedOnly) {
                const _createATAIns = spl_1.Spl.makeCreateAssociatedTokenAccountInstruction({
                    programId,
                    mint,
                    associatedAccount: ata,
                    owner,
                    payer: createInfo.payer,
                    instructionsType: createInfo.frontInstructionsType,
                });
                if (checkCreateATAOwner) {
                    const ataInfo = yield createInfo.connection.getAccountInfo(ata);
                    if (ataInfo === null) {
                        createInfo.frontInstructions.push(_createATAIns);
                    }
                    else if (ataInfo.owner.equals(programId) &&
                        spl_token_1.AccountLayout.decode(ataInfo.data).mint.equals(mint) &&
                        spl_token_1.AccountLayout.decode(ataInfo.data).owner.equals(owner)) {
                        /* empty */
                    }
                    else {
                        throw Error(`create ata check error -> mint: ${mint.toString()}, ata: ${ata.toString()}`);
                    }
                }
                else {
                    createInfo.frontInstructions.push(_createATAIns);
                }
                if (mint.equals(entity_1.Token.WSOL.mint) && createInfo.amount) {
                    const newTokenAccount = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                        connection: createInfo.connection,
                        owner,
                        payer: createInfo.payer,
                        instructions: createInfo.frontInstructions,
                        instructionsType: createInfo.frontInstructionsType,
                        signers: createInfo.signers,
                        amount: (_a = createInfo.amount) !== null && _a !== void 0 ? _a : 0,
                    });
                    ((_b = createInfo.endInstructions) !== null && _b !== void 0 ? _b : []).push(spl_1.Spl.makeCloseAccountInstruction({
                        programId: spl_token_1.TOKEN_PROGRAM_ID,
                        tokenAccount: newTokenAccount,
                        owner,
                        payer: createInfo.payer,
                        instructionsType: (_c = createInfo.endInstructionsType) !== null && _c !== void 0 ? _c : [],
                    }));
                    if (createInfo.amount) {
                        createInfo.frontInstructions.push(spl_1.Spl.makeTransferInstruction({
                            programId: spl_token_1.TOKEN_PROGRAM_ID,
                            source: newTokenAccount,
                            destination: ata,
                            owner,
                            amount: createInfo.amount,
                            instructionsType: createInfo.frontInstructionsType,
                        }));
                    }
                }
                ;
                ((_d = createInfo.endInstructions) !== null && _d !== void 0 ? _d : []).push(spl_1.Spl.makeCloseAccountInstruction({
                    programId,
                    tokenAccount: ata,
                    owner,
                    payer: createInfo.payer,
                    instructionsType: (_e = createInfo.endInstructionsType) !== null && _e !== void 0 ? _e : [],
                }));
                return ata;
            }
            else {
                if (mint.equals(entity_1.Token.WSOL.mint)) {
                    const newTokenAccount = yield spl_1.Spl.insertCreateWrappedNativeAccount({
                        connection: createInfo.connection,
                        owner,
                        payer: createInfo.payer,
                        instructions: createInfo.frontInstructions,
                        instructionsType: createInfo.frontInstructionsType,
                        signers: createInfo.signers,
                        amount: (_f = createInfo.amount) !== null && _f !== void 0 ? _f : 0,
                    });
                    ((_g = createInfo.endInstructions) !== null && _g !== void 0 ? _g : []).push(spl_1.Spl.makeCloseAccountInstruction({
                        programId: spl_token_1.TOKEN_PROGRAM_ID,
                        tokenAccount: newTokenAccount,
                        owner,
                        payer: createInfo.payer,
                        instructionsType: (_h = createInfo.endInstructionsType) !== null && _h !== void 0 ? _h : [],
                    }));
                    return newTokenAccount;
                }
                else {
                    const newTokenAccount = generatePubKey({ fromPublicKey: owner, programId });
                    const balanceNeeded = yield createInfo.connection.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span);
                    const createAccountIns = web3_js_1.SystemProgram.createAccountWithSeed({
                        fromPubkey: owner,
                        basePubkey: owner,
                        seed: newTokenAccount.seed,
                        newAccountPubkey: newTokenAccount.publicKey,
                        lamports: balanceNeeded,
                        space: spl_token_1.AccountLayout.span,
                        programId,
                    });
                    const initAccountIns = spl_1.Spl.createInitAccountInstruction(programId, mint, newTokenAccount.publicKey, owner);
                    createInfo.frontInstructions.push(createAccountIns, initAccountIns);
                    createInfo.frontInstructionsType.push(type_1.InstructionType.createAccount, type_1.InstructionType.initAccount);
                    ((_j = createInfo.endInstructions) !== null && _j !== void 0 ? _j : []).push(spl_1.Spl.makeCloseAccountInstruction({
                        programId,
                        tokenAccount: newTokenAccount.publicKey,
                        owner,
                        payer: createInfo.payer,
                        instructionsType: (_k = createInfo.endInstructionsType) !== null && _k !== void 0 ? _k : [],
                    }));
                    return newTokenAccount.publicKey;
                }
            }
        });
    }
}
exports.Base = Base;
function generatePubKey({ fromPublicKey, programId = spl_token_1.TOKEN_PROGRAM_ID, }) {
    const seed = web3_js_1.Keypair.generate().publicKey.toBase58().slice(0, 32);
    const publicKey = createWithSeed(fromPublicKey, seed, programId);
    return { publicKey, seed };
}
exports.generatePubKey = generatePubKey;
function createWithSeed(fromPublicKey, seed, programId) {
    const buffer = Buffer.concat([fromPublicKey.toBuffer(), Buffer.from(seed), programId.toBuffer()]);
    const publicKeyBytes = (0, sha256_1.sha256)(buffer);
    return new web3_js_1.PublicKey(publicKeyBytes);
}
//# sourceMappingURL=base.js.map