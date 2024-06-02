import Arweave from "arweave";
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
export default class ArweaveConfig extends BaseNodeCurrency {
    protected providerInstance: Arweave;
    constructor(config: CurrencyConfig);
    private getProvider;
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber>;
    sendTx(data: any): Promise<any>;
    createTx(amount: BigNumber.Value, to: string, fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): string;
}
