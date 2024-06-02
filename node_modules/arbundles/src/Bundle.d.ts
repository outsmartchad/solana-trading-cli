/// <reference types="node" />
import DataItem from "./DataItem";
import Transaction from "arweave/node/lib/transaction";
import Arweave from "arweave";
import { BundleInterface } from "./BundleInterface";
import { JWKInterface } from "./interface-jwk";
import { CreateTransactionInterface } from "arweave/node/common";
export default class Bundle implements BundleInterface {
    length: number;
    items: DataItem[];
    protected binary: Buffer;
    constructor(binary: Buffer);
    getRaw(): Buffer;
    /**
     * Get a DataItem by index (`number`) or by txId (`string`)
     * @param index
     */
    get(index: number | string): DataItem;
    getSizes(): number[];
    getIds(): string[];
    getIdBy(index: number): string;
    toTransaction(attributes: Partial<Omit<CreateTransactionInterface, "data">>, arweave: Arweave, jwk: JWKInterface): Promise<Transaction>;
    verify(): Promise<boolean>;
    private getOffset;
    /**
     * UNSAFE! Assumes index < length
     * @param index
     * @private
     */
    private getByIndex;
    private getById;
    private getDataItemCount;
    private getBundleStart;
    private getItems;
}
