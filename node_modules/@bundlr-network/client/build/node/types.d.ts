import { Currency } from "../common/types";

export interface NodeCurrency extends Currency {
    getPublicKey(): string | Buffer
}


