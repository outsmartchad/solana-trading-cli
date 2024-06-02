"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const web3 = __importStar(require("@solana/web3.js"));
const arbundles_1 = require("arbundles");
const bs58_1 = __importDefault(require("bs58"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const currency_1 = __importDefault(require("../currency"));
const async_retry_1 = __importDefault(require("async-retry"));
const solanaSigner = arbundles_1.signers.SolanaSigner;
class SolanaConfig extends currency_1.default {
    constructor(config) {
        super(config);
        this.minConfirm = 1;
        this.base = ["lamports", 1e9];
    }
    async getProvider() {
        if (!this.providerInstance) {
            this.providerInstance = new web3.Connection(this.providerUrl, {
                confirmTransactionInitialTimeout: 60000,
                commitment: "confirmed"
            });
        }
        return this.providerInstance;
    }
    getKeyPair() {
        let key = this.wallet;
        if (typeof key !== "string") {
            key = bs58_1.default.encode(Buffer.from(key));
        }
        return web3.Keypair.fromSecretKey(bs58_1.default.decode(key));
    }
    async getTx(txId) {
        const connection = await this.getProvider();
        const stx = await connection.getTransaction(txId, { commitment: "confirmed" });
        if (!stx)
            throw new Error("Confirmed tx not found");
        const currentSlot = await connection.getSlot("confirmed");
        const amount = new bignumber_js_1.default(stx.meta.postBalances[1]).minus(new bignumber_js_1.default(stx.meta.preBalances[1]));
        const tx = {
            from: stx.transaction.message.accountKeys[0].toBase58(),
            to: stx.transaction.message.accountKeys[1].toBase58(),
            amount: amount,
            blockHeight: new bignumber_js_1.default(stx.slot),
            pending: false,
            confirmed: currentSlot - stx.slot >= 1,
        };
        return tx;
    }
    ownerToAddress(owner) {
        return bs58_1.default.encode(owner);
    }
    async sign(data) {
        return await (await this.getSigner()).sign(data);
    }
    getSigner() {
        const keyp = this.getKeyPair();
        const keypb = bs58_1.default.encode(Buffer.concat([Buffer.from(keyp.secretKey), keyp.publicKey.toBuffer()]));
        return new solanaSigner(keypb);
    }
    verify(pub, data, signature) {
        return solanaSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        return new bignumber_js_1.default((await (await this.getProvider()).getEpochInfo()).blockHeight);
    }
    async getFee(_amount, _to) {
        // const connection = await this.getProvider()
        // const block = await connection.getRecentBlockhash();
        // const feeCalc = await connection.getFeeCalculatorForBlockhash(
        //     block.blockhash,
        // );
        // return new BigNumber(feeCalc.value.lamportsPerSignature);
        return new bignumber_js_1.default(5000); // hardcode it for now
    }
    async sendTx(data) {
        const connection = await this.getProvider();
        try {
            return await web3.sendAndConfirmTransaction(connection, data, [this.getKeyPair()], { commitment: "confirmed" });
        }
        catch (e) {
            if (e.message.includes("30.")) {
                const txId = e.message.match(/[A-Za-z0-9]{87,88}/g);
                try {
                    const conf = await connection.confirmTransaction(txId[0], "confirmed");
                    if (conf)
                        return undefined;
                    throw {
                        message: e.message,
                        txId: txId[0]
                    };
                }
                catch (e) {
                    throw {
                        message: e.message,
                        txId: txId[0]
                    };
                }
            }
            throw e;
        }
    }
    async createTx(amount, to, _fee) {
        // TODO: figure out how to manually set fees
        const keys = this.getKeyPair();
        const hash = await (0, async_retry_1.default)(async (bail) => {
            var _a;
            try {
                return (await (await this.getProvider()).getRecentBlockhash()).blockhash;
            }
            catch (e) {
                if ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes("blockhash"))
                    throw e;
                else
                    bail(e);
                throw new Error("Unreachable");
            }
        }, { retries: 3, minTimeout: 1000 });
        const transaction = new web3.Transaction({
            recentBlockhash: hash,
            feePayer: keys.publicKey,
        });
        transaction.add(web3.SystemProgram.transfer({
            fromPubkey: keys.publicKey,
            toPubkey: new web3.PublicKey(to),
            lamports: +new bignumber_js_1.default(amount).toNumber(),
        }));
        const transactionBuffer = transaction.serializeMessage();
        const signature = tweetnacl_1.default.sign.detached(transactionBuffer, keys.secretKey);
        transaction.addSignature(keys.publicKey, Buffer.from(signature));
        return { tx: transaction, txId: undefined };
    }
    getPublicKey() {
        const key = this.getKeyPair();
        return key.publicKey.toBuffer();
    }
}
exports.default = SolanaConfig;
//# sourceMappingURL=solana.js.map