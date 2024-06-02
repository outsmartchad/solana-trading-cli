# capability.js - javascript environment capability detection

[![Build Status](https://travis-ci.org/inf3rno/capability.png?branch=master)](https://travis-ci.org/inf3rno/capability)

The capability.js library provides capability detection for different javascript environments.

## Documentation

This project is empty yet.

### Installation

```bash
npm install capability
```

```bash
bower install capability
```

#### Environment compatibility

The lib requires only basic javascript features, so it will run in every js environments.

#### Requirements

If you want to use the lib in browser, you'll need a node module loader, e.g. browserify, webpack, etc...

#### Usage

In this documentation I used the lib as follows:

```js
var capability = require("capability");
```

### Capabilities API

#### Defining a capability

You can define a capability by using the `define(name, test)` function.

```js
capability.define("Object.create", function () {
    return Object.create;
});
```

The `name` parameter should contain the identifier of the capability and the `test` parameter should contain a function, which can detect the capability.
If the capability is supported by the environment, then the `test()` should return `true`, otherwise it should return `false`.

You don't have to convert the return value into a `Boolean`, the library will do that for you, so you won't have memory leaks because of this.

#### Testing a capability

The `test(name)` function will return a `Boolean` about whether the capability is supported by the actual environment.

```js
console.log(capability.test("Object.create"));
    // true - in recent environments
    // false - by pre ES5 environments without Object.create
```

You can use `capability(name)` instead of `capability.test(name)` if you want a short code by optional requirements.

#### Checking a capability

The `check(name)` function will throw an Error when the capability is not supported by the actual environment.

```js
capability.check("Object.create");
    // this will throw an Error by pre ES5 environments without Object.create
```

#### Checking capability with require and modules

It is possible to check the environments with `require()` by adding a module, which calls the `check(name)` function.
By the capability definitions in this lib I added such modules by each definition, so you can do for example `require("capability/es5")`.
Ofc. you can do fun stuff if you want, e.g. you can call multiple `check`s from a single `requirements.js` file in your lib, etc...

### Definitions

Currently the following definitions are supported by the lib:

 - strict mode
 - `arguments.callee.caller`
 - es5
    - `Array.prototype.forEach`
    - `Array.prototype.map`
    - `Function.prototype.bind`
    - `Object.create`
    - `Object.defineProperties`
    - `Object.defineProperty`
    - `Object.prototype.hasOwnProperty`
 - `Error.captureStackTrace`
 - `Error.prototype.stack`
 
## License

MIT - 2016 Jánszky László Lajos