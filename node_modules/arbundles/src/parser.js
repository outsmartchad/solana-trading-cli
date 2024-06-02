"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeTags = exports.tagsParser = exports.tagParser = void 0;
const avro = __importStar(require("avsc"));
exports.tagParser = avro.Type.forSchema({
    type: "record",
    name: "Tag",
    fields: [
        { name: "name", type: "string" },
        { name: "value", type: "string" },
    ],
});
exports.tagsParser = avro.Type.forSchema({
    type: "array",
    items: exports.tagParser,
});
function serializeTags(tags) {
    if (tags.length == 0) {
        return new Uint8Array(0);
    }
    let tagsBuffer;
    try {
        tagsBuffer = exports.tagsParser.toBuffer(tags);
    }
    catch (e) {
        throw new Error("Incorrect tag format used. Make sure your tags are { name: string!, value: string! }[]");
    }
    return Uint8Array.from(tagsBuffer);
}
exports.serializeTags = serializeTags;
//# sourceMappingURL=parser.js.map