import { publicKey, struct, u32, u64, u8 } from '../marshmallow';
export const SPL_MINT_LAYOUT = struct([
    u32('mintAuthorityOption'),
    publicKey('mintAuthority'),
    u64('supply'),
    u8('decimals'),
    u8('isInitialized'),
    u32('freezeAuthorityOption'),
    publicKey('freezeAuthority'),
]);
// 165 bytes
export const SPL_ACCOUNT_LAYOUT = struct([
    publicKey('mint'),
    publicKey('owner'),
    u64('amount'),
    u32('delegateOption'),
    publicKey('delegate'),
    u8('state'),
    u32('isNativeOption'),
    u64('isNative'),
    u64('delegatedAmount'),
    u32('closeAuthorityOption'),
    publicKey('closeAuthority'),
]);
//# sourceMappingURL=layout.js.map