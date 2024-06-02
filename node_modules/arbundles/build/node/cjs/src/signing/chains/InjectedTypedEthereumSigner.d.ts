/// <reference types="node" />
import { SignatureConfig } from "../../constants";
import type { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";
import type { Signer } from "../index";
export interface InjectedTypedEthereumSignerMinimalSigner {
    getAddress: () => Promise<string>;
    _signTypedData(domain: TypedDataDomain, types: Record<string, TypedDataField[]>, value: Record<string, any>): Promise<string>;
}
export interface InjectedTypedEthereumSignerMinimalProvider {
    getSigner(): InjectedTypedEthereumSignerMinimalSigner;
}
export declare class InjectedTypedEthereumSigner implements Signer {
    readonly ownerLength: number;
    readonly signatureLength: number;
    readonly signatureType: SignatureConfig;
    private address;
    protected signer: InjectedTypedEthereumSignerMinimalSigner;
    publicKey: Buffer;
    constructor(provider: InjectedTypedEthereumSignerMinimalProvider);
    ready(): Promise<void>;
    sign(message: Uint8Array): Promise<Uint8Array>;
    static verify(pk: string | Buffer, message: Uint8Array, signature: Uint8Array): boolean;
}
export default InjectedTypedEthereumSigner;
