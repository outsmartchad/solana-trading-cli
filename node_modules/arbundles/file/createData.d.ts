/// <reference types="node" />
import FileDataItem from "./FileDataItem";
import { DataItemCreateOptions } from "../src/ar-data-base";
import { Signer } from "../src/signing";
export declare function createData(data: string | Uint8Array | NodeJS.ReadableStream, signer: Signer, opts?: DataItemCreateOptions): Promise<FileDataItem>;
