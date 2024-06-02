import type { JWKInterface } from "../wallet.js";
export type SignatureOptions = {
    saltLength?: number;
};
type CryptoInterface = {
    generateJWK(): Promise<JWKInterface>;
    sign(jwk: JWKInterface, data: Uint8Array, options?: SignatureOptions): Promise<Uint8Array>;
    verify(publicModulus: string, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    encrypt(data: Uint8Array, key: string | Uint8Array, salt?: string): Promise<Uint8Array>;
    decrypt(encrypted: Uint8Array, key: string | Uint8Array, salt?: string): Promise<Uint8Array>;
    hash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
};
export default CryptoInterface;
