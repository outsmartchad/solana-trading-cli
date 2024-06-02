/// <reference types="bn.js" />
/// <reference types="@solana/web3.js" />
import { GetStructureSchema } from '../marshmallow';
export declare const SPL_MINT_LAYOUT: import("../marshmallow").Structure<number | import("@solana/web3.js").PublicKey | import("bn.js"), "", {
    isInitialized: number;
    decimals: number;
    mintAuthorityOption: number;
    mintAuthority: import("@solana/web3.js").PublicKey;
    supply: import("bn.js");
    freezeAuthorityOption: number;
    freezeAuthority: import("@solana/web3.js").PublicKey;
}>;
export type SplMintLayout = typeof SPL_MINT_LAYOUT;
export type SplMint = GetStructureSchema<SplMintLayout>;
export declare const SPL_ACCOUNT_LAYOUT: import("../marshmallow").Structure<number | import("@solana/web3.js").PublicKey | import("bn.js"), "", {
    mint: import("@solana/web3.js").PublicKey;
    delegate: import("@solana/web3.js").PublicKey;
    owner: import("@solana/web3.js").PublicKey;
    state: number;
    amount: import("bn.js");
    delegateOption: number;
    isNativeOption: number;
    isNative: import("bn.js");
    delegatedAmount: import("bn.js");
    closeAuthorityOption: number;
    closeAuthority: import("@solana/web3.js").PublicKey;
}>;
export type SplAccountLayout = typeof SPL_ACCOUNT_LAYOUT;
export type SplAccount = GetStructureSchema<SplAccountLayout>;
