# u3 - Utility Functions

This lib contains utility functions for e3, dataflower and other projects.

## Documentation

### Installation

```bash
npm install u3
```

```bash
bower install u3
```

#### Usage

In this documentation I used the lib as follows:

```js
var u3 = require("u3"),
    cache = u3.cache,
    eachCombination = u3.eachCombination;
```

### Function wrappers

#### cache

The `cache(fn)` function caches the fn results, so by the next calls it will return the result of the first call.
You can use different arguments, but they won't affect the return value.

```js
var a = cache(function fn(x, y, z){
    return x + y + z;
});
console.log(a(1, 2, 3)); // 6
console.log(a()); // 6
console.log(a()); // 6
```


It is possible to cache a value too.

```js
var a = cache(1 + 2 + 3);
console.log(a()); // 6
console.log(a()); // 6
console.log(a()); // 6
```

### Math

#### eachCombination

The `eachCombination(alternativesByDimension, callback)` calls the `callback(a,b,c,...)` on each combination of the `alternatives[a[],b[],c[],...]`.

```js
eachCombination([
      [1, 2, 3],
      ["a", "b"]
  ], console.log);
  /*
      1, "a"
      1, "b"
      
      2, "a"
      2, "b"
      
      3, "a"
      3, "b"
  */
```

You can use any dimension and number of alternatives. In the current example we used 2 dimensions. By the first dimension we used 3 alternatives: `[1, 2, 3]` and by the second dimension we used 2 alternatives: `["a", "b"]`.

## License

MIT - 2016 Jánszky László Lajos