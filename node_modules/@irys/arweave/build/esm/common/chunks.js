import BigNumber from "bignumber.js";
import { getError } from "./lib/error.js";
import * as ArweaveUtils from "./lib/utils.js";
import { MAX_CHUNK_SIZE } from "./lib/merkle.js";
export default class Chunks {
    api;
    constructor(api) {
        this.api = api;
    }
    async getTransactionMetadata(id) {
        const resp = await this.api.get(`tx/${id}/offset`);
        if (resp.status === 200) {
            return resp.data;
        }
        throw new Error(`Unable to get transaction offset: ${getError(resp)}`);
    }
    async getChunk(offset) {
        const resp = await this.api.get(`chunk/${offset}`);
        if (resp.status === 200) {
            return resp.data;
        }
        throw new Error(`Unable to get chunk: ${getError(resp)}`);
    }
    async getChunkData(offset) {
        const chunk = await this.getChunk(offset);
        const buf = ArweaveUtils.b64UrlToBuffer(chunk.chunk);
        return buf;
    }
    firstChunkOffset(offsetResponse) {
        return parseInt(offsetResponse.offset) - parseInt(offsetResponse.size) + 1;
    }
    /**
     * Downloads chunks from the configured API peers, with a default concurrency of 10
     * @param id - ID of the transaction to download
     * @param options - Options object for configuring the downloader
     * @param options.concurrency - The number of chunks to download simultaneously. reduce on slower connections.
     * @returns
     */
    async downloadChunkedData(id, options) {
        const offsetResponse = await this.getTransactionMetadata(id);
        const size = parseInt(offsetResponse.size);
        const data = new Uint8Array(size);
        let byte = 0;
        for await (const chunkData of this.concurrentChunkDownloader(id, options)) {
            data.set(chunkData, byte);
            byte += chunkData.length;
        }
        return data;
    }
    async *concurrentChunkDownloader(id, options) {
        const opts = { concurrency: 10, ...options };
        const metadata = await this.getTransactionMetadata(id);
        // use big numbers for safety
        const endOffset = new BigNumber(metadata.offset);
        const size = new BigNumber(metadata.size);
        const startOffset = endOffset.minus(size).plus(1);
        let processedBytes = 0;
        const chunks = Math.ceil(size.dividedBy(MAX_CHUNK_SIZE).toNumber());
        const downloadData = (offset) => this.getChunkData(offset.toString()).then((r) => {
            processedBytes += r.length;
            return r;
        });
        const processing = [];
        // only parallelise everything except last two chunks.
        // last two due to merkle rebalancing due to minimum chunk size, see https://github.com/ArweaveTeam/arweave-js/blob/ce441f8d4e66a2524cfe86bbbcaed34b887ba193/src/common/lib/merkle.ts#LL53C19-L53C19
        const parallelChunks = chunks - 2;
        const concurrency = Math.min(parallelChunks, opts.concurrency);
        let currChunk = 0;
        // logger.debug(`[downloadTx] Tx ${txId} start ${startOffset} size ${size} chunks ${chunks} concurrency ${concurrency}`);
        for (let i = 0; i < concurrency; i++)
            processing.push(downloadData(startOffset.plus(MAX_CHUNK_SIZE * currChunk++)));
        while (currChunk < parallelChunks) {
            processing.push(downloadData(startOffset.plus(MAX_CHUNK_SIZE * currChunk++)));
            // yield await so that processedBytes works properly
            yield processing.shift();
        }
        while (processing.length > 0)
            yield processing.shift();
        yield downloadData(startOffset.plus(MAX_CHUNK_SIZE * currChunk++));
        if (size.isGreaterThan(processedBytes))
            yield downloadData(startOffset.plus(MAX_CHUNK_SIZE * currChunk++));
        if (!size.isEqualTo(processedBytes))
            throw new Error(`got ${processedBytes}B, expected ${size.toString()}B`);
        return;
    }
}
//# sourceMappingURL=chunks.js.map