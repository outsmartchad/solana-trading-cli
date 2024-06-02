/// <reference types="node" />
import { FileDataItem } from "arbundles/file";
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../common/types";
import { WebCurrency } from "./types";
export default abstract class BaseWebCurrency implements WebCurrency {
    base: [string, number];
    protected wallet: any;
    protected _address: string;
    protected providerUrl: any;
    protected providerInstance?: any;
    ticker: string;
    name: string;
    protected minConfirm: number;
    isSlow: boolean;
    needsFee: boolean;
    constructor(config: CurrencyConfig);
    get address(): string;
    ready(): Promise<void>;
    getId(item: FileDataItem): Promise<string>;
    price(): Promise<number>;
    abstract getTx(_txId: string): Promise<Tx>;
    abstract ownerToAddress(_owner: any): string;
    abstract sign(_data: Uint8Array): Promise<Uint8Array>;
    abstract getSigner(): Signer;
    abstract verify(_pub: any, _data: Uint8Array, _signature: Uint8Array): Promise<boolean>;
    abstract getCurrentHeight(): Promise<BigNumber>;
    abstract getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber>;
    abstract sendTx(_data: any): Promise<any>;
    abstract createTx(_amount: BigNumber.Value, _to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    abstract getPublicKey(): Promise<string | Buffer>;
}
export declare function getRedstonePrice(currency: string): Promise<number>;
