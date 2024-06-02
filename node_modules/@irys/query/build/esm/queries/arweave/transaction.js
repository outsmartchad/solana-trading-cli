// derive type from minimal object, use this object to validate structure in code.
export const transaction = {
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
export const transactionVars = {
    id: undefined,
};
export const arweaveTransactionQuery = {
    name: "transaction",
    query: transaction,
    vars: transactionVars,
};
//# sourceMappingURL=transaction.js.map