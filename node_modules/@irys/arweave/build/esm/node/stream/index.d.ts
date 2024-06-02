/// <reference types="node" />
import type { CreateTransactionInterface } from "../../common/index.js";
import type Transactions from "../../common/transactions.js";
import type Api from "../../common/lib/api.js";
import type CryptoInterface from "../../common/lib/crypto/crypto-interface.js";
import type { DeepHash } from "../../common/lib/deepHash.js";
import type FallbackApi from "../../common/lib/fallbackApi.js";
import type Merkle from "../../common/lib/merkle.js";
import Transaction from "../../common/lib/transaction.js";
import type { JWKInterface } from "../../common/lib/wallet.js";
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
