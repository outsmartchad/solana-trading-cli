"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVersionedTransaction = void 0;
function isVersionedTransaction(transaction) {
    return 'version' in transaction;
}
exports.isVersionedTransaction = isVersionedTransaction;
//# sourceMappingURL=transaction.js.map