var FrameStringSource = require("./FrameStringSource"),
    FrameStringParser = require("./FrameStringParser"),
    cache = require("u3").cache,
    prepareStackTrace = require("../prepareStackTrace");

module.exports = function () {

    Error.captureStackTrace = function captureStackTrace(throwable, terminator) {
        var warnings;
        var frameShifts = [
            captureStackTrace
        ];
        if (terminator) {
            // additional frames can come here if arguments.callee.caller is supported
            // otherwise it is hard to identify the terminator
            frameShifts.push(terminator);
        }
        var captured = FrameStringSource.getInstance().captureFrameStrings(frameShifts);
        Object.defineProperties(throwable, {
            stack: {
                configurable: true,
                get: cache(function () {
                    var frames = FrameStringParser.getInstance().getFrames(captured.frameStrings, captured.functionValues);
                    return (Error.prepareStackTrace || prepareStackTrace)(throwable, frames, warnings);
                })
            },
            cachedStack: {
                configurable: true,
                writable: true,
                enumerable: false,
                value: true
            }
        });
    };

    Error.getStackTrace = function (throwable) {
        if (throwable.cachedStack)
            return throwable.stack;
        var frameStrings = FrameStringSource.getInstance().getFrameStrings(throwable),
            frames = [],
            warnings;
        if (frameStrings)
            frames = FrameStringParser.getInstance().getFrames(frameStrings, []);
        else
            warnings = [
                "The stack is not readable by unthrown errors in this environment."
            ];
        var stack = (Error.prepareStackTrace || prepareStackTrace)(throwable, frames, warnings);
        if (frameStrings)
            try {
                Object.defineProperties(throwable, {
                    stack: {
                        configurable: true,
                        writable: true,
                        enumerable: false,
                        value: stack
                    },
                    cachedStack: {
                        configurable: true,
                        writable: true,
                        enumerable: false,
                        value: true
                    }
                });
            } catch (nonConfigurableError) {
            }
        return stack;
    };

    return {
        prepareStackTrace: prepareStackTrace
    };
};