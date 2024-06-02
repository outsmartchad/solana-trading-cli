/// <reference types="node" />
/// <reference types="bn.js" />
/// <reference types="@solana/web3.js" />
import { GetStructureSchema } from '../marshmallow';
export declare const MARKET_STATE_LAYOUT_V3: import("../marshmallow").Structure<Buffer | import("@solana/web3.js").PublicKey | import("bn.js"), "", {
    baseLotSize: import("bn.js");
    quoteLotSize: import("bn.js");
    baseVault: import("@solana/web3.js").PublicKey;
    quoteVault: import("@solana/web3.js").PublicKey;
    baseMint: import("@solana/web3.js").PublicKey;
    quoteMint: import("@solana/web3.js").PublicKey;
    ownAddress: import("@solana/web3.js").PublicKey;
    vaultSignerNonce: import("bn.js");
    baseDepositsTotal: import("bn.js");
    baseFeesAccrued: import("bn.js");
    quoteDepositsTotal: import("bn.js");
    quoteFeesAccrued: import("bn.js");
    quoteDustThreshold: import("bn.js");
    requestQueue: import("@solana/web3.js").PublicKey;
    eventQueue: import("@solana/web3.js").PublicKey;
    bids: import("@solana/web3.js").PublicKey;
    asks: import("@solana/web3.js").PublicKey;
    feeRateBps: import("bn.js");
    referrerRebatesAccrued: import("bn.js");
}>;
export type MarketStateLayoutV3 = typeof MARKET_STATE_LAYOUT_V3;
export type MarketStateLayout = MarketStateLayoutV3;
export type MarketStateV3 = GetStructureSchema<MarketStateLayoutV3>;
export type MarketState = MarketStateV3;
export declare const MARKET_VERSION_TO_STATE_LAYOUT: {
    [version: number]: MarketStateLayout;
};
