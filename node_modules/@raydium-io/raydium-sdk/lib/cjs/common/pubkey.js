"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountMetaReadonly = exports.AccountMeta = exports.findProgramAddress = exports.validateAndParsePublicKey = exports.INSTRUCTION_PROGRAM_ID = exports.METADATA_PROGRAM_ID = exports.RENT_PROGRAM_ID = exports.MEMO_PROGRAM_ID = exports.SYSTEM_PROGRAM_ID = exports.SYSVAR_RENT_PUBKEY = exports.SYSVAR_CLOCK_PUBKEY = exports.TOKEN_PROGRAM_ID = exports.ASSOCIATED_TOKEN_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("./logger");
const logger = logger_1.Logger.from('common/pubkey');
/* ================= global public keys ================= */
var spl_token_1 = require("@solana/spl-token");
Object.defineProperty(exports, "ASSOCIATED_TOKEN_PROGRAM_ID", { enumerable: true, get: function () { return spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID; } });
Object.defineProperty(exports, "TOKEN_PROGRAM_ID", { enumerable: true, get: function () { return spl_token_1.TOKEN_PROGRAM_ID; } });
var web3_js_2 = require("@solana/web3.js");
Object.defineProperty(exports, "SYSVAR_CLOCK_PUBKEY", { enumerable: true, get: function () { return web3_js_2.SYSVAR_CLOCK_PUBKEY; } });
Object.defineProperty(exports, "SYSVAR_RENT_PUBKEY", { enumerable: true, get: function () { return web3_js_2.SYSVAR_RENT_PUBKEY; } });
exports.SYSTEM_PROGRAM_ID = web3_js_1.SystemProgram.programId;
exports.MEMO_PROGRAM_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
exports.RENT_PROGRAM_ID = new web3_js_1.PublicKey('SysvarRent111111111111111111111111111111111');
exports.METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
exports.INSTRUCTION_PROGRAM_ID = new web3_js_1.PublicKey('Sysvar1nstructions1111111111111111111111111');
function validateAndParsePublicKey(publicKey) {
    if (publicKey instanceof web3_js_1.PublicKey) {
        return publicKey;
    }
    if (typeof publicKey === 'string') {
        try {
            const key = new web3_js_1.PublicKey(publicKey);
            return key;
        }
        catch (_a) {
            return logger.throwArgumentError('invalid public key', 'publicKey', publicKey);
        }
    }
    return logger.throwArgumentError('invalid public key', 'publicKey', publicKey);
}
exports.validateAndParsePublicKey = validateAndParsePublicKey;
function findProgramAddress(seeds, programId) {
    const [publicKey, nonce] = web3_js_1.PublicKey.findProgramAddressSync(seeds, programId);
    return { publicKey, nonce };
}
exports.findProgramAddress = findProgramAddress;
function AccountMeta(publicKey, isSigner) {
    return {
        pubkey: publicKey,
        isWritable: true,
        isSigner,
    };
}
exports.AccountMeta = AccountMeta;
function AccountMetaReadonly(publicKey, isSigner) {
    return {
        pubkey: publicKey,
        isWritable: false,
        isSigner,
    };
}
exports.AccountMetaReadonly = AccountMetaReadonly;
//# sourceMappingURL=pubkey.js.map