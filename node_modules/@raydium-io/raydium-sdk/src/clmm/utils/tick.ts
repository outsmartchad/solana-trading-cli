import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { TickArrayBitmapExtensionType } from '../clmm'

import { MAX_TICK, MIN_TICK } from './constants'
import { getPdaTickArrayAddress } from './pda'
import { TickQuery } from './tickQuery'

export const TICK_ARRAY_SIZE = 60
export const TICK_ARRAY_BITMAP_SIZE = 512

export type Tick = {
  tick: number
  liquidityNet: BN
  liquidityGross: BN
  feeGrowthOutsideX64A: BN
  feeGrowthOutsideX64B: BN
  rewardGrowthsOutsideX64: BN[]
}

export type TickArray = {
  address: PublicKey
  poolId: PublicKey
  startTickIndex: number
  ticks: Tick[]
  initializedTickCount: number
}

export type TickState = {
  tick: number
  liquidityNet: BN
  liquidityGross: BN
  feeGrowthOutsideX64A: BN
  feeGrowthOutsideX64B: BN
  tickCumulativeOutside: BN
  secondsPerLiquidityOutsideX64: BN
  secondsOutside: number
  rewardGrowthsOutside: BN[]
}

export type TickArrayState = {
  ammPool: PublicKey
  startTickIndex: number
  ticks: TickState[]
  initializedTickCount: number
}

