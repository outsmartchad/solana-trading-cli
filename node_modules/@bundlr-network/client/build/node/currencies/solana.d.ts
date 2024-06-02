/// <reference types="node" />
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import * as web3 from "@solana/web3.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
export default class SolanaConfig extends BaseNodeCurrency {
    protected providerInstance: web3.Connection;
    minConfirm: number;
    constructor(config: CurrencyConfig);
    private getProvider;
    private getKeyPair;
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber>;
    sendTx(data: any): Promise<string | undefined>;
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): string | Buffer;
}
