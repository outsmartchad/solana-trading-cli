/// <reference types="node" />
import type { Signer } from "../index.js";
import { SignatureConfig } from "../../constants.js";
import type { Bytes } from "@ethersproject/bytes";
export interface InjectedEthereumSignerMinimalSigner {
    signMessage(message: string | Bytes): Promise<string>;
}
export interface InjectedEthereumSignerMinimalProvider {
    getSigner(): InjectedEthereumSignerMinimalSigner;
}
export declare class InjectedEthereumSigner implements Signer {
    protected signer: InjectedEthereumSignerMinimalSigner;
    publicKey: Buffer;
    readonly ownerLength: number;
    readonly signatureLength: number;
    readonly signatureType: SignatureConfig;
    constructor(provider: InjectedEthereumSignerMinimalProvider);
    setPublicKey(): Promise<void>;
    sign(message: Uint8Array): Promise<Uint8Array>;
    static verify(pk: Buffer, message: Uint8Array, signature: Uint8Array): boolean;
}
export default InjectedEthereumSigner;
