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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickQuery = exports.FETCH_TICKARRAY_COUNT = void 0;
const common_1 = require("../../common");
const layout_1 = require("../layout");
const constants_1 = require("./constants");
const pda_1 = require("./pda");
const tick_1 = require("./tick");
exports.FETCH_TICKARRAY_COUNT = 15;
class TickQuery {
    static getTickArrays(connection, programId, poolId, tickCurrent, tickSpacing, tickArrayBitmapArray, exTickArrayBitmap) {
        return __awaiter(this, void 0, void 0, function* () {
            const tickArraysToFetch = [];
            const currentTickArrayStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickCurrent, tickSpacing);
            const startIndexArray = tick_1.TickUtils.getInitializedTickArrayInRange(tickArrayBitmapArray, exTickArrayBitmap, tickSpacing, currentTickArrayStartIndex, Math.floor(exports.FETCH_TICKARRAY_COUNT / 2));
            for (let i = 0; i < startIndexArray.length; i++) {
                const { publicKey: tickArrayAddress } = (0, pda_1.getPdaTickArrayAddress)(programId, poolId, startIndexArray[i]);
                tickArraysToFetch.push(tickArrayAddress);
            }
            const fetchedTickArrays = (yield (0, common_1.getMultipleAccountsInfo)(connection, tickArraysToFetch)).map((i) => i !== null ? layout_1.TickArrayLayout.decode(i.data) : null);
            const tickArrayCache = {};
            for (let i = 0; i < tickArraysToFetch.length; i++) {
                const _info = fetchedTickArrays[i];
                if (_info === null)
                    continue;
                tickArrayCache[_info.startTickIndex] = Object.assign(Object.assign({}, _info), { address: tickArraysToFetch[i] });
            }
            return tickArrayCache;
        });
    }
    static nextInitializedTick(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne) {
        let { initializedTick: nextTick, tickArrayAddress, tickArrayStartTickIndex, } = this.nextInitializedTickInOneArray(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne);
        while (nextTick == undefined || nextTick.liquidityGross.lten(0)) {
            tickArrayStartTickIndex = tick_1.TickUtils.getNextTickArrayStartIndex(tickArrayStartTickIndex, tickSpacing, zeroForOne);
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
            ? tick_1.TickUtils.searchLowBitFromStart(tickArrayBitmap, exBitmapInfo, currentOffset - 1, 1, tickSpacing)
            : tick_1.TickUtils.searchHightBitFromStart(tickArrayBitmap, exBitmapInfo, currentOffset + 1, 1, tickSpacing);
        return result.length > 0 ? { isExist: true, nextStartIndex: result[0] } : { isExist: false, nextStartIndex: 0 };
    }
    static firstInitializedTickInOneArray(programId, poolId, tickArray, zeroForOne) {
        let nextInitializedTick = undefined;
        if (zeroForOne) {
            let i = tick_1.TICK_ARRAY_SIZE - 1;
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
            while (i < tick_1.TICK_ARRAY_SIZE) {
                const tickInArray = tickArray.ticks[i];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                i = i + 1;
            }
        }
        const { publicKey: tickArrayAddress } = (0, pda_1.getPdaTickArrayAddress)(programId, poolId, tickArray.startTickIndex);
        return { nextTick: nextInitializedTick, tickArrayAddress, tickArrayStartTickIndex: tickArray.startTickIndex };
    }
    static nextInitializedTickInOneArray(programId, poolId, tickArrayCache, tickIndex, tickSpacing, zeroForOne) {
        const startIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing);
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
            while (tickPositionInArray < tick_1.TICK_ARRAY_SIZE) {
                const tickInArray = cachedTickArray.ticks[tickPositionInArray];
                if (tickInArray.liquidityGross.gtn(0)) {
                    nextInitializedTick = tickInArray;
                    break;
                }
                tickPositionInArray = tickPositionInArray + 1;
            }
        }
        const { publicKey: tickArrayAddress } = (0, pda_1.getPdaTickArrayAddress)(programId, poolId, startIndex);
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
        if (tick_1.TickUtils.checkIsOutOfBoundary(tickIndex)) {
            if (tickIndex > constants_1.MAX_TICK) {
                return false;
            }
            const minStartIndex = tick_1.TickUtils.getTickArrayStartIndexByTick(constants_1.MIN_TICK, tickSpacing);
            return tickIndex == minStartIndex;
        }
        return tickIndex % this.tickCount(tickSpacing) == 0;
    }
    static tickCount(tickSpacing) {
        return tick_1.TICK_ARRAY_SIZE * tickSpacing;
    }
}
exports.TickQuery = TickQuery;
//# sourceMappingURL=tickQuery.js.map