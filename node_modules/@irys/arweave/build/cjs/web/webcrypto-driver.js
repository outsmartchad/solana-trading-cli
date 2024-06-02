"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/lib/utils");
class WebCryptoDriver {
    constructor() {
        this.keyLength = 4096;
        this.publicExponent = 0x10001;
        this.hashAlgorithm = "sha256";
        this.driver = crypto === null || crypto === void 0 ? void 0 : crypto.subtle;
    }
    generateJWK() {
        return __awaiter(this, void 0, void 0, function* () {
            const cryptoKey = yield this.driver.generateKey({
                name: "RSA-PSS",
                modulusLength: 4096,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: {
                    name: "SHA-256",
                },
            }, true, ["sign"]);
            const jwk = yield this.driver.exportKey("jwk", cryptoKey.privateKey);
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
        });
    }
    sign(jwk, data, { saltLength } = { saltLength: 32 }) {
        return __awaiter(this, void 0, void 0, function* () {
            const signature = yield this.driver.sign({
                name: "RSA-PSS",
                saltLength,
            }, yield this.jwkToCryptoKey(jwk), data);
            return new Uint8Array(signature);
        });
    }
    hash(data, algorithm = "SHA-256") {
        return __awaiter(this, void 0, void 0, function* () {
            const digest = yield this.driver.digest(algorithm, data);
            return new Uint8Array(digest);
        });
    }
    verify(publicModulus, data, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = {
                kty: "RSA",
                e: "AQAB",
                n: publicModulus,
            };
            const key = yield this.jwkToPublicCryptoKey(publicKey);
            const digest = yield this.driver.digest("SHA-256", data);
            const salt0 = yield this.driver.verify({
                name: "RSA-PSS",
                saltLength: 0,
            }, key, signature, data);
            const salt32 = yield this.driver.verify({
                name: "RSA-PSS",
                saltLength: 32,
            }, key, signature, data);
            // saltN's salt-length is derived from a formula described here
            // https://developer.mozilla.org/en-US/docs/Web/API/RsaPssParams
            const saltN = yield this.driver.verify({
                name: "RSA-PSS",
                saltLength: Math.ceil((key.algorithm.modulusLength - 1) / 8) - digest.byteLength - 2,
            }, key, signature, data);
            return salt0 || salt32 || saltN;
        });
    }
    jwkToCryptoKey(jwk) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.driver.importKey("jwk", jwk, {
                name: "RSA-PSS",
                hash: {
                    name: "SHA-256",
                },
            }, false, ["sign"]);
        });
    }
    jwkToPublicCryptoKey(publicJwk) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.driver.importKey("jwk", publicJwk, {
                name: "RSA-PSS",
                hash: {
                    name: "SHA-256",
                },
            }, false, ["verify"]);
        });
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
    encrypt(data, key, salt) {
        return __awaiter(this, void 0, void 0, function* () {
            const initialKey = yield this.driver.importKey("raw", typeof key === "string" ? (0, utils_1.stringToBuffer)(key) : key, {
                name: "PBKDF2",
                length: 32,
            }, false, ["deriveKey"]);
            // const salt = ArweaveUtils.stringToBuffer("salt");
            // create a random string for deriving the key
            // const salt = this.driver.randomBytes(16).toString('hex');
            const derivedkey = yield this.driver.deriveKey({
                name: "PBKDF2",
                salt: salt ? (0, utils_1.stringToBuffer)(salt) : (0, utils_1.stringToBuffer)("salt"),
                iterations: 100000,
                hash: "SHA-256",
            }, initialKey, {
                name: "AES-CBC",
                length: 256,
            }, false, ["encrypt", "decrypt"]);
            const iv = new Uint8Array(16);
            crypto.getRandomValues(iv);
            const encryptedData = yield this.driver.encrypt({
                name: "AES-CBC",
                iv: iv,
            }, derivedkey, data);
            return (0, utils_1.concatBuffers)([iv, encryptedData]);
        });
    }
    decrypt(encrypted, key, salt) {
        return __awaiter(this, void 0, void 0, function* () {
            const initialKey = yield this.driver.importKey("raw", typeof key === "string" ? (0, utils_1.stringToBuffer)(key) : key, {
                name: "PBKDF2",
                length: 32,
            }, false, ["deriveKey"]);
            // const salt = ArweaveUtils.stringToBuffer("pepper");
            const derivedkey = yield this.driver.deriveKey({
                name: "PBKDF2",
                salt: salt ? (0, utils_1.stringToBuffer)(salt) : (0, utils_1.stringToBuffer)("salt"),
                iterations: 100000,
                hash: "SHA-256",
            }, initialKey, {
                name: "AES-CBC",
                length: 256,
            }, false, ["encrypt", "decrypt"]);
            const iv = encrypted.slice(0, 16);
            const data = yield this.driver.decrypt({
                name: "AES-CBC",
                iv: iv,
            }, derivedkey, encrypted.slice(16));
            // We're just using concat to convert from an array buffer to uint8array
            return (0, utils_1.concatBuffers)([data]);
        });
    }
}
exports.default = WebCryptoDriver;
//# sourceMappingURL=webcrypto-driver.js.map