/// <reference types="node" />
/// <reference types="bn.js" />
import { PublicKey } from '@solana/web3.js';
export declare class Market {
    static getProgramId(version: number): PublicKey;
    static getVersion(programId: PublicKey): 3;
    static getStateLayout(version: number): import("..").Structure<Buffer | PublicKey | import("bn.js"), "", {
        baseLotSize: import("bn.js");
        quoteLotSize: import("bn.js");
        baseVault: PublicKey;
        quoteVault: PublicKey;
        baseMint: PublicKey;
        quoteMint: PublicKey;
        ownAddress: PublicKey;
        vaultSignerNonce: import("bn.js");
        baseDepositsTotal: import("bn.js");
        baseFeesAccrued: import("bn.js");
        quoteDepositsTotal: import("bn.js");
        quoteFeesAccrued: import("bn.js");
        quoteDustThreshold: import("bn.js");
        requestQueue: PublicKey;
        eventQueue: PublicKey;
        bids: PublicKey;
        asks: PublicKey;
        feeRateBps: import("bn.js");
        referrerRebatesAccrued: import("bn.js");
    }>;
    static getLayouts(version: number): {
        state: import("..").Structure<Buffer | PublicKey | import("bn.js"), "", {
            baseLotSize: import("bn.js");
            quoteLotSize: import("bn.js");
            baseVault: PublicKey;
            quoteVault: PublicKey;
            baseMint: PublicKey;
            quoteMint: PublicKey;
            ownAddress: PublicKey;
            vaultSignerNonce: import("bn.js");
            baseDepositsTotal: import("bn.js");
            baseFeesAccrued: import("bn.js");
            quoteDepositsTotal: import("bn.js");
            quoteFeesAccrued: import("bn.js");
            quoteDustThreshold: import("bn.js");
            requestQueue: PublicKey;
            eventQueue: PublicKey;
            bids: PublicKey;
            asks: PublicKey;
            feeRateBps: import("bn.js");
            referrerRebatesAccrued: import("bn.js");
        }>;
    };
    static getAssociatedAuthority({ programId, marketId }: {
        programId: PublicKey;
        marketId: PublicKey;
    }): {
        publicKey: PublicKey;
        nonce: number;
    };
}
//# sourceMappingURL=serum.d.ts.map