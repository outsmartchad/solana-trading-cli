import { ResponseWithData } from "./api";
export declare const enum ArweaveErrorType {
    TX_NOT_FOUND = "TX_NOT_FOUND",
    TX_FAILED = "TX_FAILED",
    TX_INVALID = "TX_INVALID",
    BLOCK_NOT_FOUND = "BLOCK_NOT_FOUND"
}
export default class ArweaveError extends Error {
    readonly type: ArweaveErrorType;
    readonly response?: ResponseWithData;
    constructor(type: ArweaveErrorType, optional?: {
        message?: string;
        response?: ResponseWithData;
    });
    getType(): ArweaveErrorType;
}
type ResponseLite = {
    status: number;
    statusText?: string;
    data: {
        error: string;
    } | any;
};
export declare function getError(resp: ResponseLite): any;
export {};
