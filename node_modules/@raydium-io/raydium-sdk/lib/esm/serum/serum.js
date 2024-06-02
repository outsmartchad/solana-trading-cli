import { PublicKey } from '@solana/web3.js';
import { Logger } from '../common';
import { SERUM_PROGRAMID_TO_VERSION, SERUM_VERSION_TO_PROGRAMID } from './id';
import { MARKET_VERSION_TO_STATE_LAYOUT } from './layout';
const logger = Logger.from('Serum');
export class Market {
    /* ================= get version and program id ================= */
    static getProgramId(version) {
        const programId = SERUM_VERSION_TO_PROGRAMID[version];
        logger.assertArgument(!!programId, 'invalid version', 'version', version);
        return programId;
    }
    static getVersion(programId) {
        const programIdString = programId.toBase58();
        const version = SERUM_PROGRAMID_TO_VERSION[programIdString];
        logger.assertArgument(!!version, 'invalid program id', 'programId', programIdString);
        return version;
    }
    /* ================= get layout ================= */
    static getStateLayout(version) {
        const STATE_LAYOUT = MARKET_VERSION_TO_STATE_LAYOUT[version];
        logger.assertArgument(!!STATE_LAYOUT, 'invalid version', 'version', version);
        return STATE_LAYOUT;
    }
    static getLayouts(version) {
        return { state: this.getStateLayout(version) };
    }
    /* ================= get key ================= */
    static getAssociatedAuthority({ programId, marketId }) {
        const seeds = [marketId.toBuffer()];
        let nonce = 0;
        let publicKey;
        while (nonce < 100) {
            try {
                // Buffer.alloc(7) nonce u64
                const seedsWithNonce = seeds.concat(Buffer.from([nonce]), Buffer.alloc(7));
                publicKey = PublicKey.createProgramAddressSync(seedsWithNonce, programId);
            }
            catch (err) {
                if (err instanceof TypeError) {
                    throw err;
                }
                nonce++;
                continue;
            }
            return { publicKey, nonce };
        }
        return logger.throwArgumentError('unable to find a viable program address nonce', 'params', {
            programId,
            marketId,
        });
    }
}
//# sourceMappingURL=serum.js.map