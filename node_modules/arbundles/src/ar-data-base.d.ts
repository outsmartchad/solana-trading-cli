import DataItem from "./DataItem";
/**
 * Options for creation of a DataItem
 */
export interface DataItemCreateOptions {
    /**
     * @deprecated
     */
    data?: never;
    target?: string;
    anchor?: string;
    tags?: {
        name: string;
        value: string;
    }[];
}
export declare function getSignatureData(item: DataItem): Promise<Uint8Array>;
