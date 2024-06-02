"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickArrayBitmapExtension = exports.TickArrayBitmap = exports.EXTENSION_TICKARRAY_BITMAP_SIZE = void 0;
const constants_1 = require("./constants");
const tick_1 = require("./tick");
const tickQuery_1 = require("./tickQuery");
const util_1 = require("./util");
exports.EXTENSION_TICKARRAY_BITMAP_SIZE = 14;
class TickArrayBitmap {
    static maxTickInTickarrayBitmap(tickSpacing) {
        return tickSpacing * tick_1.TICK_ARRAY_SIZE * tick_1.TICK_ARRAY_BITMAP_SIZE;
    }
    static getBitmapTickBoundary(tickarrayStartIndex, tickSpacing) {
        const ticksInOneBitmap = this.maxTickInTickarrayBitmap(tickSpacing);
        let m = Math.floor(Math.abs(tickarrayStartIndex) / ticksInOneBitmap);
        if (tickarrayStartIndex < 0 && Math.abs(tickarrayStartIndex) % ticksInOneBitmap != 0)
            m += 1;
        const minValue = ticksInOneBitmap * m;
        return tickarrayStartIndex < 0
            ? { minValue: -minValue, maxValue: -minValue + ticksInOneBitmap }
            : { minValue, maxValue: minValue + ticksInOneBitmap };
    }
    static nextInitializedTickArrayStartIndex(bitMap, lastTickArrayStartIndex, tickSpacing, zeroForOne) {
        if (!tickQuery_1.TickQuery.checkIsValidStartIndex(lastTickArrayStartIndex, tickSpacing))
            throw Error('nextInitializedTickArrayStartIndex check error');
        const tickBoundary = this.maxTickInTickarrayBitmap(tickSpacing);
        const nextTickArrayStartIndex = zeroForOne
            ? lastTickArrayStartIndex - tickQuery_1.TickQuery.tickCount(tickSpacing)
            : lastTickArrayStartIndex + tickQuery_1.TickQuery.tickCount(tickSpacing);
        if (nextTickArrayStartIndex < -tickBoundary || nextTickArrayStartIndex >= tickBoundary) {
            return { isInit: false, tickIndex: lastTickArrayStartIndex };
        }
        const multiplier = tickSpacing * tick_1.TICK_ARRAY_SIZE;
        let compressed = nextTickArrayStartIndex / multiplier + 512;
        if (nextTickArrayStartIndex < 0 && nextTickArrayStartIndex % multiplier != 0) {
            compressed--;
        }
        const bitPos = Math.abs(compressed);
        if (zeroForOne) {
            const offsetBitMap = bitMap.shln(1024 - bitPos - 1);
            const nextBit = (0, util_1.mostSignificantBit)(1024, offsetBitMap);
            if (nextBit !== null) {
                const nextArrayStartIndex = (bitPos - nextBit - 512) * multiplier;
                return { isInit: true, tickIndex: nextArrayStartIndex };
            }
            else {
                return { isInit: false, tickIndex: -tickBoundary };
            }
        }
        else {
            const offsetBitMap = bitMap.shrn(bitPos);
            const nextBit = (0, util_1.leastSignificantBit)(1024, offsetBitMap);
            if (nextBit !== null) {
                const nextArrayStartIndex = (bitPos + nextBit - 512) * multiplier;
                return { isInit: true, tickIndex: nextArrayStartIndex };
            }
            else {
                return { isInit: false, tickIndex: tickBoundary - tickQuery_1.TickQuery.tickCount(tickSpacing) };
            }
        }
    }
}
exports.TickArrayBitmap = TickArrayBitmap;
class TickArrayBitmapExtension {
    static getBitmapOffset(tickIndex, tickSpacing) {
        if (!tickQuery_1.TickQuery.checkIsValidStartIndex(tickIndex, tickSpacing)) {
            throw new Error('No enough initialized tickArray');
        }
        this.checkExtensionBoundary(tickIndex, tickSpacing);
        const ticksInOneBitmap = TickArrayBitmap.maxTickInTickarrayBitmap(tickSpacing);
        let offset = Math.floor(Math.abs(tickIndex) / ticksInOneBitmap) - 1;
        if (tickIndex < 0 && Math.abs(tickIndex) % ticksInOneBitmap === 0)
            offset--;
        return offset;
    }
    static getBitmap(tickIndex, tickSpacing, tickArrayBitmapExtension) {
        const offset = this.getBitmapOffset(tickIndex, tickSpacing);
        if (tickIndex < 0) {
            return { offset, tickarrayBitmap: tickArrayBitmapExtension.negativeTickArrayBitmap[offset] };
        }
        else {
            return { offset, tickarrayBitmap: tickArrayBitmapExtension.positiveTickArrayBitmap[offset] };
        }
    }
    static checkExtensionBoundary(tickIndex, tickSpacing) {
        const { positiveTickBoundary, negativeTickBoundary } = this.extensionTickBoundary(tickSpacing);
        if (tickIndex >= negativeTickBoundary && tickIndex < positiveTickBoundary) {
            throw Error('checkExtensionBoundary -> InvalidTickArrayBoundary');
        }
    }
    static extensionTickBoundary(tickSpacing) {
        const positiveTickBoundary = TickArrayBitmap.maxTickInTickarrayBitmap(tickSpacing);
        const negativeTickBoundary = -positiveTickBoundary;
        if (constants_1.MAX_TICK <= positiveTickBoundary)
            throw Error(`extensionTickBoundary check error: ${constants_1.MAX_TICK}, ${positiveTickBoundary}`);
        if (negativeTickBoundary <= constants_1.MIN_TICK)
            throw Error(`extensionTickBoundary check error: ${negativeTickBoundary}, ${constants_1.MIN_TICK}`);
        return { positiveTickBoundary, negativeTickBoundary };
    }
    static checkTickArrayIsInit(tickArrayStartIndex, tickSpacing, tickArrayBitmapExtension) {
        const { tickarrayBitmap } = this.getBitmap(tickArrayStartIndex, tickSpacing, tickArrayBitmapExtension);
        const tickArrayOffsetInBitmap = this.tickArrayOffsetInBitmap(tickArrayStartIndex, tickSpacing);
        return {
            isInitialized: tick_1.TickUtils.mergeTickArrayBitmap(tickarrayBitmap).testn(tickArrayOffsetInBitmap),
            startIndex: tickArrayStartIndex,
        };
    }
    static nextInitializedTickArrayFromOneBitmap(lastTickArrayStartIndex, tickSpacing, zeroForOne, tickArrayBitmapExtension) {
        const multiplier = tickQuery_1.TickQuery.tickCount(tickSpacing);
        const nextTickArrayStartIndex = zeroForOne
            ? lastTickArrayStartIndex - multiplier
            : lastTickArrayStartIndex + multiplier;
        const minTickArrayStartIndex = tickQuery_1.TickQuery.getArrayStartIndex(constants_1.MIN_TICK, tickSpacing);
        const maxTickArrayStartIndex = tickQuery_1.TickQuery.getArrayStartIndex(constants_1.MAX_TICK, tickSpacing);
        if (nextTickArrayStartIndex < minTickArrayStartIndex || nextTickArrayStartIndex > maxTickArrayStartIndex) {
            return {
                isInit: false,
                tickIndex: nextTickArrayStartIndex,
            };
        }
        const { tickarrayBitmap } = this.getBitmap(nextTickArrayStartIndex, tickSpacing, tickArrayBitmapExtension);
        return this.nextInitializedTickArrayInBitmap(tickarrayBitmap, nextTickArrayStartIndex, tickSpacing, zeroForOne);
    }
    static nextInitializedTickArrayInBitmap(tickarrayBitmap, nextTickArrayStartIndex, tickSpacing, zeroForOne) {
        const { minValue: bitmapMinTickBoundary, maxValue: bitmapMaxTickBoundary } = TickArrayBitmap.getBitmapTickBoundary(nextTickArrayStartIndex, tickSpacing);
        const tickArrayOffsetInBitmap = this.tickArrayOffsetInBitmap(nextTickArrayStartIndex, tickSpacing);
        if (zeroForOne) {
            // tick from upper to lower
            // find from highter bits to lower bits
            const offsetBitMap = tick_1.TickUtils.mergeTickArrayBitmap(tickarrayBitmap).shln(tick_1.TICK_ARRAY_BITMAP_SIZE - 1 - tickArrayOffsetInBitmap);
            const nextBit = (0, util_1.isZero)(512, offsetBitMap) ? null : (0, util_1.leadingZeros)(512, offsetBitMap);
            if (nextBit !== null) {
                const nextArrayStartIndex = nextTickArrayStartIndex - nextBit * tickQuery_1.TickQuery.tickCount(tickSpacing);
                return { isInit: true, tickIndex: nextArrayStartIndex };
            }
            else {
                // not found til to the end
                return { isInit: false, tickIndex: bitmapMinTickBoundary };
            }
        }
        else {
            // tick from lower to upper
            // find from lower bits to highter bits
            const offsetBitMap = tick_1.TickUtils.mergeTickArrayBitmap(tickarrayBitmap).shrn(tickArrayOffsetInBitmap);
            const nextBit = (0, util_1.isZero)(512, offsetBitMap) ? null : (0, util_1.trailingZeros)(512, offsetBitMap);
            if (nextBit !== null) {
                const nextArrayStartIndex = nextTickArrayStartIndex + nextBit * tickQuery_1.TickQuery.tickCount(tickSpacing);
                return { isInit: true, tickIndex: nextArrayStartIndex };
            }
            else {
                // not found til to the end
                return { isInit: false, tickIndex: bitmapMaxTickBoundary - tickQuery_1.TickQuery.tickCount(tickSpacing) };
            }
        }
    }
    static tickArrayOffsetInBitmap(tickArrayStartIndex, tickSpacing) {
        const m = Math.abs(tickArrayStartIndex) % TickArrayBitmap.maxTickInTickarrayBitmap(tickSpacing);
        let tickArrayOffsetInBitmap = Math.floor(m / tickQuery_1.TickQuery.tickCount(tickSpacing));
        if (tickArrayStartIndex < 0 && m != 0) {
            tickArrayOffsetInBitmap = tick_1.TICK_ARRAY_BITMAP_SIZE - tickArrayOffsetInBitmap;
        }
        return tickArrayOffsetInBitmap;
    }
}
exports.TickArrayBitmapExtension = TickArrayBitmapExtension;
//# sourceMappingURL=tickarrayBitmap.js.map