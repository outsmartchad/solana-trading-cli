import type CryptoInterface from "./crypto/crypto-interface";
export type Chunk = {
    dataHash: Uint8Array;
    minByteRange: number;
    maxByteRange: number;
};
type BranchNode = {
    readonly id: Uint8Array;
    readonly type: "branch";
    readonly byteRange: number;
    readonly maxByteRange: number;
    readonly leftChild?: MerkleNode;
    readonly rightChild?: MerkleNode;
};
type LeafNode = {
    readonly id: Uint8Array;
    readonly dataHash: Uint8Array;
    readonly type: "leaf";
    readonly minByteRange: number;
    readonly maxByteRange: number;
};
export type MerkleNode = BranchNode | LeafNode;
export declare const MAX_CHUNK_SIZE: number;
export declare const MIN_CHUNK_SIZE: number;
export type Proof = {
    offset: number;
    proof: Uint8Array;
};
type MerkleDeps = {
    crypto: Pick<CryptoInterface, "hash">;
};
export declare class Merkle {
    protected crypto: MerkleDeps["crypto"];
    constructor(opts: {
        deps: MerkleDeps;
    });
    /**
     * Takes the input data and chunks it into (mostly) equal sized chunks.
     * The last chunk will be a bit smaller as it contains the remainder
     * from the chunking process.
     */
    chunkData(data: Uint8Array): Promise<Chunk[]>;
    generateLeaves(chunks: Chunk[]): Promise<LeafNode[]>;
    /**
     * Builds an arweave merkle tree and gets the root hash for the given input.
     */
    computeRootHash(data: Uint8Array): Promise<Uint8Array>;
    generateTree(data: Uint8Array): Promise<MerkleNode>;
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
    generateTransactionChunks(data: Uint8Array): Promise<{
        data_root: Uint8Array;
        chunks: Chunk[];
        proofs: Proof[];
    }>;
    /**
     * Starting with the bottom layer of leaf nodes, hash every second pair
     * into a new branch node, push those branch nodes onto a new layer,
     * and then recurse, building up the tree to it's root, where the
     * layer only consists of two items.
     */
    buildLayers(nodes: MerkleNode[], level?: number): Promise<MerkleNode>;
    /**
     * Recursively search through all branches of the tree,
     * and generate a proof for each leaf node.
     */
    generateProofs(root: MerkleNode): Proof[];
    resolveBranchProofs(node: MerkleNode, proof?: Uint8Array, depth?: number): Proof | Proof[];
    validatePath(id: Uint8Array, dest: number, leftBound: number, rightBound: number, path: Uint8Array): Promise<false | {
        offset: number;
        leftBound: number;
        rightBound: number;
        chunkSize: number;
    }>;
    hashBranch(left: MerkleNode, right: MerkleNode): Promise<MerkleNode>;
    protected hash(data: Uint8Array | Uint8Array[]): Promise<Uint8Array>;
    /**
     * Inspect an arweave chunk proof.
     * Takes proof, parses, reads and displays the values for console logging.
     * One proof section per line
     * Format: left,right,offset => hash
     */
    debug(proof: Uint8Array, output?: string): Promise<string>;
}
export declare function arrayFlatten<T = any>(input: T[]): T[];
export declare function intToBuffer(note: number): Uint8Array;
export declare function bufferToInt(buffer: Uint8Array): number;
export declare const arrayCompare: (a: Uint8Array | any[], b: Uint8Array | any[]) => boolean;
export default Merkle;
