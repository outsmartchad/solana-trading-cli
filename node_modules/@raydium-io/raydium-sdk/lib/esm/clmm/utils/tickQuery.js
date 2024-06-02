import { getMultipleAccountsInfo } from '../../common';
import { TickArrayLayout } from '../layout';
import { MAX_TICK, MIN_TICK } from './constants';
import { getPdaTickArrayAddress } from './pda';
import { TICK_ARRAY_SIZE, TickUtils } from './tick';
export const FETCH_TICKARRAY_COUNT = 15;
export class TickQuery {
    static async getTickArrays(connection, programId, poolId, tickCurrent, tickSpacing, tickArrayBitmapArray, exTickArrayBitmap) {
        const tickArraysToFetch = [];
        const currentTickArrayStartIndex = TickUtils.getTickArrayStartIndexByTick(tickCurrent, tickSpacing);
        const startIndexArray = TickUtils.getInitializedTickArrayInRange(tickArrayBitmapArray, exTickArrayBitmap, tickSpacing, currentTickArrayStartIndex, Math.floor(FETCH_TICKARRAY_COUNT / 2));
        for (let i = 0; i < startIndexArray.length; i++) {
            const { publicKey: tickArrayAddress } = getPdaTickArrayAddress(programId, poolId, startIndexArray[i]);
            tickArraysToFetch.push(tickArrayAddress);
        }
        const fetchedTickArrays = (await getMultipleAccountsInfo(connection, tickArraysToFetch)).map((i) => i !== null ? TickArrayLayout.decode(i.data) : null);
        const tickArrayCache = {};
        for (let i = 0; i < tickArraysToFetch.length; i++) {
            const _info = fetchedTickArrays[i];
            if (_info === null)
                continue;
            tickArrayCache[_info.startTickIndex] = {
                ..._info,
                address: tickArraysToFetch[i],
            };
        }
        return tickArrayCache;
    }
    static nextInitializedTick(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne) {
        let { initializedTick: nextTick, tickArrayAddress, tickArrayStartTickIndex, } = this.nextInitializedTickInOneArray(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne);
        while (nextTick == undefined || nextTick.liquidityGross.lten(0)) {
            tickArrayStartTickIndex = TickUtils.getNextTickArrayStartIndex(tickArrayStartTickIndex, tickSpacing, zeroForOne);
            if (this.checkIsValidStartIndex(tickArrayStartTickIndex, tickSpacing)) {
                throw new Error('No enough initialized tickArray');
            }
            const cachedTickArray = tickArrayCache[tickArrayStartTickIndex];
            if (cachedTickArray === undefined)
                continue;
            const { nextTick: _nextTick, tickArrayAddress: _tickArrayAddress, tickArrayStartTickIndex: _tickArrayStartTickIndex, } = this.firstInitializedTickInOneArray(programId, poolId, cachedTickArray, zeroForOne);
            [nextTick, tickArrayAddress, tickArrayStartTickIndex] = [_nextTick, _tickArrayAddress, _tickArrayStartTickIndex];
        }
        if (nextTick == undefined) {
            throw new Error('No invaild tickArray cache');
        }
        return { nextTick, tickArrayAddress, tickArrayStartTickIndex };
    }
    static nextInitializedTickArray(tickIndex, tickSpacing, zeroForOne, tickArrayBitmap, exBitmapInfo) {
        const currentOffset = Math.floor(tickIndex / TickQuery.tickCount(tickSpacing));
        const result = zeroForOne
            ? TickUtils.searchLowBitFromStart(tickArrayBitmap, exBitmapInfo, currentOffset - 1, 1, tickSpacing)
            : TickUtils.searchHightBitFromStart(tickArrayBitmap, exBitmapInfo, currentOffset + 1, 1, tickSpacing);
        return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 };
    }
    static firstInitializedTickInOneArray(programId, poolId, tickArray, zeroForOne) {
        let nextInitializedTick = undefined;
        if (zeroForOne) {
            let i = TICK_ARRAY_SIZE - 1;
            while (i >= 0) {
                const tickInArray = tickArray.ticks[i];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                i = i - 1;
            }
        }
        else {
            let i = 0;
            while (i < TICK_ARRAY_SIZE) {
                const tickInArray = tickArray.ticks[i];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                i = i + 1;
            }
        }
        const { publicKey: tickArrayAddress } = getPdaTickArrayAddress(programId, poolId, tickArray.startTickIndex);
        return { nextTick: nextInitializedTick, tickArrayAddress, tickArrayStartTickIndex: tickArray.startTickIndex };
    }
    static nextInitializedTickInOneArray(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne) {
        const startIndex = TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing);
        let tickPositionInArray = Math.floor((tickIndex - startIndex) / tickSpacing);
        const cachedTickArray = tickArrayCache[startIndex];
        if (cachedTickArray == undefined) {
            return {
                initializedTick: undefined,
                tickArrayAddress: undefined,
                tickArrayStartTickIndex: startIndex,
            };
        }
        let nextInitializedTick = undefined;
        if (zeroForOne) {
            while (tickPositionInArray >= 0) {
                const tickInArray = cachedTickArray.ticks[tickPositionInArray];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                tickPositionInArray = tickPositionInArray - 1;
            }
        }
        else {
            tickPositionInArray = tickPositionInArray + 1;
            while (tickPositionInArray < TICK_ARRAY_SIZE) {
                const tickInArray = cachedTickArray.ticks[tickPositionInArray];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                tickPositionInArray = tickPositionInArray + 1;
            }
        }
        const { publicKey: tickArrayAddress } = getPdaTickArrayAddress(programId, poolId, startIndex);
        return {
            initializedTick: nextInitializedTick,
            tickArrayAddress,
            tickArrayStartTickIndex: cachedTickArray.startTickIndex,
        };
    }
    static getArrayStartIndex(tickIndex, tickSpacing) {
        const ticksInArray = this.tickCount(tickSpacing);
        const start = Math.floor(tickIndex / ticksInArray);
        return start * ticksInArray;
    }
    static checkIsValidStartIndex(tickIndex, tickSpacing) {
        if (TickUtils.checkIsOutOfBoundary(tickIndex)) {
            if (tickIndex > MAX_TICK) {
                return false;
            }
            const minStartIndex = TickUtils.getTickArrayStartIndexByTick(MIN_TICK, tickSpacing);
            return tickIndex == minStartIndex;
        }
        return tickIndex % this.tickCount(tickSpacing) == 0;
    }
    static tickCount(tickSpacing) {
        return TICK_ARRAY_SIZE * tickSpacing;
    }
}
//# sourceMappingURL=tickQuery.js.map