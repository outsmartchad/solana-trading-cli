import BigNumber from "bignumber.js";
import { FundData } from "./types";
import Utils from "./utils";
export default class Fund {
    protected utils: Utils;
    constructor(utils: Utils);
    /**
     * Function to Fund (send funds to) a Bundlr node - inherits instance currency and node
     * @param amount - amount in base units to send
     * @param multiplier - network tx fee multiplier - only works for specific currencies
     * @returns  - funding receipt
     */
    fund(amount: BigNumber.Value, multiplier?: number): Promise<FundData>;
}
