/// <reference types="node" />
import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import { InjectedEthereumSigner, Signer } from "arbundles/src/signing";
import { Tx, CurrencyConfig } from "../../common/types";
import BaseWebCurrency from "../currency";
export default class EthereumConfig extends BaseWebCurrency {
    protected signer: InjectedEthereumSigner;
    protected wallet: ethers.providers.Web3Provider;
    protected w3signer: ethers.providers.JsonRpcSigner;
    protected providerInstance?: ethers.providers.JsonRpcProvider;
    constructor(config: CurrencyConfig);
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(amount: BigNumber.Value, to?: string): Promise<BigNumber>;
    sendTx(data: ethers.providers.TransactionRequest): Promise<string>;
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): Promise<string | Buffer>;
    pruneBalanceTransactions(_txIds: string[]): Promise<void>;
    ready(): Promise<void>;
}
