import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import BN from 'bn.js';
import { Base, InstructionType, TxVersion } from '../base';
import { CacheLTA } from '../common';
export declare const MARKET_STATE_LAYOUT_V2: import("../marshmallow").Structure<any, "", {
    [x: string]: any;
}>;
export declare class MarketV2 extends Base {
    static makeCreateMarketInstructionSimple<T extends TxVersion>({ connection, wallet, baseInfo, quoteInfo, lotSize, // 1
    tickSize, // 0.01
    dexProgramId, makeTxVersion, lookupTableCache, }: {
        makeTxVersion: T;
        lookupTableCache?: CacheLTA;
        connection: Connection;
        wallet: PublicKey;
        baseInfo: {
            mint: PublicKey;
            decimals: number;
        };
        quoteInfo: {
            mint: PublicKey;
            decimals: number;
        };
        lotSize: number;
        tickSize: number;
        dexProgramId: PublicKey;
    }): Promise<{
        address: {
            marketId: PublicKey;
            requestQueue: PublicKey;
            eventQueue: PublicKey;
            bids: PublicKey;
            asks: PublicKey;
            baseVault: PublicKey;
            quoteVault: PublicKey;
            baseMint: PublicKey;
            quoteMint: PublicKey;
        };
        innerTransactions: (T extends TxVersion.LEGACY ? import("../base").InnerSimpleLegacyTransaction : import("../base").InnerSimpleV0Transaction)[];
    }>;
    static makeCreateMarketInstruction({ connection, wallet, marketInfo, }: {
        connection: Connection;
        wallet: PublicKey;
        marketInfo: {
            programId: PublicKey;
            id: {
                publicKey: PublicKey;
                seed: string;
            };
            baseMint: PublicKey;
            quoteMint: PublicKey;
            baseVault: {
                publicKey: PublicKey;
                seed: string;
            };
            quoteVault: {
                publicKey: PublicKey;
                seed: string;
            };
            vaultOwner: PublicKey;
            requestQueue: {
                publicKey: PublicKey;
                seed: string;
            };
            eventQueue: {
                publicKey: PublicKey;
                seed: string;
            };
            bids: {
                publicKey: PublicKey;
                seed: string;
            };
            asks: {
                publicKey: PublicKey;
                seed: string;
            };
            feeRateBps: number;
            vaultSignerNonce: BN;
            quoteDustThreshold: BN;
            baseLotSize: BN;
            quoteLotSize: BN;
        };
    }): Promise<{
        address: {
            marketId: PublicKey;
            requestQueue: PublicKey;
            eventQueue: PublicKey;
            bids: PublicKey;
            asks: PublicKey;
            baseVault: PublicKey;
            quoteVault: PublicKey;
            baseMint: PublicKey;
            quoteMint: PublicKey;
        };
        innerTransactions: {
            instructions: TransactionInstruction[];
            signers: never[];
            instructionTypes: InstructionType[];
        }[];
    }>;
    static initializeMarketInstruction({ programId, marketInfo, }: {
        programId: PublicKey;
        marketInfo: {
            id: PublicKey;
            requestQueue: PublicKey;
            eventQueue: PublicKey;
            bids: PublicKey;
            asks: PublicKey;
            baseVault: PublicKey;
            quoteVault: PublicKey;
            baseMint: PublicKey;
            quoteMint: PublicKey;
            authority?: PublicKey;
            pruneAuthority?: PublicKey;
            baseLotSize: BN;
            quoteLotSize: BN;
            feeRateBps: number;
            vaultSignerNonce: BN;
            quoteDustThreshold: BN;
        };
    }): TransactionInstruction;
}
//# sourceMappingURL=createMarket.d.ts.map