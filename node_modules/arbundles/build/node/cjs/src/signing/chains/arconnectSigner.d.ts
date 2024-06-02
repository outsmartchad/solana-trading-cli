/// <reference types="node" />
import type { Signer } from "..";
import { SignatureConfig } from "../../constants";
import type Arweave from "@irys/arweave";
export default class InjectedArweaveSigner implements Signer {
    private signer;
    publicKey: Buffer;
    readonly ownerLength: number;
    readonly signatureLength: number;
    readonly signatureType: SignatureConfig;
    protected arweave: Arweave;
    constructor(windowArweaveWallet: Window["arweaveWallet"], arweave: Arweave);
    setPublicKey(): Promise<void>;
    sign(message: Uint8Array): Promise<Uint8Array>;
    static verify(pk: string, message: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
