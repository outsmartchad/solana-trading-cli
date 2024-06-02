/**
 * @see {@link https://github.com/ArweaveTeam/arweave/blob/fbc381e0e36efffa45d13f2faa6199d3766edaa2/apps/arweave/src/ar_merkle.erl}
 */
import Arweave from "../arweave.js";
import { concatBuffers } from "./utils.js";
export const MAX_CHUNK_SIZE = 256 * 1024;
export const MIN_CHUNK_SIZE = 32 * 1024;
const NOTE_SIZE = 32;
const HASH_SIZE = 32;
export class Merkle {
    crypto;
    constructor(opts) {
        this.crypto = opts.deps.crypto;
    }
    /**
     * Takes the input data and chunks it into (mostly) equal sized chunks.
     * The last chunk will be a bit smaller as it contains the remainder
     * from the chunking process.
     */
    async chunkData(data) {
        const chunks = [];
        let rest = data;
        let cursor = 0;
        while (rest.byteLength >= MAX_CHUNK_SIZE) {
            let chunkSize = MAX_CHUNK_SIZE;
            // If the total bytes left will produce a chunk < MIN_CHUNK_SIZE,
            // then adjust the amount we put in this 2nd last chunk.
            const nextChunkSize = rest.byteLength - MAX_CHUNK_SIZE;
            if (nextChunkSize > 0 && nextChunkSize < MIN_CHUNK_SIZE) {
                chunkSize = Math.ceil(rest.byteLength / 2);
                // console.log(`Last chunk will be: ${nextChunkSize} which is below ${MIN_CHUNK_SIZE}, adjusting current to ${chunkSize} with ${rest.byteLength} left.`)
            }
            const chunk = rest.slice(0, chunkSize);
            const dataHash = await this.crypto.hash(chunk);
            cursor += chunk.byteLength;
            chunks.push({
                dataHash,
                minByteRange: cursor - chunk.byteLength,
                maxByteRange: cursor,
            });
            rest = rest.slice(chunkSize);
        }
        chunks.push({
            dataHash: await this.crypto.hash(rest),
            minByteRange: cursor,
            maxByteRange: cursor + rest.byteLength,
        });
        return chunks;
    }
    async generateLeaves(chunks) {
        return Promise.all(chunks.map(async ({ dataHash, minByteRange, maxByteRange }) => {
            return {
                type: "leaf",
                id: await this.hash(await Promise.all([this.hash(dataHash), this.hash(intToBuffer(maxByteRange))])),
                dataHash: dataHash,
                minByteRange,
                maxByteRange,
            };
        }));
    }
    /**
     * Builds an arweave merkle tree and gets the root hash for the given input.
     */
    async computeRootHash(data) {
        const rootNode = await this.generateTree(data);
        return rootNode.id;
    }
    async generateTree(data) {
        const rootNode = await this.buildLayers(await this.generateLeaves(await this.chunkData(data)));
        return rootNode;
    }
    /**
     * Generates the data_root, chunks & proofs
     * needed for a transaction.
     *
     * This also checks if the last chunk is a zero-length
     * chunk and discards that chunk and proof if so.
     * (we do not need to upload this zero length chunk)
     *
     * @param data
     */
    async generateTransactionChunks(data) {
        const chunks = await this.chunkData(data);
        const leaves = await this.generateLeaves(chunks);
        const root = await this.buildLayers(leaves);
        const proofs = await this.generateProofs(root);
        // Discard the last chunk & proof if it's zero length.
        const lastChunk = chunks.slice(-1)[0];
        if (lastChunk.maxByteRange - lastChunk.minByteRange === 0) {
            chunks.splice(chunks.length - 1, 1);
            proofs.splice(proofs.length - 1, 1);
        }
        return {
            data_root: root.id,
            chunks,
            proofs,
        };
    }
    /**
     * Starting with the bottom layer of leaf nodes, hash every second pair
     * into a new branch node, push those branch nodes onto a new layer,
     * and then recurse, building up the tree to it's root, where the
     * layer only consists of two items.
     */
    async buildLayers(nodes, level = 0) {
        // If there is only 1 node left, this is going to be the root node
        if (nodes.length < 2) {
            const root = nodes[0];
            // console.log("Root layer", root);
            return root;
        }
        const nextLayer = [];
        for (let i = 0; i < nodes.length; i += 2) {
            nextLayer.push(await this.hashBranch(nodes[i], nodes[i + 1]));
        }
        // console.log("Layer", nextLayer);
        return this.buildLayers(nextLayer, level + 1);
    }
    /**
     * Recursively search through all branches of the tree,
     * and generate a proof for each leaf node.
     */
    generateProofs(root) {
        const proofs = this.resolveBranchProofs(root);
        if (!Array.isArray(proofs)) {
            return [proofs];
        }
        return arrayFlatten(proofs);
    }
    resolveBranchProofs(node, proof = new Uint8Array(), depth = 0) {
        if (node.type == "leaf") {
            return {
                offset: node.maxByteRange - 1,
                proof: concatBuffers([proof, node.dataHash, intToBuffer(node.maxByteRange)]),
            };
        }
        if (node.type == "branch") {
            const partialProof = concatBuffers([proof, node.leftChild.id, node.rightChild.id, intToBuffer(node.byteRange)]);
            return [
                this.resolveBranchProofs(node.leftChild, partialProof, depth + 1),
                this.resolveBranchProofs(node.rightChild, partialProof, depth + 1),
            ];
        }
        throw new Error(`Unexpected node type`);
    }
    async validatePath(id, dest, leftBound, rightBound, path) {
        if (rightBound <= 0) {
            return false;
        }
        if (dest >= rightBound) {
            return this.validatePath(id, 0, rightBound - 1, rightBound, path);
        }
        if (dest < 0) {
            return this.validatePath(id, 0, 0, rightBound, path);
        }
        if (path.length == HASH_SIZE + NOTE_SIZE) {
            const pathData = path.slice(0, HASH_SIZE);
            const endOffsetBuffer = path.slice(pathData.length, pathData.length + NOTE_SIZE);
            const pathDataHash = await this.hash([await this.hash(pathData), await this.hash(endOffsetBuffer)]);
            const result = arrayCompare(id, pathDataHash);
            if (result) {
                return {
                    offset: rightBound - 1,
                    leftBound: leftBound,
                    rightBound: rightBound,
                    chunkSize: rightBound - leftBound,
                };
            }
            return false;
        }
        const left = path.slice(0, HASH_SIZE);
        const right = path.slice(left.length, left.length + HASH_SIZE);
        const offsetBuffer = path.slice(left.length + right.length, left.length + right.length + NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = path.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = await this.hash([await this.hash(left), await this.hash(right), await this.hash(offsetBuffer)]);
        if (arrayCompare(id, pathHash)) {
            if (dest < offset) {
                return await this.validatePath(left, dest, leftBound, Math.min(rightBound, offset), remainder);
            }
            return await this.validatePath(right, dest, Math.max(leftBound, offset), rightBound, remainder);
        }
        return false;
    }
    async hashBranch(left, right) {
        if (!right) {
            return left;
        }
        const branch = {
            type: "branch",
            id: await this.hash([await this.hash(left.id), await this.hash(right.id), await this.hash(intToBuffer(left.maxByteRange))]),
            byteRange: left.maxByteRange,
            maxByteRange: right.maxByteRange,
            leftChild: left,
            rightChild: right,
        };
        return branch;
    }
    async hash(data) {
        if (Array.isArray(data)) {
            data = Arweave.utils.concatBuffers(data);
        }
        return new Uint8Array(await this.crypto.hash(data));
    }
    /**
     * Inspect an arweave chunk proof.
     * Takes proof, parses, reads and displays the values for console logging.
     * One proof section per line
     * Format: left,right,offset => hash
     */
    async debug(proof, output = "") {
        if (proof.byteLength < 1) {
            return output;
        }
        const left = proof.slice(0, HASH_SIZE);
        const right = proof.slice(left.length, left.length + HASH_SIZE);
        const offsetBuffer = proof.slice(left.length + right.length, left.length + right.length + NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = proof.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = await this.hash([await this.hash(left), await this.hash(right), await this.hash(offsetBuffer)]);
        const updatedOutput = `${output}\n${JSON.stringify(Buffer.from(left))},${JSON.stringify(Buffer.from(right))},${offset} => ${JSON.stringify(pathHash)}`;
        return this.debug(remainder, updatedOutput);
    }
}
export function arrayFlatten(input) {
    const flat = [];
    input.forEach((item) => {
        if (Array.isArray(item)) {
            flat.push(...arrayFlatten(item));
        }
        else {
            flat.push(item);
        }
    });
    return flat;
}
export function intToBuffer(note) {
    const buffer = new Uint8Array(NOTE_SIZE);
    for (let i = buffer.length - 1; i >= 0; i--) {
        const byte = note % 256;
        buffer[i] = byte;
        note = (note - byte) / 256;
    }
    return buffer;
}
export function bufferToInt(buffer) {
    let value = 0;
    for (let i = 0; i < buffer.length; i++) {
        value *= 256;
        value += buffer[i];
    }
    return value;
}
export const arrayCompare = (a, b) => a.every((value, index) => b[index] === value);
export default Merkle;
//# sourceMappingURL=merkle.js.map