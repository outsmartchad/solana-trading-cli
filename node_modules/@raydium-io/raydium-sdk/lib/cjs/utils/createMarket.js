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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketV2 = exports.MARKET_STATE_LAYOUT_V2 = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = __importDefault(require("bn.js"));
const base_1 = require("../base");
const common_1 = require("../common");
const entity_1 = require("../entity");
const marshmallow_1 = require("../marshmallow");
function accountFlagsLayout(property = 'accountFlags') {
    const ACCOUNT_FLAGS_LAYOUT = new marshmallow_1.WideBits(property);
    ACCOUNT_FLAGS_LAYOUT.addBoolean('initialized');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('market');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('openOrders');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('requestQueue');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('eventQueue');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('bids');
    ACCOUNT_FLAGS_LAYOUT.addBoolean('asks');
    return ACCOUNT_FLAGS_LAYOUT;
}
exports.MARKET_STATE_LAYOUT_V2 = (0, marshmallow_1.struct)([
    (0, marshmallow_1.blob)(5),
    accountFlagsLayout('accountFlags'),
    (0, marshmallow_1.publicKey)('ownAddress'),
    (0, marshmallow_1.u64)('vaultSignerNonce'),
    (0, marshmallow_1.publicKey)('baseMint'),
    (0, marshmallow_1.publicKey)('quoteMint'),
    (0, marshmallow_1.publicKey)('baseVault'),
    (0, marshmallow_1.u64)('baseDepositsTotal'),
    (0, marshmallow_1.u64)('baseFeesAccrued'),
    (0, marshmallow_1.publicKey)('quoteVault'),
    (0, marshmallow_1.u64)('quoteDepositsTotal'),
    (0, marshmallow_1.u64)('quoteFeesAccrued'),
    (0, marshmallow_1.u64)('quoteDustThreshold'),
    (0, marshmallow_1.publicKey)('requestQueue'),
    (0, marshmallow_1.publicKey)('eventQueue'),
    (0, marshmallow_1.publicKey)('bids'),
    (0, marshmallow_1.publicKey)('asks'),
    (0, marshmallow_1.u64)('baseLotSize'),
    (0, marshmallow_1.u64)('quoteLotSize'),
    (0, marshmallow_1.u64)('feeRateBps'),
    (0, marshmallow_1.u64)('referrerRebatesAccrued'),
    (0, marshmallow_1.blob)(7),
]);
class MarketV2 extends base_1.Base {
    static makeCreateMarketInstructionSimple({ connection, wallet, baseInfo, quoteInfo, lotSize, // 1
    tickSize, // 0.01
    dexProgramId, makeTxVersion, lookupTableCache, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const market = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: dexProgramId });
            const requestQueue = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: dexProgramId });
            const eventQueue = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: dexProgramId });
            const bids = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: dexProgramId });
            const asks = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: dexProgramId });
            const baseVault = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: common_1.TOKEN_PROGRAM_ID });
            const quoteVault = (0, base_1.generatePubKey)({ fromPublicKey: wallet, programId: common_1.TOKEN_PROGRAM_ID });
            const feeRateBps = 0;
            const quoteDustThreshold = new bn_js_1.default(100);
            function getVaultOwnerAndNonce() {
                const vaultSignerNonce = new bn_js_1.default(0);
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        const vaultOwner = web3_js_1.PublicKey.createProgramAddressSync([market.publicKey.toBuffer(), vaultSignerNonce.toArrayLike(Buffer, 'le', 8)], dexProgramId);
                        return { vaultOwner, vaultSignerNonce };
                    }
                    catch (e) {
                        vaultSignerNonce.iaddn(1);
                        if (vaultSignerNonce.gt(new bn_js_1.default(25555)))
                            throw Error('find vault owner error');
                    }
                }
            }
            const { vaultOwner, vaultSignerNonce } = getVaultOwnerAndNonce();
            const baseLotSize = new bn_js_1.default(Math.round(10 ** baseInfo.decimals * lotSize));
            const quoteLotSize = new bn_js_1.default(Math.round(lotSize * 10 ** quoteInfo.decimals * tickSize));
            if (baseLotSize.eq(entity_1.ZERO))
                throw Error('lot size is too small');
            if (quoteLotSize.eq(entity_1.ZERO))
                throw Error('tick size or lot size is too small');
            const ins = yield this.makeCreateMarketInstruction({
                connection,
                wallet,
                marketInfo: {
                    programId: dexProgramId,
                    id: market,
                    baseMint: baseInfo.mint,
                    quoteMint: quoteInfo.mint,
                    baseVault,
                    quoteVault,
                    vaultOwner,
                    requestQueue,
                    eventQueue,
                    bids,
                    asks,
                    feeRateBps,
                    quoteDustThreshold,
                    vaultSignerNonce,
                    baseLotSize,
                    quoteLotSize,
                },
            });
            return {
                address: ins.address,
                innerTransactions: yield (0, common_1.splitTxAndSigners)({
                    connection,
                    makeTxVersion,
                    computeBudgetConfig: undefined,
                    payer: wallet,
                    innerTransaction: ins.innerTransactions,
                    lookupTableCache,
                }),
            };
        });
    }
    static makeCreateMarketInstruction({ connection, wallet, marketInfo, }) {
        return __awaiter(this, void 0, void 0, function* () {
            const ins1 = [];
            const accountLamports = yield connection.getMinimumBalanceForRentExemption(165);
            ins1.push(web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.baseVault.seed,
                newAccountPubkey: marketInfo.baseVault.publicKey,
                lamports: accountLamports,
                space: 165,
                programId: common_1.TOKEN_PROGRAM_ID,
            }), web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.quoteVault.seed,
                newAccountPubkey: marketInfo.quoteVault.publicKey,
                lamports: accountLamports,
                space: 165,
                programId: common_1.TOKEN_PROGRAM_ID,
            }), (0, spl_token_1.createInitializeAccountInstruction)(marketInfo.baseVault.publicKey, marketInfo.baseMint, marketInfo.vaultOwner), (0, spl_token_1.createInitializeAccountInstruction)(marketInfo.quoteVault.publicKey, marketInfo.quoteMint, marketInfo.vaultOwner));
            const ins2 = [];
            ins2.push(web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.id.seed,
                newAccountPubkey: marketInfo.id.publicKey,
                lamports: yield connection.getMinimumBalanceForRentExemption(exports.MARKET_STATE_LAYOUT_V2.span),
                space: exports.MARKET_STATE_LAYOUT_V2.span,
                programId: marketInfo.programId,
            }), web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.requestQueue.seed,
                newAccountPubkey: marketInfo.requestQueue.publicKey,
                lamports: yield connection.getMinimumBalanceForRentExemption(5120 + 12),
                space: 5120 + 12,
                programId: marketInfo.programId,
            }), web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.eventQueue.seed,
                newAccountPubkey: marketInfo.eventQueue.publicKey,
                lamports: yield connection.getMinimumBalanceForRentExemption(262144 + 12),
                space: 262144 + 12,
                programId: marketInfo.programId,
            }), web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.bids.seed,
                newAccountPubkey: marketInfo.bids.publicKey,
                lamports: yield connection.getMinimumBalanceForRentExemption(65536 + 12),
                space: 65536 + 12,
                programId: marketInfo.programId,
            }), web3_js_1.SystemProgram.createAccountWithSeed({
                fromPubkey: wallet,
                basePubkey: wallet,
                seed: marketInfo.asks.seed,
                newAccountPubkey: marketInfo.asks.publicKey,
                lamports: yield connection.getMinimumBalanceForRentExemption(65536 + 12),
                space: 65536 + 12,
                programId: marketInfo.programId,
            }), this.initializeMarketInstruction({
                programId: marketInfo.programId,
                marketInfo: {
                    id: marketInfo.id.publicKey,
                    requestQueue: marketInfo.requestQueue.publicKey,
                    eventQueue: marketInfo.eventQueue.publicKey,
                    bids: marketInfo.bids.publicKey,
                    asks: marketInfo.asks.publicKey,
                    baseVault: marketInfo.baseVault.publicKey,
                    quoteVault: marketInfo.quoteVault.publicKey,
                    baseMint: marketInfo.baseMint,
                    quoteMint: marketInfo.quoteMint,
                    baseLotSize: marketInfo.baseLotSize,
                    quoteLotSize: marketInfo.quoteLotSize,
                    feeRateBps: marketInfo.feeRateBps,
                    vaultSignerNonce: marketInfo.vaultSignerNonce,
                    quoteDustThreshold: marketInfo.quoteDustThreshold,
                },
            }));
            return {
                address: {
                    marketId: marketInfo.id.publicKey,
                    requestQueue: marketInfo.requestQueue.publicKey,
                    eventQueue: marketInfo.eventQueue.publicKey,
                    bids: marketInfo.bids.publicKey,
                    asks: marketInfo.asks.publicKey,
                    baseVault: marketInfo.baseVault.publicKey,
                    quoteVault: marketInfo.quoteVault.publicKey,
                    baseMint: marketInfo.baseMint,
                    quoteMint: marketInfo.quoteMint,
                },
                innerTransactions: [
                    {
                        instructions: ins1,
                        signers: [],
                        instructionTypes: [
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.initAccount,
                            base_1.InstructionType.initAccount,
                        ],
                    },
                    {
                        instructions: ins2,
                        signers: [],
                        instructionTypes: [
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.createAccount,
                            base_1.InstructionType.initMarket,
                        ],
                    },
                ],
            };
        });
    }
    static initializeMarketInstruction({ programId, marketInfo, }) {
        const dataLayout = (0, marshmallow_1.struct)([
            (0, marshmallow_1.u8)('version'),
            (0, marshmallow_1.u32)('instruction'),
            (0, marshmallow_1.u64)('baseLotSize'),
            (0, marshmallow_1.u64)('quoteLotSize'),
            (0, marshmallow_1.u16)('feeRateBps'),
            (0, marshmallow_1.u64)('vaultSignerNonce'),
            (0, marshmallow_1.u64)('quoteDustThreshold'),
        ]);
        const keys = [
            { pubkey: marketInfo.id, isSigner: false, isWritable: true },
            { pubkey: marketInfo.requestQueue, isSigner: false, isWritable: true },
            { pubkey: marketInfo.eventQueue, isSigner: false, isWritable: true },
            { pubkey: marketInfo.bids, isSigner: false, isWritable: true },
            { pubkey: marketInfo.asks, isSigner: false, isWritable: true },
            { pubkey: marketInfo.baseVault, isSigner: false, isWritable: true },
            { pubkey: marketInfo.quoteVault, isSigner: false, isWritable: true },
            { pubkey: marketInfo.baseMint, isSigner: false, isWritable: false },
            { pubkey: marketInfo.quoteMint, isSigner: false, isWritable: false },
            // Use a dummy address if using the new dex upgrade to save tx space.
            {
                pubkey: marketInfo.authority ? marketInfo.quoteMint : common_1.SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
        ]
            .concat(marketInfo.authority ? { pubkey: marketInfo.authority, isSigner: false, isWritable: false } : [])
            .concat(marketInfo.authority && marketInfo.pruneAuthority
            ? { pubkey: marketInfo.pruneAuthority, isSigner: false, isWritable: false }
            : []);
        const data = Buffer.alloc(dataLayout.span);
        dataLayout.encode({
            version: 0,
            instruction: 0,
            baseLotSize: marketInfo.baseLotSize,
            quoteLotSize: marketInfo.quoteLotSize,
            feeRateBps: marketInfo.feeRateBps,
            vaultSignerNonce: marketInfo.vaultSignerNonce,
            quoteDustThreshold: marketInfo.quoteDustThreshold,
        }, data);
        return new web3_js_1.TransactionInstruction({
            keys,
            programId,
            data,
        });
    }
}
exports.MarketV2 = MarketV2;
//# sourceMappingURL=createMarket.js.map