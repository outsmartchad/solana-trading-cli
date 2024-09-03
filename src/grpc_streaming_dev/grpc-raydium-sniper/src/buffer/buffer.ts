import { MARKET_STATE_LAYOUT_V3 } from '@raydium-io/raydium-sdk';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

export class BufferRingBuffer {
    private buffer: Array<Buffer | null>;
    private head: number;
    private tail: number;
    private count: number;
    private capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array<Buffer | null>(capacity).fill(null);
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }

    isFull(): boolean {
        return this.count === this.capacity;
    }

    isEmpty(): boolean {
        return this.count === 0;
    }

    enqueue(item: Buffer): void {
        if (this.isFull()) {
            this.head = (this.head + 1) % this.capacity;
        } else {
            this.count++;
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
    }

    dequeue(): Buffer | null {
        if (this.isEmpty()) {
            return null;
        }
        const item = this.buffer[this.head];
        this.buffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.count--;
        return item;
    }

    findPattern(publicKey: PublicKey): Buffer | false {
        const publicKeyBuffer = publicKey.toBuffer();
        const baseMintOffset = MARKET_STATE_LAYOUT_V3.offsetOf('baseMint');
        const baseMintEndOffset = baseMintOffset + publicKeyBuffer.length;

        for (let i = this.capacity - 1; i >= 0; i--) {
            if (this.buffer[i]) {
            const baseMintInBuffer = this.buffer[i]!.slice(baseMintOffset, baseMintEndOffset);
            if (baseMintInBuffer.equals(publicKeyBuffer)) {
                console.log(i);
                return this.buffer[i] as Buffer; // PublicKey found
            }
            }
        }
        return false; // PublicKey not found
    }

}


