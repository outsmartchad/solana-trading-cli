import { PublicKey } from '@solana/web3.js';
/* ================= program public keys ================= */
export const _STABLE_PROGRAM_ID_V1 = '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h';
export const STABLE_PROGRAM_ID_V1 = new PublicKey(_STABLE_PROGRAM_ID_V1);
// stable program id string => stable version
export const STABLE_PROGRAMID_TO_VERSION = {
    [_STABLE_PROGRAM_ID_V1]: 1,
};
// stable version => serum version
export const LIQUIDITY_VERSION_TO_SERUM_VERSION = {
    1: 3,
};
//# sourceMappingURL=id.js.map