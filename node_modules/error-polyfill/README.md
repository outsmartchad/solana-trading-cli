# Javascript Error Polyfill

[![Build Status](https://travis-ci.org/inf3rno/error-polyfill.png?branch=master)](https://travis-ci.org/inf3rno/error-polyfill)

Implementing the [V8 Stack Trace API](https://github.com/v8/v8/wiki/Stack-Trace-API) in non-V8 environments as much as possible

## Installation

```bash
npm install error-polyfill
```

```bash
bower install error-polyfill
```

### Environment compatibility

Tested on the following environments:

Windows 7
 - **Node.js** 9.6
 - **Chrome** 64.0
 - **Firefox** 58.0
 - **Internet Explorer** 10.0, 11.0
 - **PhantomJS** 2.1
 - **Opera** 51.0

Travis
 - **Node.js** 8, 9
 - **Chrome**
 - **Firefox**
 - **PhantomJS**
 
The polyfill might work on other environments too due to its adaptive design. I use [Karma](https://github.com/karma-runner/karma) with [Browserify](https://github.com/substack/node-browserify) to test the framework in browsers.

### Requirements

ES5 support is required, without that the lib throws an Error and stops working. 

The ES5 features are tested by the [capability](https://github.com/inf3rno/capability) lib run time.
Classes are created by the [o3](https://github.com/inf3rno/o3) lib.
Utility functions are implemented in the [u3](https://github.com/inf3rno/u3) lib.

## API documentation

### Usage

In this documentation I used the framework as follows:

```js
require("error-polyfill");

// <- your code here
```

It is recommended to require the polyfill in your main script.

### Getting a past stack trace with `Error.getStackTrace`

This static method is not part of the V8 Stack Trace API, but it is recommended to **use `Error.getStackTrace(throwable)` instead of `throwable.stack`** to get the stack trace of Error instances!

Explanation:

By non-V8 environments we cannot replace the default stack generation algorithm, so we need a workaround to generate the stack when somebody tries to access it. So the original stack string will be parsed and the result will be properly formatted by accessing the stack using the `Error.getStackTrace` method.

Arguments and return values:

 - The `throwable` argument should be an `Error` (descendant) instance, but it can be an `Object` instance as well.
 - The return value is the generated `stack` of the `throwable` argument.

Example:

```js
try {
    theNotDefinedFunction();
}
catch (error) {
    console.log(Error.getStackTrace(error));
        // ReferenceError: theNotDefinedFunction is not defined
            // at ...
            // ...
}
```

### Capturing the present stack trace with `Error.captureStackTrace`

The `Error.captureStackTrace(throwable [, terminator])` sets the present stack above the `terminator` on the `throwable`. 

Arguments and return values:

 - The `throwable` argument should be an instance of an `Error` descendant, but it can be an `Object` instance as well. It is recommended to use `Error` descendant instances instead of inline objects, because we can recognize them by type e.g. `error instanceof UserError`.
 - The optional `terminator` argument should be a `Function`. Only the calls before this function will be reported in the stack, so without a `terminator` argument, the last call in the stack will be the call of the `Error.captureStackTrace`.
 - There is no return value, the `stack` will be set on the `throwable` so you will be able to access it using `Error.getStackTrace`. The format of the stack depends on the `Error.prepareStackTrace` implementation.

Example:

```js

var UserError = function (message){
    this.name = "UserError";
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
};
UserError.prototype = Object.create(Error.prototype);

function codeSmells(){
    throw new UserError("What's going on?!");
}

codeSmells();
    // UserError: What's going on?!
        // at codeSmells (myModule.js:23:1)
        // ...

```

Limitations:

By the current implementation the `terminator` can be only the `Error.captureStackTrace` caller function. This will change soon, but in certain conditions, e.g. by using strict mode (`"use strict";`) it is not possible to access the information necessary to implement this feature. You will get an empty `frames` array and a `warning` in the `Error.prepareStackTrace` when the stack parser meets with such conditions.

### Formatting the stack trace with `Error.prepareStackTrace`

The `Error.prepareStackTrace(throwable, frames [, warnings])` formats the stack `frames` and returns the `stack` value for `Error.captureStackTrace` or `Error.getStackTrace`. The native implementation returns a stack string, but you can override that by setting a new function value.

Arguments and return values:

 - The `throwable` argument is an `Error` or `Object` instance coming from the `Error.captureStackTrace` or from the creation of a new `Error` instance. Be aware that in some environments you need to throw that instance to get a parsable stack. Without that you will get only a `warning` by trying to access the stack with `Error.getStackTrace`.
 - The `frames` argument is an array of `Frame` instances. Each `frame` represents a function call in the stack. You can use these frames to build a stack string. To access information about individual frames you can use the following methods.
  - `frame.toString()` - Returns the string representation of the frame, e.g. `codeSmells (myModule.js:23:1)`.
  - `frame.getThis()` - **Cannot be supported.** Returns the context of the call, only V8 environments support this natively.
  - `frame.getTypeName()` - **Not implemented yet.** Returns the type name of the context, by the global namespace it is `Window` in Chrome.
  - `frame.getFunction()` - Returns the called function or `undefined` by strict mode.
  - `frame.getFunctionName()` - **Not implemented yet.** Returns the name of the called function.
  - `frame.getMethodName()` - **Not implemented yet.** Returns the method name of the called function is a method of an object.
  - `frame.getFileName()` - **Not implemented yet.** Returns the file name where the function was called.
  - `frame.getLineNumber()` - **Not implemented yet.** Returns at which line the function was called in the file.
  - `frame.getColumnNumber()` - **Not implemented yet.** Returns at which column the function was called in the file. This information is not always available.
  - `frame.getEvalOrigin()` - **Not implemented yet.** Returns the original of an `eval` call.
  - `frame.isTopLevel()` - **Not implemented yet.** Returns whether the function was called from the top level.
  - `frame.isEval()` - **Not implemented yet.** Returns whether the called function was `eval`.
  - `frame.isNative()` - **Not implemented yet.** Returns whether the called function was native.
  - `frame.isConstructor()` - **Not implemented yet.** Returns whether the called function was a constructor.
 - The optional `warnings` argument contains warning messages coming from the stack parser. It is not part of the V8 Stack Trace API.
 - The return value will be the stack you can access with `Error.getStackTrace(throwable)`. If it is an object, it is recommended to add a `toString` method, so you will be able to read it in the console.

Example:

```js
Error.prepareStackTrace = function (throwable, frames, warnings) {
    var string = "";
    string += throwable.name || "Error";
    string += ": " + (throwable.message || "");
    if (warnings instanceof Array)
        for (var warningIndex in warnings) {
            var warning = warnings[warningIndex];
            string += "\n   # " + warning;
        }
    for (var frameIndex in frames) {
        var frame = frames[frameIndex];
        string += "\n   at " + frame.toString();
    }
    return string;
};
```

### Stack trace size limits with `Error.stackTraceLimit`

**Not implemented yet.**

You can set size limits on the stack trace, so you won't have any problems because of too long stack traces.

Example:

```js
Error.stackTraceLimit = 10;
```

### Handling uncaught errors and rejections

**Not implemented yet.**

## Differences between environments and modes

Since there is no Stack Trace API standard, every browsers solves this problem differently. I try to document what I've found about these differences as detailed as possible, so it will be easier to follow the code.

Overriding the `error.stack` property with custom Stack instances
 
 - by Node.js and Chrome the `Error.prepareStackTrace()` can override every `error.stack` automatically right by creation
 - by Firefox, Internet Explorer and Opera you cannot automatically override every `error.stack` by native errors
 - by PhantomJS you cannot override the `error.stack` property of native errors, it is not configurable
 
Capturing the current stack trace
 
 - by Node.js, Chrome, Firefox and Opera the stack property is added by instantiating a native error
 - by Node.js and Chrome the stack creation is lazy loaded and cached, so the `Error.prepareStackTrace()` is called only by the first access
 - by Node.js and Chrome the current stack can be added to any object with `Error.captureStackTrace()`
 - by Internet Explorer the stack is created by throwing a native error
 - by PhantomJS the stack is created by throwing any object, but not a primitive
 
Accessing the stack
 
 - by Node.js, Chrome, Firefox, Internet Explorer, Opera and PhantomJS you can use the `error.stack` property
 - by old Opera you have to use the `error.stacktrace` property to get the stack
 
Prefixes and postfixes on the stack string
 
 - by Node.js, Chrome, Internet Explorer and Opera you have the `error.name` and the `error.message` in a `{name}: {message}` format at the beginning of the stack string
 - by Firefox and PhantomJS the stack string does not contain the `error.name` and the `error.message`
 - by Firefox you have an empty line at the end of the stack string
 
Accessing the stack frames array

 - by Node.js and Chrome you can access the frame objects directly by overriding the `Error.prepareStackTrace()`
 - by Firefox, Internet Explorer, PhantomJS, and Opera you need to parse the stack string in order to get the frames
 
The structure of the frame string

 - by Node.js and Chrome
  - the frame string of calling a function from a module: `thirdFn (http://localhost/myModule.js:45:29)`
  - the frame strings contain an `   at ` prefix, which is not present by the `frame.toString()` output, so it is added by the `stack.toString()`
 - by Firefox
  - the frame string of calling a function from a module: `thirdFn@http://localhost/myModule.js:45:29`
 - by Internet Explorer
  - the frame string of calling a function from a module: `   at thirdFn (http://localhost/myModule.js:45:29)`
 - by PhantomJS
  - the frame string of calling a function from a module: `thirdFn@http://localhost/myModule.js:45:29`
 - by Opera
  - the frame string of calling a function from a module: `   at thirdFn (http://localhost/myModule.js:45)`
   
Accessing information by individual frames

 - by Node.js and Chrome the `frame.getThis()` and the `frame.getFunction()` returns `undefined` by frames originate from [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) code
 - by Firefox, Internet Explorer, PhantomJS, and Opera the context of the function calls is not accessible, so the `frame.getThis()` cannot be implemented
 - by Firefox, Internet Explorer, PhantomJS, and Opera functions are not accessible with `arguments.callee.caller` by frames originate from strict mode, so by these frames `frame.getFunction()` can return only `undefined` (this is consistent with V8 behavior)

## License

MIT - 2016 Jánszky László Lajos