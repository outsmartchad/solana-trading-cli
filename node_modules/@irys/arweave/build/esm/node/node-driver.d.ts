/// <reference types="node" />
import type { JWKInterface } from "../common/lib/wallet.js";
import type { SignatureOptions } from "../common/lib/crypto/crypto-interface.js";
import type CryptoInterface from "../common/lib/crypto/crypto-interface.js";
export declare class NodeCryptoDriver implements CryptoInterface {
    readonly keyLength = 4096;
    readonly publicExponent = 65537;
    readonly hashAlgorithm = "sha256";
    readonly encryptionAlgorithm = "aes-256-cbc";
    generateJWK(): Promise<JWKInterface>;
    sign(jwk: object, data: Uint8Array, { saltLength }?: SignatureOptions): Promise<Uint8Array>;
    verify(publicModulus: string, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    hash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
    /**
     * If a key is passed as a buffer it *must* be exactly 32 bytes.
     * If a key is passed as a string then any length may be used.
     *
     * @param {Buffer} data
     * @param {(string | Buffer)} key
     * @returns {Promise<Uint8Array>}
     */
    encrypt(data: Buffer, key: string | Buffer, salt?: string): Promise<Uint8Array>;
    /**
     * If a key is passed as a buffer it *must* be exactly 32 bytes.
     * If a key is passed as a string then any length may be used.
     *
     * @param {Buffer} encrypted
     * @param {(string | Buffer)} key
     * @returns {Promise<Uint8Array>}
     */
    decrypt(encrypted: Buffer, key: string | Buffer, salt?: string): Promise<Uint8Array>;
    jwkToPem(jwk: object): string;
    private pemToJWK;
    private parseHashAlgorithm;
}
export default NodeCryptoDriver;
