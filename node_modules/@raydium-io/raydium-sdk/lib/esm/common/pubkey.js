import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Logger } from './logger';
const logger = Logger.from('common/pubkey');
/* ================= global public keys ================= */
export { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
export { SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');
export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const INSTRUCTION_PROGRAM_ID = new PublicKey('Sysvar1nstructions1111111111111111111111111');
export function validateAndParsePublicKey(publicKey) {
    if (publicKey instanceof PublicKey) {
        return publicKey;
    }
    if (typeof publicKey === 'string') {
        try {
            const key = new PublicKey(publicKey);
            return key;
        }
        catch {
            return logger.throwArgumentError('invalid public key', 'publicKey', publicKey);
        }
    }
    return logger.throwArgumentError('invalid public key', 'publicKey', publicKey);
}
export function findProgramAddress(seeds, programId) {
    const [publicKey, nonce] = PublicKey.findProgramAddressSync(seeds, programId);
    return { publicKey, nonce };
}
export function AccountMeta(publicKey, isSigner) {
    return {
        pubkey: publicKey,
        isWritable: true,
        isSigner,
    };
}
export function AccountMetaReadonly(publicKey, isSigner) {
    return {
        pubkey: publicKey,
        isWritable: false,
        isSigner,
    };
}
//# sourceMappingURL=pubkey.js.map