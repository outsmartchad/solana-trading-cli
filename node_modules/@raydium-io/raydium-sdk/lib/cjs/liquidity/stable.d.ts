/// <reference types="bn.js" />
/// <reference types="node" />
import { PublicKey } from '@solana/web3.js';
export declare const ModelDataPubkey: PublicKey;
export declare const DataElement: import("../marshmallow").Structure<import("bn.js"), "", {
    x: import("bn.js");
    y: import("bn.js");
    price: import("bn.js");
}>;
export declare const ModelDataInfo: import("../marshmallow").Structure<import("bn.js") | {
    x: import("bn.js");
    y: import("bn.js");
    price: import("bn.js");
}[], "", {
    status: import("bn.js");
    accountType: import("bn.js");
    multiplier: import("bn.js");
    validDataCount: import("bn.js");
    DataElement: {
        x: import("bn.js");
        y: import("bn.js");
        price: import("bn.js");
    }[];
}>;
export interface StableModelLayout {
    accountType: number;
    status: number;
    multiplier: number;
    validDataCount: number;
    DataElement: {
        x: number;
        y: number;
        price: number;
    }[];
}
export declare function getDyByDxBaseIn(layoutData: StableModelLayout, xReal: number, yReal: number, dxReal: number): number;
export declare function getDxByDyBaseIn(layoutData: StableModelLayout, xReal: number, yReal: number, dyReal: number): number;
export declare function formatLayout(buffer: Buffer): StableModelLayout;
export declare function getStablePrice(layoutData: StableModelLayout, coinReal: number, pcReal: number, baseCoin: boolean): number;
