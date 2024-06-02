import Utils from "./utils";
import Uploader from "./upload";
import Fund from "./fund";
import { AxiosResponse } from "axios";
import { DataItemCreateOptions } from "arbundles";
import BundlrTransaction from "./transaction";
import Api from "./api";
import BigNumber from "bignumber.js";
import { Currency, FundData } from "./types";
import { Signer } from "arbundles/src/signing";
export default abstract class Bundlr {
    api: Api;
    utils: Utils;
    uploader: Uploader;
    funder: Fund;
    address: any;
    currency: any;
    currencyConfig: Currency;
    constructor();
    get signer(): Signer;
    withdrawBalance(amount: BigNumber.Value): Promise<AxiosResponse<any>>;
    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    getLoadedBalance(): Promise<BigNumber>;
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    getBalance(address: string): Promise<BigNumber>;
    /**
     * Sends amount atomic units to the specified bundler
     * @param amount amount to send in atomic units
     * @returns details about the fund transaction
     */
    fund(amount: BigNumber.Value, multiplier?: number): Promise<FundData>;
    /**
     * Calculates the price for [bytes] bytes for the loaded currency and Bundlr node.
     * @param bytes
     * @returns
     */
    getPrice(bytes: number): Promise<BigNumber>;
    /**
     * Create a new BundlrTransactions (flex currency arbundles dataItem)
     * @param data
     * @param opts - dataItemCreateOptions
     * @returns - a new BundlrTransaction instance
     */
    createTransaction(data: string | Uint8Array, opts?: DataItemCreateOptions): BundlrTransaction;
    /**
     * Returns the signer for the loaded currency
     */
    getSigner(): Signer;
}
