/// <reference types="node" />
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
import * as algosdk from "algosdk";
export default class AlgorandConfig extends BaseNodeCurrency {
    protected keyPair: algosdk.Account;
    protected apiURL?: any;
    protected indexerURL?: any;
    constructor(config: CurrencyConfig);
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: string | Buffer, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(): Promise<BigNumber>;
    sendTx(data: any): Promise<string>;
    createTx(amount: BigNumber.Value, to: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): string | Buffer;
}
