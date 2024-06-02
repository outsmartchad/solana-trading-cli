import Bundlr from "../common/bundlr";
import { WebCurrency } from "./types";
export default class WebBundlr extends Bundlr {
    currencyConfig: WebCurrency;
    constructor(url: string, currency: string, provider?: any, config?: {
        timeout?: number;
        providerUrl?: string;
        contractAddress?: string;
    });
    ready(): Promise<void>;
}
