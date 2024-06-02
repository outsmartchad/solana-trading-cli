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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spl = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const base_1 = require("../base");
const pda_1 = require("../base/pda");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
const token_1 = require("../token");
const layout_1 = require("./layout");
// https://github.com/solana-labs/solana-program-library/tree/master/token/js/client
class Spl {
    static getAssociatedTokenAccount({ mint, owner, programId, }) {
        // return getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, owner, true);
        return (0, pda_1.getATAAddress)(owner, mint, programId).publicKey;
    }
    static makeCreateAssociatedTokenAccountInstruction({ programId, mint, associatedAccount, owner, payer, instructionsType, }) {
        instructionsType.push(base_1.InstructionType.createATA);
        return (0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, associatedAccount, owner, mint, programId);
    }
    // https://github.com/solana-labs/solana-program-library/blob/master/token/js/client/token.js
    static makeCreateWrappedNativeAccountInstructions({ connection, owner, payer, amount, 
    // baseRentExemption,
    commitment, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const instructions = [];
            const instructionTypes = [];
            // Allocate memory for the account
            // baseRentExemption = getMinimumBalanceForRentExemption size is 0
            // -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0", "id":1, "method":"getMinimumBalanceForRentExemption", "params":[0]}'
            // baseRentExemption = perByteRentExemption * 128
            // balanceNeeded = baseRentExemption / 128 * (dataSize + 128)
            const balanceNeeded = yield connection.getMinimumBalanceForRentExemption(layout_1.SPL_ACCOUNT_LAYOUT.span, commitment);
            // Create a new account
            const lamports = (0, entity_1.parseBigNumberish)(amount).add(new bn_js_1.default(balanceNeeded));
            const newAccount = (0, base_1.generatePubKey)({ fromPublicKey: payer, programId: common_1.TOKEN_PROGRAM_ID });
            instructions.push(web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: payer,
                basePubkey: payer,
                seed: newAccount.seed,
                newAccountPubkey: newAccount.publicKey,
                lamports: lamports.toNumber(),
                space: layout_1.SPL_ACCOUNT_LAYOUT.span,
                programId: common_1.TOKEN_PROGRAM_ID,
            }));
            instructionTypes.push(base_1.InstructionType.createAccount);
            // * merge this instruction into SystemProgram.createAccount
            // * will save transaction size ~17(441-424) bytes
            // Send lamports to it (these will be wrapped into native tokens by the token program)
            // instructions.push(
            //   SystemProgram.transfer({
            //     fromPubkey: payer,
            //     toPubkey: newAccount.publicKey,
            //     lamports: parseBigNumberish(amount).toNumber(),
            //   }),
            // );
            // Assign the new account to the native token mint.
            // the account will be initialized with a balance equal to the native token balance.
            // (i.e. amount)
            instructions.push(this.makeInitAccountInstruction({
                programId: common_1.TOKEN_PROGRAM_ID,
                mint: (0, common_1.validateAndParsePublicKey)(token_1.WSOL.mint),
                tokenAccount: newAccount.publicKey,
                owner,
                instructionTypes,
            }));
            return {
                address: { newAccount: newAccount.publicKey },
                innerTransaction: {
                    instructions,
                    signers: [],
                    lookupTableAddress: [],
                    instructionTypes,
                },
            };
        });
    }
    static insertCreateWrappedNativeAccount({ connection, owner, payer, amount, instructions, instructionsType, signers, commitment, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const ins = yield this.makeCreateWrappedNativeAccountInstructions({
                connection,
                owner,
                payer,
                amount,
                commitment,
            });
            instructions.push(...ins.innerTransaction.instructions);
            signers.push(...ins.innerTransaction.signers);
            instructionsType.push(...ins.innerTransaction.instructionTypes);
            return ins.address.newAccount;
        });
    }
    static makeInitMintInstruction({ programId, mint, decimals, mintAuthority, freezeAuthority = null, instructionTypes, }) {
        instructionTypes.push(base_1.InstructionType.initMint);
        return (0, spl_token_1.createInitializeMintInstruction)(mint, decimals, mintAuthority, freezeAuthority, programId);
    }
    static makeMintToInstruction({ programId, mint, dest, authority, amount, multiSigners = [], instructionTypes, }) {
        instructionTypes.push(base_1.InstructionType.mintTo);
        return (0, spl_token_1.createMintToInstruction)(mint, dest, authority, BigInt(String(amount)), multiSigners, programId);
    }
    static makeInitAccountInstruction({ programId, mint, tokenAccount, owner, instructionTypes, }) {
        instructionTypes.push(base_1.InstructionType.initAccount);
        return (0, spl_token_1.createInitializeAccountInstruction)(tokenAccount, mint, owner, programId);
    }
    static makeTransferInstruction({ programId, source, destination, owner, amount, multiSigners = [], instructionsType, }) {
        instructionsType.push(base_1.InstructionType.transferAmount);
        return (0, spl_token_1.createTransferInstruction)(source, destination, owner, BigInt(String(amount)), multiSigners, programId);
    }
    static makeCloseAccountInstruction({ programId, tokenAccount, owner, payer, multiSigners = [], instructionsType, }) {
        instructionsType.push(base_1.InstructionType.closeAccount);
        return (0, spl_token_1.createCloseAccountInstruction)(tokenAccount, payer, owner, multiSigners, programId);
    }
    static createInitAccountInstruction(programId, mint, account, owner) {
        const keys = [
            {
                pubkey: account,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: mint,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: owner,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: common_1.SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ];
        const dataLayout = (0, marshmallow_1.u8)('instruction');
        const data = Buffer.alloc(dataLayout.span);
        dataLayout.encode(1, data);
        return new web3_js_1.TransactionInstruction({
            keys,
            programId,
            data,
        });
    }
}
exports.Spl = Spl;
//# sourceMappingURL=spl.js.map