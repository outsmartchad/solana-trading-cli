/// <reference types="node" />
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
import { KeyPair } from "near-api-js";
import { JsonRpcProvider } from "near-api-js/lib/providers";
export default class NearConfig extends BaseNodeCurrency {
    protected keyPair: KeyPair;
    protected providerInstance?: JsonRpcProvider;
    protected bundlrUrl: string;
    constructor(config: CurrencyConfig & {
        bundlrUrl: string;
    });
    protected getProvider(): Promise<JsonRpcProvider>;
    /**
     * NEAR wants both the sender ID and tx Hash, so we have to concatenate to keep with the interface.
     * @param txId assumes format senderID:txHash
     */
    getTx(txId: string): Promise<Tx>;
    /**
     * address = accountID
     * @param owner // assumed to be the "ed25519:" header + b58 encoded key
     */
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    /**
     * NOTE: assumes only operation is transfer
     * @param _amount
     * @param _to
     * @returns
     */
    getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber>;
    sendTx(data: any): Promise<any>;
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string;
        tx: any;
    }>;
    getPublicKey(): string | Buffer;
    ready(): Promise<void>;
}
