import { DataItemCreateOptions } from "./ar-data-base";
import DataItem from "./DataItem";
import { Signer } from "./signing";
/**
 * This will create a single DataItem in binary format (Uint8Array)
 *
 * @param data
 * @param opts - Options involved in creating data items
 * @param signer
 */
export declare function createData(data: string | Uint8Array, signer: Signer, opts?: DataItemCreateOptions): DataItem;