export class TickUtils {
  public static getTickArrayAddressByTick(
    programId: PublicKey,
    poolId: PublicKey,
    tickIndex: number,
    tickSpacing: number,
  ) {
    const startIndex = TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing)
    const { publicKey: tickArrayAddress } = getPdaTickArrayAddress(programId, poolId, startIndex)
    return tickArrayAddress
  }

  public static getTickOffsetInArray(tickIndex: number, tickSpacing: number) {
    if (tickIndex % tickSpacing != 0) {
      throw new Error('tickIndex % tickSpacing not equal 0')
    }
    const startTickIndex = TickUtils.getTickArrayStartIndexByTick(tickIndex, tickSpacing)
    const offsetInArray = Math.floor((tickIndex - startTickIndex) / tickSpacing)
    if (offsetInArray < 0 || offsetInArray >= TICK_ARRAY_SIZE) {
      throw new Error('tick offset in array overflow')
    }
    return offsetInArray
  }

  public static getTickArrayBitIndex(tickIndex: number, tickSpacing: number) {
    const ticksInArray = TickQuery.tickCount(tickSpacing)

    let startIndex: number = tickIndex / ticksInArray
    if (tickIndex < 0 && tickIndex % ticksInArray != 0) {
      startIndex = Math.ceil(startIndex) - 1
    } else {
      startIndex = Math.floor(startIndex)
    }
    return startIndex
  }

  public static getTickArrayStartIndexByTick(tickIndex: number, tickSpacing: number) {
    return this.getTickArrayBitIndex(tickIndex, tickSpacing) * TickQuery.tickCount(tickSpacing)
  }

  public static getTickArrayOffsetInBitmapByTick(tick: number, tickSpacing: number) {
    const multiplier = tickSpacing * TICK_ARRAY_SIZE
    const compressed = Math.floor(tick / multiplier) + 512
    return Math.abs(compressed)
  }

  public static checkTickArrayIsInitialized(bitmap: BN, tick: number, tickSpacing: number) {
    const multiplier = tickSpacing * TICK_ARRAY_SIZE
    const compressed = Math.floor(tick / multiplier) + 512
    const bitPos = Math.abs(compressed)
    return {
      isInitialized: bitmap.testn(bitPos),
      startIndex: (bitPos - 512) * multiplier,
    }
  }

  public static getNextTickArrayStartIndex(lastTickArrayStartIndex: number, tickSpacing: number, zeroForOne: boolean) {
    return zeroForOne
      ? lastTickArrayStartIndex - tickSpacing * TICK_ARRAY_SIZE
      : lastTickArrayStartIndex + tickSpacing * TICK_ARRAY_SIZE
  }

  public static mergeTickArrayBitmap(bns: BN[]) {
    let b = new BN(0)
    for (let i = 0; i < bns.length; i++) {
      b = b.add(bns[i].shln(64 * i))
    }
    return b
    // return bns[0]
    //   .add(bns[1].shln(64))
    //   .add(bns[2].shln(128))
    //   .add(bns[3].shln(192))
    //   .add(bns[4].shln(256))
    //   .add(bns[5].shln(320))
    //   .add(bns[6].shln(384))
    //   .add(bns[7].shln(448))
    //   .add(bns[8].shln(512))
    //   .add(bns[9].shln(576))
    //   .add(bns[10].shln(640))
    //   .add(bns[11].shln(704))
    //   .add(bns[12].shln(768))
    //   .add(bns[13].shln(832))
    //   .add(bns[14].shln(896))
    //   .add(bns[15].shln(960))
  }

  public static getInitializedTickArrayInRange(
    tickArrayBitmap: BN[],
    exTickArrayBitmap: TickArrayBitmapExtensionType,
    tickSpacing: number,
    tickArrayStartIndex: number,
    expectedCount: number,
  ) {
    const tickArrayOffset = Math.floor(tickArrayStartIndex / (tickSpacing * TICK_ARRAY_SIZE))
    return [
      // find right of currenct offset
      ...TickUtils.searchLowBitFromStart(
        tickArrayBitmap,
        exTickArrayBitmap,
        tickArrayOffset - 1,
        expectedCount,
        tickSpacing,
      ),

      // find left of current offset
      ...TickUtils.searchHightBitFromStart(
        tickArrayBitmap,
        exTickArrayBitmap,
        tickArrayOffset,
        expectedCount,
        tickSpacing,
      ),
    ]
  }

  public static getAllInitializedTickArrayStartIndex(
    tickArrayBitmap: BN[],
    exTickArrayBitmap: TickArrayBitmapExtensionType,
    tickSpacing: number,
  ) {
    // find from offset 0 to 1024
    return TickUtils.searchHightBitFromStart(tickArrayBitmap, exTickArrayBitmap, 0, TICK_ARRAY_BITMAP_SIZE, tickSpacing)
  }

  public static getAllInitializedTickArrayInfo(
    programId: PublicKey,
    poolId: PublicKey,
    tickArrayBitmap: BN[],
    exTickArrayBitmap: TickArrayBitmapExtensionType,
    tickSpacing: number,
  ) {
    const result: {
      tickArrayStartIndex: number
      tickArrayAddress: PublicKey
    }[] = []
    const allInitializedTickArrayIndex: number[] = TickUtils.getAllInitializedTickArrayStartIndex(
      tickArrayBitmap,
      exTickArrayBitmap,
      tickSpacing,
    )
    for (const startIndex of allInitializedTickArrayIndex) {
      const { publicKey: address } = getPdaTickArrayAddress(programId, poolId, startIndex)
      result.push({
        tickArrayStartIndex: startIndex,
        tickArrayAddress: address,
      })
    }
    return result
  }

  public static getAllInitializedTickInTickArray(tickArray: TickArrayState) {
    return tickArray.ticks.filter((i) => i.liquidityGross.gtn(0))
  }

  public static searchLowBitFromStart(
    tickArrayBitmap: BN[],
    exTickArrayBitmap: TickArrayBitmapExtensionType,
    currentTickArrayBitStartIndex: number,
    expectedCount: number,
    tickSpacing: number,
  ) {
    const tickArrayBitmaps = [
      ...[...exTickArrayBitmap.negativeTickArrayBitmap].reverse(),
      tickArrayBitmap.slice(0, 8),
      tickArrayBitmap.slice(8, 16),
      ...exTickArrayBitmap.positiveTickArrayBitmap,
    ].map((i) => TickUtils.mergeTickArrayBitmap(i))
    const result: number[] = []
    while (currentTickArrayBitStartIndex >= -7680) {
      const arrayIndex = Math.floor((currentTickArrayBitStartIndex + 7680) / 512)
      const searchIndex = (currentTickArrayBitStartIndex + 7680) % 512

      if (tickArrayBitmaps[arrayIndex].testn(searchIndex)) result.push(currentTickArrayBitStartIndex)

      currentTickArrayBitStartIndex--
      if (result.length === expectedCount) break
    }

    const tickCount = TickQuery.tickCount(tickSpacing)
    return result.map((i) => i * tickCount)
  }

  public static searchHightBitFromStart(
    tickArrayBitmap: BN[],
    exTickArrayBitmap: TickArrayBitmapExtensionType,
    currentTickArrayBitStartIndex: number,
    expectedCount: number,
    tickSpacing: number,
  ) {
    const tickArrayBitmaps = [
      ...[...exTickArrayBitmap.negativeTickArrayBitmap].reverse(),
      tickArrayBitmap.slice(0, 8),
      tickArrayBitmap.slice(8, 16),
      ...exTickArrayBitmap.positiveTickArrayBitmap,
    ].map((i) => TickUtils.mergeTickArrayBitmap(i))
    const result: number[] = []
    while (currentTickArrayBitStartIndex < 7680) {
      const arrayIndex = Math.floor((currentTickArrayBitStartIndex + 7680) / 512)
      const searchIndex = (currentTickArrayBitStartIndex + 7680) % 512

      if (tickArrayBitmaps[arrayIndex].testn(searchIndex)) result.push(currentTickArrayBitStartIndex)

      currentTickArrayBitStartIndex++
      if (result.length === expectedCount) break
    }

    const tickCount = TickQuery.tickCount(tickSpacing)
    return result.map((i) => i * tickCount)
  }

  public static checkIsOutOfBoundary(tick: number): boolean {
    return tick < MIN_TICK || tick > MAX_TICK
  }

  public static nextInitTick(
    tickArrayCurrent: TickArray,
    currentTickIndex: number,
    tickSpacing: number,
    zeroForOne: boolean,
    t: boolean,
  ) {
    const currentTickArrayStartIndex = TickQuery.getArrayStartIndex(currentTickIndex, tickSpacing)
    if (currentTickArrayStartIndex != tickArrayCurrent.startTickIndex) {
      return null
    }
    let offsetInArray = Math.floor((currentTickIndex - tickArrayCurrent.startTickIndex) / tickSpacing)

    if (zeroForOne) {
      while (offsetInArray >= 0) {
        if (tickArrayCurrent.ticks[offsetInArray].liquidityGross.gtn(0)) {
          return tickArrayCurrent.ticks[offsetInArray]
        }
        offsetInArray = offsetInArray - 1
      }
    } else {
      if (!t) offsetInArray = offsetInArray + 1
      while (offsetInArray < TICK_ARRAY_SIZE) {
        if (tickArrayCurrent.ticks[offsetInArray].liquidityGross.gtn(0)) {
          return tickArrayCurrent.ticks[offsetInArray]
        }
        offsetInArray = offsetInArray + 1
      }
    }
    return null
  }

  public static firstInitializedTick(tickArrayCurrent: TickArray, zeroForOne: boolean) {
    if (zeroForOne) {
      let i = TICK_ARRAY_SIZE - 1
      while (i >= 0) {
        if (tickArrayCurrent.ticks[i].liquidityGross.gtn(0)) {
          return tickArrayCurrent.ticks[i]
        }
        i = i - 1
      }
    } else {
      let i = 0
      while (i < TICK_ARRAY_SIZE) {
        if (tickArrayCurrent.ticks[i].liquidityGross.gtn(0)) {
          return tickArrayCurrent.ticks[i]
        }
        i = i + 1
      }
    }

    throw Error(`firstInitializedTick check error: ${tickArrayCurrent} - ${zeroForOne}`)
  }
}
