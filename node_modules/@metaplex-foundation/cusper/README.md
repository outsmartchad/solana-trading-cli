# Cusper [![Build Lint and Test Cusper](https://github.com/metaplex-foundation/cusper/actions/workflows/build-lint-test.yml/badge.svg)](https://github.com/metaplex-foundation/cusper/actions/workflows/build-lint-test.yml)

Resolves Custom Program Errors from Solana program logs or error codes.

## Example

```ts
import { initCusper } from '@metaplex-foundation/cusper'

const cusper = initCusper(/* optionally provide custom error resolver here */)

const logs = [
  'Program CwrqeMj2U8tFr1Rhkgwc84tpAsqbt9pTt2a4taoTADPr invoke [1]',
  'Program log: Custom program error: 0x07D0',
]
function showError() {
  try {
    const error = { ...new Error('Test error'), logs }
    cusper.throwError(error)
  } catch (err) {
    console.error(err)
  }
}

showError()
```

```
AnchorError#ConstraintMut: A mut constraint was violated
    at showError (/cusper/test/test/ex.ts:13:12)
    [ .. ]
```

## API

Please find the [API docs here](https://metaplex-foundation.github.io/cusper/docs/)

## LICENSE

Apache-2.0
