import { pipeline } from "stream/promises";
import { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE } from "../../common/lib/merkle.js";
import Transaction from "../../common/lib/transaction.js";
import { FATAL_CHUNK_UPLOAD_ERRORS } from "../../common/lib/transaction-uploader.js";
import { b64UrlToBuffer, bufferTob64Url } from "../../common/lib/utils.js";
import { chunker } from "./chunker.js";
const MAX_CONCURRENT_CHUNK_UPLOAD_COUNT = 128;
export class Stream {
    crypto;
    merkle;
    api;
    transactions;
    deepHash;
    constructor({ deps, }) {
        this.crypto = deps.crypto;
        this.merkle = deps.merkle;
        this.api = deps.api;
        this.transactions = deps.transactions;
        this.deepHash = deps.deepHash;
    }
    /**
     * Creates an Arweave transaction from the piped data stream.
     */
    createTransactionAsync(attributes, jwk) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const oThis = this;
        return async (source) => {
            const chunks = await pipeline(source, oThis.generateTransactionChunksAsync());
            const txAttrs = Object.assign({}, attributes);
            txAttrs.owner ??= jwk?.n;
            txAttrs.last_tx ??= await oThis.transactions.getTransactionAnchor();
            const lastChunk = chunks.chunks[chunks.chunks.length - 1];
            const dataByteLength = lastChunk.maxByteRange;
            txAttrs.reward ??= await oThis.transactions.getPrice(dataByteLength, txAttrs.target);
            txAttrs.data_size = dataByteLength.toString();
            const tx = new Transaction({ attributes: txAttrs, deps: { merkle: oThis.merkle, deepHash: oThis.deepHash } });
            tx.chunks = chunks;
            tx.data_root = bufferTob64Url(chunks.data_root);
            return tx;
        };
    }
    /**
     * Generates the Arweave transaction chunk information from the piped data stream.
     */
    generateTransactionChunksAsync() {
        const crypto = this.crypto;
        return async (source) => {
            const chunks = [];
            /**
             * @param chunkByteIndex the index the start of the specified chunk is located at within its original data stream.
             */
            const addChunk = async (chunkByteIndex, chunk) => {
                const dataHash = await crypto.hash(chunk);
                const chunkRep = {
                    dataHash,
                    minByteRange: chunkByteIndex,
                    maxByteRange: chunkByteIndex + chunk.byteLength,
                };
                chunks.push(chunkRep);
                return chunkRep;
            };
            let chunkStreamByteIndex = 0;
            let previousDataChunk;
            let expectChunkGenerationCompleted = false;
            await pipeline(source, chunker(MAX_CHUNK_SIZE, { flush: true }), async (chunkedSource) => {
                for await (const chunk of chunkedSource) {
                    if (expectChunkGenerationCompleted) {
                        throw Error("Expected chunk generation to have completed.");
                    }
                    if (chunk.byteLength >= MIN_CHUNK_SIZE && chunk.byteLength <= MAX_CHUNK_SIZE) {
                        await addChunk(chunkStreamByteIndex, chunk);
                    }
                    else if (chunk.byteLength < MIN_CHUNK_SIZE) {
                        if (previousDataChunk) {
                            // If this final chunk is smaller than the minimum chunk size, rebalance this final chunk and
                            // the previous chunk to keep the final chunk size above the minimum threshold.
                            const remainingBytes = Buffer.concat([previousDataChunk, chunk], previousDataChunk.byteLength + chunk.byteLength);
                            const rebalancedSizeForPreviousChunk = Math.ceil(remainingBytes.byteLength / 2);
                            const previousChunk = chunks.pop();
                            const rebalancedPreviousChunk = await addChunk(previousChunk.minByteRange, remainingBytes.slice(0, rebalancedSizeForPreviousChunk));
                            await addChunk(rebalancedPreviousChunk.maxByteRange, remainingBytes.slice(rebalancedSizeForPreviousChunk));
                        }
                        else {
                            // This entire stream should be smaller than the minimum chunk size, just add the chunk in.
                            await addChunk(chunkStreamByteIndex, chunk);
                        }
                        expectChunkGenerationCompleted = true;
                    }
                    else if (chunk.byteLength > MAX_CHUNK_SIZE) {
                        throw Error("Encountered chunk larger than max chunk size.");
                    }
                    chunkStreamByteIndex += chunk.byteLength;
                    previousDataChunk = chunk;
                }
            });
            const leaves = await this.merkle.generateLeaves(chunks);
            const root = await this.merkle.buildLayers(leaves);
            const proofs = this.merkle.generateProofs(root);
            return {
                data_root: root.id,
                chunks,
                proofs,
            };
        };
    }
    /**
     * Uploads the piped data to the specified transaction.
     *
     * @param tx
     * @param arweave
     * @param createTx whether or not the passed transaction should be created on the network.
     * This can be false if we want to reseed an existing transaction,
     * @param debugOpts
     */
    uploadTransactionAsync(tx, createTx = true, debugOpts) {
        const txId = tx.id;
        const log = (message) => {
            if (debugOpts?.log)
                debugOpts.log(`[uploadTransactionAsync:${txId}] ${message}`);
        };
        log(`Starting chunked upload - ${tx.chunks?.chunks?.length} chunks / ${tx.data_size} total bytes`);
        return async (source) => {
            if (!tx.chunks) {
                throw Error("Transaction has no computed chunks!");
            }
            if (createTx) {
                // Ensure the transaction data field is blank.
                // We'll upload this data in chunks instead.
                tx.data = new Uint8Array(0);
                const createTxRes = await this.api.post(`tx`, tx);
                if (!(createTxRes.status >= 200 && createTxRes.status < 300)) {
                    throw new Error(`Failed to create transaction: status ${createTxRes.status} / data ${createTxRes.data}`);
                }
            }
            const txChunkData = tx.chunks;
            const { chunks, proofs } = txChunkData;
            function prepareChunkUploadPayload(chunkIndex, chunkData) {
                const proof = proofs[chunkIndex];
                return {
                    data_root: tx.data_root,
                    data_size: tx.data_size,
                    data_path: bufferTob64Url(proof.proof),
                    offset: proof.offset.toString(),
                    chunk: bufferTob64Url(chunkData),
                };
            }
            log(`Starting pipe - MAX_CHUNK_SIZE=${MAX_CHUNK_SIZE}`);
            await pipeline(source, chunker(MAX_CHUNK_SIZE, { flush: true }), async (chunkedSource) => {
                let chunkIndex = 0;
                let dataRebalancedIntoFinalChunk;
                const activeChunkUploads = [];
                for await (const chunkData of chunkedSource) {
                    const currentChunk = chunks[chunkIndex];
                    const chunkSize = currentChunk.maxByteRange - currentChunk.minByteRange;
                    log(`Got chunk - ${chunkData.byteLength} bytes / chunkSize ${chunkSize}`);
                    const expectedToBeFinalRebalancedChunk = dataRebalancedIntoFinalChunk != null;
                    let chunkPayload;
                    if (chunkData.byteLength === chunkSize) {
                        // If the transaction data chunks was never rebalanced this is the only code path that
                        // will execute as the incoming chunked data as the will always be equivalent to `chunkSize`.
                        chunkPayload = prepareChunkUploadPayload(chunkIndex, chunkData);
                    }
                    else if (chunkData.byteLength > chunkSize) {
                        // If the incoming chunk data is larger than the expected size of the current chunk
                        // it means that the transaction had chunks that were rebalanced to meet the minimum chunk size.
                        //
                        // It also means that the chunk we're currently processing should be the second to last
                        // chunk.
                        chunkPayload = prepareChunkUploadPayload(chunkIndex, chunkData.slice(0, chunkSize));
                        dataRebalancedIntoFinalChunk = chunkData.slice(chunkSize);
                    }
                    else if (chunkData.byteLength < chunkSize && expectedToBeFinalRebalancedChunk) {
                        // If this is the final rebalanced chunk, create the upload payload by concatenating the previous
                        // chunk's data that was moved into this and the remaining stream data.
                        chunkPayload = prepareChunkUploadPayload(chunkIndex, Buffer.concat([dataRebalancedIntoFinalChunk, chunkData], dataRebalancedIntoFinalChunk.length + chunkData.length));
                    }
                    else {
                        throw Error("Transaction data stream terminated incorrectly.");
                    }
                    const chunkValid = await this.merkle.validatePath(txChunkData.data_root, parseInt(chunkPayload.offset), 0, parseInt(chunkPayload.data_size), b64UrlToBuffer(chunkPayload.data_path));
                    if (!chunkValid) {
                        throw new Error(`Unable to validate chunk ${chunkIndex}.`);
                    }
                    // Upload multiple transaction chunks in parallel to speed up the upload.
                    // If we are already at the maximum concurrent chunk upload limit,
                    // wait till all of them to complete first before continuing.
                    if (activeChunkUploads.length >= MAX_CONCURRENT_CHUNK_UPLOAD_COUNT) {
                        await Promise.all(activeChunkUploads);
                        // Clear the active chunk uploads array.
                        activeChunkUploads.length = 0;
                    }
                    // TODO: allow for this abort code behaviour
                    activeChunkUploads.push(this.api.post("chunk", chunkPayload, { retry: { onRetry: (err) => !FATAL_CHUNK_UPLOAD_ERRORS.includes(err.message) } }));
                    chunkIndex++;
                    log(`Chunk process done - ${chunkIndex}`);
                }
                log(`Active chunks to upload - ${activeChunkUploads.length}`);
                await Promise.all(activeChunkUploads);
                if (chunkIndex < chunks.length) {
                    throw Error(`Transaction upload incomplete: ${chunkIndex + 1}/${chunks.length} chunks uploaded.`);
                }
            }).catch((e) => {
                log(e.message);
                throw e;
            });
        };
    }
}
//# sourceMappingURL=index.js.map