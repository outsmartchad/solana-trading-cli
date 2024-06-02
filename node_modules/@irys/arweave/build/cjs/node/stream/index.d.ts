/// <reference types="node" />
import type { CreateTransactionInterface } from "../../common/index";
import type Transactions from "../../common/transactions";
import type Api from "../../common/lib/api";
import type CryptoInterface from "../../common/lib/crypto/crypto-interface";
import type { DeepHash } from "../../common/lib/deepHash";
import type FallbackApi from "../../common/lib/fallbackApi";
import type Merkle from "../../common/lib/merkle";
import Transaction from "../../common/lib/transaction";
import type { JWKInterface } from "../../common/lib/wallet";
export declare class Stream {
    protected crypto: CryptoInterface;
    protected merkle: Merkle;
    protected api: Api | FallbackApi;
    protected transactions: Transactions;
    protected deepHash: DeepHash;
    constructor({ deps, }: {
        deps: {
            api: Api | FallbackApi;
            crypto: CryptoInterface;
            merkle: Merkle;
            transactions: Transactions;
            deepHash: DeepHash;
        };
    });
    /**
     * Creates an Arweave transaction from the piped data stream.
     */
    createTransactionAsync(attributes: Partial<Omit<CreateTransactionInterface, "data">>, jwk?: JWKInterface): (source: AsyncIterable<Buffer>) => Promise<Transaction>;
    /**
     * Generates the Arweave transaction chunk information from the piped data stream.
     */
    generateTransactionChunksAsync(): (source: AsyncIterable<Buffer>) => Promise<NonNullable<Transaction["chunks"]>>;
    /**
     * Uploads the piped data to the specified transaction.
     *
     * @param tx
     * @param arweave
     * @param createTx whether or not the passed transaction should be created on the network.
     * This can be false if we want to reseed an existing transaction,
     * @param debugOpts
     */
    uploadTransactionAsync(tx: Transaction, createTx?: boolean, debugOpts?: DebugOptions): (source: AsyncIterable<Buffer>) => Promise<void>;
}
export type DebugOptions = {
    log: (message: string) => void;
    debug: boolean;
};
