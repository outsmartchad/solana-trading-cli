# @metaplex-foundation/beet

Strict borsh compatible de/serializer.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Features](#features)
- [Fixed Size vs. Dynamic Types](#fixed-size-vs-dynamic-types)
- [API](#api)
- [Examples](#examples)
  - [Single Fixed Struct Configuration](#single-fixed-struct-configuration)
  - [Single Fixable Struct Configuration](#single-fixable-struct-configuration)
  - [Nested Struct Configuration](#nested-struct-configuration)
  - [Struct with non-primitive fields](#struct-with-non-primitive-fields)
  - [Using Beet Primitives Directly](#using-beet-primitives-directly)
    - [Fixed Size](#fixed-size)
    - [Dynamic Size](#dynamic-size)
  - [Using Beet Composites Directly](#using-beet-composites-directly)
    - [Option](#option)
    - [Array](#array)
      - [Uniform Fixed Size](#uniform-fixed-size)
      - [Dynamic Size](#dynamic-size-1)
    - [Enum with Data Variants](#enum-with-data-variants)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Features

- fully composable, i.e. `coption(array(utf8String))` is handled
correctly
- structs can be nested and composed
- pre-computes `byteSize` of any fixed size type, no matter how deeply nested or composed it is
- converts non-fixed types to their fixed versions simply by providing a value or serialized
  data
- fixed size and _fixable_ structs expose identical serialize/deserialize API and perform
  conversions under the hood when needed
- logs struct configs including byte sizes as well as de/serialization tasks for easy
diagnostics

```
beet:debug struct GameStruct {
beet:debug   win: u8 1 B
beet:debug   totalWin: u16 2 B
beet:debug   whaleAccount: u128 16 B
beet:debug   losses: i32 4 B
beet:debug } 23 B +0ms
beet:trace serializing [GameStruct] _GameScore { win: 1, totalWin: 100, whaleAccount: <BN: fffffffffffffffffffffffffffffffb>, losses: -234 } to 23 bytes buffer +0ms
beet:trace deserializing [GameStruct] from 23 bytes buffer +2ms
beet:trace <Buffer 01 64 00 fb ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff 16 ff ff ff> +0ms
beet:trace [
beet:trace     1, 100,   0, 251, 255, 255,
beet:trace   255, 255, 255, 255, 255, 255,
beet:trace   255, 255, 255, 255, 255, 255,
beet:trace   255,  22, 255, 255, 255
beet:trace ] +0ms
```

## Fixed Size vs. Dynamic Types 

Beet is optimized for _fixed_ types as this allows logging detailed diagnostics about the
structure of data that it is processing as well as avoiding Buffer resizes.

Only _beets_ that have _fixed_ in the name are of fixed size, all others are _fixable_ types
which expose `toFixedFromData` and `toFixedFromValue` methods to convert to a _fixed beet_ from
serialized data or a value respectively.

Beet provides the `FixableBeetStruct` to de/serialize args that have non-fixed size fields. 

Thus beet implements the entire [borsh spec](https://borsh.io/), however if you want a library
that processes dynamic types directly use one of the alternatives, i.e. [borsh-js](https://github.com/near/borsh-js).

## API

Please find the [API docs here](https://metaplex-foundation.github.io/beet/docs/beet).

## Examples

### Single Fixed Struct Configuration

```ts
import { BeetStruct, i32, u16, u8 } from '@metaplex-foundation/beet'

class Result {
  constructor(
    readonly win: number,
    readonly totalWin: number,
    readonly losses: number
  ) {}

  static readonly struct = new BeetStruct<Result>(
    [
      ['win', u8],
      ['totalWin', u16],
      ['losses', i32],
    ],
    (args) => new Result(args.win!, args.totalWin!, args.losses!),
    'Results'
  )
}
```

### Single Fixable Struct Configuration

```ts
import { FixableBeetStruct, i32, u16, u8, array } from '@metaplex-foundation/beet'

class Result {
  constructor(
    readonly win: number,
    readonly totalWin: number,
    readonly losses: number[]
  ) {}

  static readonly struct = new FixableBeetStruct<Result>(
    [
      ['win', u8],
      ['totalWin', u16],
      ['losses', array(i32)],
    ],
    (args) => new Result(args.win!, args.totalWin!, args.losses!),
    'Results'
  )
}
```

### Nested Struct Configuration

**NOTE:** uses `Result` struct from the above example for the `results` field of `Trader`

```ts
import { BeetStruct, fixedSizeUtf8String } from '@metaplex-foundation/beet'
class Trader {
  constructor(
    readonly name: string,
    readonly results: Results,
    readonly age: number
  ) {}

  static readonly struct = new BeetStruct<Trader>(
    [
      ['name', fixedSizeUtf8String(4)],
      ['results', Results.struct],
      ['age', u8],
    ],
    (args) => new Trader(args.name!, args.results!, args.age!),
    'Trader'
  )
}
  
const trader = new Trader('bob ', new Results(20, 1200, -455), 22)
const [buf] = Trader.struct.serialize(trader)
const [deserializedTrader] = Trader.struct.deserialize(buf)
```

### Struct with non-primitive fields

**NOTE:** depends on `beet-solana` extension package for the `PublicKey` implementation

```ts
import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'

type InstructionArgs = {
  instructionDiscriminator: number[]
  authority: web3.PublicKey
  maybePublickKey: beet.COption<web3.PublicKey>
}

// Uses the BeetArgsStruct wrapper around BeetStruct
const createStruct = new beet.BeetArgsStruct<InstructionArgs>(
  [
    ['instructionDiscriminator', beet.fixedSizeArray(beet.u8, 8)],
    ['authority', beetSolana.publicKey],
    ['maybePublickKey', beet.coption(beetSolana.publicKey)],
  ],
  'InstructionArgs'
)
```

### Using Beet Primitives Directly

#### Fixed Size

```ts
import { u8 } from '@metaplex-foundation/beet'
const n = 1
const buf = Buffer.alloc(u8.byteSize)
u8.write(buf, 0, n)
u8.read(buf, 0) // === 1
```

#### Dynamic Size

```ts
import { u8, array } from '@metaplex-foundation/beet'
const xs = [ 1, 2 ]
const beet = array(u8)
const fixedBeet = beet.toFixedFromValue(xs)
const buf = Buffer.alloc(fixedBeet.byteSize)
fixedBeet.write(buf, 0, xs)
fixedBeet.read(buf, 0) // === [ 1, 2 ]
```

### Using Beet Composites Directly

**NOTE:** use `Result` struct from the above example to wrap in a _Composite_ type 

#### Option

**NOTE:** that the `coption` is a _fixable_ beet since it has a different size for the _Some_ vs.
the _None_ case.

```ts
const resultOption: Beet<COption<Result>> = coption(Result.struct)

const result = new Result(20, 1200, -455)
const fixedBeet = resultOption.toFixedFromValue(result)

const buf = Buffer.alloc(fixedBeet.byteSize)
fixedBeet.write(buf, 0, result)
beet.read(buf, 0) // same  as result
```

#### Array

##### Uniform Fixed Size

```ts
const resultArray: Beet<Array<Result>> = uniformFixedSizeArray(Result.struct, 3)
const results =[ new Result(20, 1200, -455), new Result(3, 999, 0), new Result(30, 100, -3) ]
const buf = Buffer.alloc(resultArray.byteSize)
beet.write(buf, 0, results)
beet.read(buf, 0) // same  as results
```

##### Dynamic Size

```ts
const resultArray: Beet<Array<Result>> = array(Result.struct)
const results =[ new Result(20, 1200, -455), new Result(3, 999, 0), new Result(30, 100, -3) ]
const fixedBeet = resultsArray.toFixedFromValue(results)

const buf = Buffer.alloc(fixedBeet.byteSize)
fixedBeet.write(buf, 0, results)
fixedBeet.read(buf, 0) // same  as results
```

#### Enum with Data Variants

NOTE: this sample is what [solita](https://github.com/metaplex-foundation/solita) will generate from a provided IDL. solita is the
recommended way to create TypeScript that uses beet for de/serialization.

```ts
// -----------------
// Setup
// -----------------
type CollectionInfoRecord = {
  V1: {
    symbol: string
    verifiedCreators: web3.PublicKey[]
    whitelistRoot: number[] /* size: 32 */
  }
  V2: { collectionMint: web3.PublicKey }
}
type CollectionInfo = beet.DataEnumKeyAsKind<CollectionInfoRecord>

const collectionInfoBeet = beet.dataEnum<CollectionInfoRecord>([
  [
    'V1',
    new beet.FixableBeetArgsStruct<CollectionInfoRecord['V1']>(
      [
        ['symbol', beet.utf8String],
        ['verifiedCreators', beet.array(beetSolana.publicKey)],
        ['whitelistRoot', beet.uniformFixedSizeArray(beet.u8, 32)],
      ],
      'CollectionInfoRecord["V1"]'
    ),
  ],

  [
    'V2',
    new beet.BeetArgsStruct<CollectionInfoRecord['V2']>(
      [['collectionMint', beetSolana.publicKey]],
      'CollectionInfoRecord["V2"]'
    ),
  ],
]) as beet.FixableBeet<CollectionInfo>

// -----------------
// Usage
// -----------------
const collectionV1: CollectionInfo & { __kind: 'V1' } = {
  __kind: 'V1',
  symbol: 'SYM',
  verifiedCreators: [new web3.PublicKey(1), new web3.PublicKey(2)],
  whitelistRoot: new Array(32).fill(33),
}
const fixedBeet = collectionInfoBeet.toFixedFromValue(collectionV1)

// Serialize
const buf = Buffer.alloc(fixedBeet.byteSize)
fixedBeet.write(buf, 0, collectionV1)

// Deserialize
const val = fixedBeet.read(buf, 0)
console.log(val)
```

## LICENSE

Apache-2.0
