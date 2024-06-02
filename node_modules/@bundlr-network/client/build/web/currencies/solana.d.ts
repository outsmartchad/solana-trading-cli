/// <reference types="node" />
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseWebCurrency from "../currency";
import { MessageSignerWalletAdapter } from "@solana/wallet-adapter-base";
export default class SolanaConfig extends BaseWebCurrency {
    private signer;
    protected wallet: MessageSignerWalletAdapter;
    minConfirm: number;
    constructor(config: CurrencyConfig);
    private getProvider;
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber>;
    sendTx(data: any): Promise<string>;
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): Promise<string | Buffer>;
}
