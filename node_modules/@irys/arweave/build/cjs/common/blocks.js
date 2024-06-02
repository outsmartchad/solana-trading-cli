"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/naming-convention */
const error_1 = __importDefault(require("./lib/error"));
class Blocks {
    constructor(api, network) {
        this.api = api;
        this.network = network;
    }
    /**
     * Gets a block by its "indep_hash"
     */
    getByHash(indepHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.api.get(`block/hash/${indepHash}`);
            if (response.status === 200) {
                return response.data;
            }
            else {
                if (response.status === 404) {
                    throw new error_1.default("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
                }
                else {
                    throw new Error(`Error while loading block data: ${response}`);
                }
            }
        });
    }
    /**
     * Gets a block by its "indep_hash"
     */
    getByHeight(height) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.api.get(`block/height/${height}`);
            if (response.status === 200) {
                return response.data;
            }
            else {
                if (response.status === 404) {
                    throw new error_1.default("BLOCK_NOT_FOUND" /* ArweaveErrorType.BLOCK_NOT_FOUND */);
                }
                else {
                    throw new Error(`Error while loading block data: ${response}`);
                }
            }
        });
    }
    /**
     * Gets current block data (ie. block with indep_hash = Network.getInfo().current)
     */
    getCurrent() {
        return __awaiter(this, void 0, void 0, function* () {
            const { current } = yield this.network.getInfo();
            return yield this.getByHash(current);
        });
    }
}
exports.default = Blocks;
//# sourceMappingURL=blocks.js.map