# near-api-js

[![Build Status](https://travis-ci.com/near/near-api-js.svg?branch=master)](https://travis-ci.com/near/near-api-js)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/near/near-api-js) 

A JavaScript/TypeScript library for development of DApps on the NEAR platform

# Documentation

[Read the TypeDoc API documentation](https://near.github.io/near-api-js/)

---

# Examples

## [Quick Reference](https://github.com/near/near-api-js/blob/master/examples/quick-reference.md)
_(Cheat sheet / quick reference)_

## [Cookbook](https://github.com/near/near-api-js/blob/master/examples/cookbook/README.md)
_(Common use cases / more complex examples)_

---

# Contribute to this library

1. Install dependencies

       yarn

2. Run continuous build with:

       yarn build -- -w


# Publish

Prepare `dist` version by running:

    yarn dist

When publishing to npm use [np](https://github.com/sindresorhus/np).

---

# Integration Test

Start the node by following instructions from [nearcore](https://github.com/nearprotocol/nearcore), then

    yarn test

Tests use sample contract from `near-hello` npm package, see https://github.com/nearprotocol/near-hello

# Update error schema

Follow next steps:

1. [Change hash for the commit with errors in the nearcore](https://github.com/near/near-api-js/blob/master/gen_error_types.js#L7-L9)
2. Fetch new schema: `node fetch_error_schema.js`
3. `yarn build` to update `lib/**.js` files

# License

This repository is distributed under the terms of both the MIT license and the Apache License (Version 2.0).
See [LICENSE](LICENSE) and [LICENSE-APACHE](LICENSE-APACHE) for details.
