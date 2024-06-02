/// <reference types="node" />
import BigNumber from "bignumber.js";
import { Signer } from "arbundles/src/signing";
import { JsonRpcProvider } from "@ethersproject/providers";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
export default class EthereumConfig extends BaseNodeCurrency {
    protected providerInstance: JsonRpcProvider;
    constructor(config: CurrencyConfig);
    protected getProvider(): Promise<JsonRpcProvider>;
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber>;
    sendTx(data: any): Promise<any>;
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): string | Buffer;
}
