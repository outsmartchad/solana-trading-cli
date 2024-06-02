import { AxiosResponse } from "axios";
import BigNumber from "bignumber.js";
import Api from "./api";
import { Currency } from "./types";
export declare const sleep: (ms: any) => Promise<void>;
export default class Utils {
    api: Api;
    currency: string;
    currencyConfig: Currency;
    constructor(api: Api, currency: string, currencyConfig: Currency);
    /**
     * Throws an error if the provided axios reponse has a status code != 200
     * @param res an axios response
     * @returns nothing if the status code is 200
     */
    static checkAndThrow(res: AxiosResponse<any>, context?: string, exceptions?: number[]): void;
    /**
     * Gets the nonce used for withdrawal request validation from the bundler
     * @returns nonce for the current user
     */
    getNonce(): Promise<number>;
    /**
     * Gets the balance on the current bundler for the specified user
     * @param address the user's address to query
     * @returns the balance in winston
     */
    getBalance(address: string): Promise<BigNumber>;
    /**
     * Queries the bundler to get it's address for a specific currency
     * @returns the bundler's address
     */
    getBundlerAddress(currency: string): Promise<string>;
    /**
     * Calculates the price for [bytes] bytes paid for with [currency] for the loaded bundlr node.
     * @param currency
     * @param bytes
     * @returns
     */
    getPrice(currency: string, bytes: number): Promise<BigNumber>;
    /**
     * Polls for transaction confirmation (or at least pending status) - used for fast currencies (i.e not arweave)
     * before posting the fund request to the server (so the server doesn't have to poll)
     * @param txid
     * @returns
     */
    confirmationPoll(txid: string): Promise<void>;
    unitConverter(baseUnits: BigNumber.Value): BigNumber;
}
