import { AxiosResponse } from "axios";
import Utils from "./utils";
import BigNumber from "bignumber.js";
import Api from "./api";
/**
 * Create and send a withdrawal request
 * @param utils Instance of Utils
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
export declare function withdrawBalance(utils: Utils, api: Api, amount: BigNumber.Value): Promise<AxiosResponse<any>>;
