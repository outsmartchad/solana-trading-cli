/// <reference types="node" />
import { PassThrough, Readable } from "stream";
import { DataItemCreateOptions } from "../src/index";
import { Signer } from "../src/signing";
export default function processStream(stream: Readable): Promise<Record<string, any>[]>;
/**
 * Signs a stream (requires two instances/read passes)
 * @param s1 Stream to sign - same as s2
 * @param s2 Stream to sign - same as s1
 * @param signer Signer to use to sign the stream
 * @param opts Optional options to apply to the stream (same as DataItem)
 */
export declare function streamSigner(s1: Readable, s2: Readable, signer: Signer, opts?: DataItemCreateOptions): Promise<PassThrough>;
