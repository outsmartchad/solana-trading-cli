require("capability/es5");

var capability = require("capability");

var polyfill;
if (capability("Error.captureStackTrace"))
    polyfill = require("./v8");
else if (capability("Error.prototype.stack"))
    polyfill = require("./non-v8/index");
else
    polyfill = require("./unsupported");

module.exports = polyfill();