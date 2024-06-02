"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Market = void 0;
const web3_js_1 = require("@solana/web3.js");
const common_1 = require("../common");
const id_1 = require("./id");
const layout_1 = require("./layout");
const logger = common_1.Logger.from('Serum');
class Market {
    /* ================= get version and program id ================= */
    static getProgramId(version) {
        const programId = id_1.SERUM_VERSION_TO_PROGRAMID[version];
        logger.assertArgument(!!programId, 'invalid version', 'version', version);
        return programId;
    }
    static getVersion(programId) {
        const programIdString = programId.toBase58();
        const version = id_1.SERUM_PROGRAMID_TO_VERSION[programIdString];
        logger.assertArgument(!!version, 'invalid program id', 'programId', programIdString);
        return version;
    }
    /* ================= get layout ================= */
    static getStateLayout(version) {
        const STATE_LAYOUT = layout_1.MARKET_VERSION_TO_STATE_LAYOUT[version];
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
                publicKey = web3_js_1.PublicKey.createProgramAddressSync(seedsWithNonce, programId);
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
exports.Market = Market;
//# sourceMappingURL=serum.js.map