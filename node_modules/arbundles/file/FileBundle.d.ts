/// <reference types="node" />
import { BundleInterface } from "../src/BundleInterface";
import FileDataItem from "./FileDataItem";
import { PathLike } from "fs";
import Arweave from "arweave";
import Transaction from "arweave/node/lib/transaction";
import { JWKInterface } from "../src/interface-jwk";
import { CreateTransactionInterface } from "arweave/node/common";
export default class FileBundle implements BundleInterface {
    readonly headerFile: PathLike;
    readonly txs: PathLike[];
    constructor(headerFile: PathLike, txs: PathLike[]);
    static fromDir(dir: string): Promise<FileBundle>;
    length(): Promise<number>;
    get items(): AsyncGenerator<FileDataItem>;
    get(index: number | string): Promise<FileDataItem>;
    getIds(): Promise<string[]>;
    getRaw(): Promise<Buffer>;
    toTransaction(attributes: Partial<Omit<CreateTransactionInterface, "data">>, arweave: Arweave, jwk: JWKInterface): Promise<Transaction>;
    signAndSubmit(arweave: Arweave, jwk: JWKInterface, tags?: {
        name: string;
        value: string;
    }[]): Promise<Transaction>;
    getHeaders(): AsyncGenerator<{
        offset: number;
        id: string;
    }>;
    private itemsGenerator;
    private getById;
    private getByIndex;
}
