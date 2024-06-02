/// <reference types="node" />
import { ethers } from "ethers";
import { Signer } from "..";
import { SignatureConfig } from "../../constants";
export default class InjectedEthereumSigner implements Signer {
    private signer;
    publicKey: Buffer;
    readonly ownerLength: number;
    readonly signatureLength: number;
    readonly signatureType: SignatureConfig;
    constructor(provider: ethers.providers.Web3Provider);
    setPublicKey(): Promise<void>;
    sign(message: Uint8Array): Promise<Uint8Array>;
    static verify(pk: Buffer, message: Uint8Array, signature: Uint8Array): boolean;
}
