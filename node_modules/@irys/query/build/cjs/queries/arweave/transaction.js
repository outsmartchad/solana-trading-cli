"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arweaveTransactionQuery = exports.transactionVars = exports.transaction = void 0;
// derive type from minimal object, use this object to validate structure in code.
exports.transaction = {
    id: "",
    anchor: "",
    signature: "",
    recipient: "",
    owner: {
        address: "",
        key: "",
    },
    fee: {
        winston: "",
        ar: "",
    },
    quantity: {
        winston: "",
        ar: "",
    },
    data: {
        size: "",
        type: "",
    },
    tags: [{ name: "", value: "" }],
    block: {
        id: "",
        timestamp: 0,
        height: 0,
        previous: "",
    },
    bundledIn: {
        id: "",
    },
};
// default variables
exports.transactionVars = {
    id: undefined,
};
exports.arweaveTransactionQuery = {
    name: "transaction",
    query: exports.transaction,
    vars: exports.transactionVars,
};
//# sourceMappingURL=transaction.js.map