var Class = require("o3").Class,
    Frame = require("./Frame"),
    cache = require("u3").cache;

var FrameStringParser = Class(Object, {
    prototype: {
        stackParser: null,
        frameParser: null,
        locationParsers: null,
        constructor: function (options) {
            Class.prototype.merge.call(this, options);
        },
        getFrames: function (frameStrings, functionValues) {
            var frames = [];
            for (var index = 0, length = frameStrings.length; index < length; ++index)
                frames[index] = this.getFrame(frameStrings[index], functionValues[index]);
            return frames;
        },
        getFrame: function (frameString, functionValue) {
            var config = {
                frameString: frameString,
                functionValue: functionValue
            };
            return new Frame(config);
        }
    }
});

module.exports = {
    getClass: cache(function () {
        return FrameStringParser;
    }),
    getInstance: cache(function () {
        var FrameStringParser = this.getClass();
        var instance = new FrameStringParser();
        return instance;
    })
};