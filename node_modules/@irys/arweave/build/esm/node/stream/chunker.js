export class ChunkBuffer {
    buffers = [];
    get empty() {
        return this.buffers.length === 0;
    }
    push(...buffers) {
        this.buffers.push(...buffers);
    }
    pop(expectedChunkSize) {
        let totalBufferSize = 0;
        for (const [i, chunk] of this.buffers.entries()) {
            totalBufferSize += chunk.byteLength;
            if (totalBufferSize === expectedChunkSize) {
                return Buffer.concat(this.buffers.splice(0, i + 1));
            }
            else if (totalBufferSize > expectedChunkSize) {
                const chunkOverflowAmount = totalBufferSize - expectedChunkSize;
                const chunkWatermark = chunk.byteLength - chunkOverflowAmount;
                const chunkBelowWatermark = chunk.slice(0, chunkWatermark);
                const chunkOverflow = chunk.slice(chunkWatermark);
                const chunkBuffers = this.buffers.splice(0, i);
                chunkBuffers.push(chunkBelowWatermark);
                this.buffers[0] = chunkOverflow;
                return Buffer.concat(chunkBuffers);
            }
        }
        return null;
    }
    flush() {
        const remaining = Buffer.concat(this.buffers);
        this.buffers.length = 0;
        return remaining;
    }
}
export function chunker(expectedChunkSize, { flush } = { flush: false }) {
    return async function* (stream) {
        const chunkBuffer = new ChunkBuffer();
        for await (const chunk of stream) {
            chunkBuffer.push(chunk);
            while (true) {
                const sizedChunk = chunkBuffer.pop(expectedChunkSize);
                if (!sizedChunk) {
                    break;
                }
                yield sizedChunk;
            }
        }
        if (flush) {
            const flushedBuffer = chunkBuffer.flush();
            if (flushedBuffer.byteLength > 0) {
                yield flushedBuffer;
            }
        }
    };
}
//# sourceMappingURL=chunker.js.map