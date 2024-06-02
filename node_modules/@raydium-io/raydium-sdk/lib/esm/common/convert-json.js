import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Currency, CurrencyAmount, Fraction, Percent, Price, TokenAmount } from '../entity';
import { validateAndParsePublicKey } from './pubkey';
function notInnerObject(v) {
    return (typeof v === 'object' &&
        v !== null &&
        ![TokenAmount, PublicKey, Fraction, BN, Currency, CurrencyAmount, Price, Percent].some((o) => typeof o === 'object' && v instanceof o));
}
export function jsonInfo2PoolKeys(jsonInfo) {
    // @ts-expect-error no need type for inner code
    return typeof jsonInfo === 'string'
        ? validateAndParsePublicKey(jsonInfo)
        : Array.isArray(jsonInfo)
            ? jsonInfo.map((k) => jsonInfo2PoolKeys(k))
            : notInnerObject(jsonInfo)
                ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, jsonInfo2PoolKeys(v)]))
                : jsonInfo;
}
export function poolKeys2JsonInfo(jsonInfo) {
    // @ts-expect-error no need type for inner code
    return jsonInfo instanceof PublicKey
        ? jsonInfo.toBase58()
        : Array.isArray(jsonInfo)
            ? jsonInfo.map((k) => poolKeys2JsonInfo(k))
            : notInnerObject(jsonInfo)
                ? Object.fromEntries(Object.entries(jsonInfo).map(([k, v]) => [k, poolKeys2JsonInfo(v)]))
                : jsonInfo;
}
//# sourceMappingURL=convert-json.js.map