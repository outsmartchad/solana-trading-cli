import { concatBuffers, stringToBuffer } from "../common/lib/utils.js";
export default class WebCryptoDriver {
    keyLength = 4096;
    publicExponent = 0x10001;
    hashAlgorithm = "sha256";
    driver;
    constructor() {
        this.driver = crypto?.subtle;
    }
    async generateJWK() {
        const cryptoKey = await this.driver.generateKey({
            name: "RSA-PSS",
            modulusLength: 4096,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: {
                name: "SHA-256",
            },
        }, true, ["sign"]);
        const jwk = await this.driver.exportKey("jwk", cryptoKey.privateKey);
        return {
            kty: jwk.kty,
            e: jwk.e,
            n: jwk.n,
            d: jwk.d,
            p: jwk.p,
            q: jwk.q,
            dp: jwk.dp,
            dq: jwk.dq,
            qi: jwk.qi,
        };
    }
    async sign(jwk, data, { saltLength } = { saltLength: 32 }) {
        const signature = await this.driver.sign({
            name: "RSA-PSS",
            saltLength,
        }, await this.jwkToCryptoKey(jwk), data);
        return new Uint8Array(signature);
    }
    async hash(data, algorithm = "SHA-256") {
        const digest = await this.driver.digest(algorithm, data);
        return new Uint8Array(digest);
    }
    async verify(publicModulus, data, signature) {
        const publicKey = {
            kty: "RSA",
            e: "AQAB",
            n: publicModulus,
        };
        const key = await this.jwkToPublicCryptoKey(publicKey);
        const digest = await this.driver.digest("SHA-256", data);
        const salt0 = await this.driver.verify({
            name: "RSA-PSS",
            saltLength: 0,
        }, key, signature, data);
        const salt32 = await this.driver.verify({
            name: "RSA-PSS",
            saltLength: 32,
        }, key, signature, data);
        // saltN's salt-length is derived from a formula described here
        // https://developer.mozilla.org/en-US/docs/Web/API/RsaPssParams
        const saltN = await this.driver.verify({
            name: "RSA-PSS",
            saltLength: Math.ceil((key.algorithm.modulusLength - 1) / 8) - digest.byteLength - 2,
        }, key, signature, data);
        return salt0 || salt32 || saltN;
    }
    async jwkToCryptoKey(jwk) {
        return this.driver.importKey("jwk", jwk, {
            name: "RSA-PSS",
            hash: {
                name: "SHA-256",
            },
        }, false, ["sign"]);
    }
    async jwkToPublicCryptoKey(publicJwk) {
        return this.driver.importKey("jwk", publicJwk, {
            name: "RSA-PSS",
            hash: {
                name: "SHA-256",
            },
        }, false, ["verify"]);
    }
    // private detectWebCrypto() {
    //   if (typeof crypto === "undefined") {
    //     return false;
    //   }
    //   const subtle = crypto?.subtle;
    //   if (subtle === undefined) {
    //     return false;
    //   }
    //   const names = ["generateKey", "importKey", "exportKey", "digest", "sign"] as const;
    //   return names.every((name) => typeof subtle[name] === "function");
    // }
    async encrypt(data, key, salt) {
        const initialKey = await this.driver.importKey("raw", typeof key === "string" ? stringToBuffer(key) : key, {
            name: "PBKDF2",
            length: 32,
        }, false, ["deriveKey"]);
        // const salt = ArweaveUtils.stringToBuffer("salt");
        // create a random string for deriving the key
        // const salt = this.driver.randomBytes(16).toString('hex');
        const derivedkey = await this.driver.deriveKey({
            name: "PBKDF2",
            salt: salt ? stringToBuffer(salt) : stringToBuffer("salt"),
            iterations: 100000,
            hash: "SHA-256",
        }, initialKey, {
            name: "AES-CBC",
            length: 256,
        }, false, ["encrypt", "decrypt"]);
        const iv = new Uint8Array(16);
        crypto.getRandomValues(iv);
        const encryptedData = await this.driver.encrypt({
            name: "AES-CBC",
            iv: iv,
        }, derivedkey, data);
        return concatBuffers([iv, encryptedData]);
    }
    async decrypt(encrypted, key, salt) {
        const initialKey = await this.driver.importKey("raw", typeof key === "string" ? stringToBuffer(key) : key, {
            name: "PBKDF2",
            length: 32,
        }, false, ["deriveKey"]);
        // const salt = ArweaveUtils.stringToBuffer("pepper");
        const derivedkey = await this.driver.deriveKey({
            name: "PBKDF2",
            salt: salt ? stringToBuffer(salt) : stringToBuffer("salt"),
            iterations: 100000,
            hash: "SHA-256",
        }, initialKey, {
            name: "AES-CBC",
            length: 256,
        }, false, ["encrypt", "decrypt"]);
        const iv = encrypted.slice(0, 16);
        const data = await this.driver.decrypt({
            name: "AES-CBC",
            iv: iv,
        }, derivedkey, encrypted.slice(16));
        // We're just using concat to convert from an array buffer to uint8array
        return concatBuffers([data]);
    }
}
//# sourceMappingURL=webcrypto-driver.js.map