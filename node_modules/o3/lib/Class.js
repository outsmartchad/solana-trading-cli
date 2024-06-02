var Class = function () {
    var options = Object.create({
        Source: Object,
        config: {},
        buildArgs: []
    });

    function checkOption(option) {
        var key = "config";
        if (option instanceof Function)
            key = "Source";
        else if (option instanceof Array)
            key = "buildArgs";
        else if (option instanceof Object)
            key = "config";
        else
            throw new Error("Invalid configuration option.");
        if (options.hasOwnProperty(key))
            throw new Error("Duplicated configuration option: " + key + ".");
        options[key] = option;
    }

    for (var index = 0, length = arguments.length; index < length; ++index)
        checkOption(arguments[index]);

    var Source = options.Source,
        config = options.config,
        buildArgs = options.buildArgs;

    return (Source.extend || Class.extend).call(Source, config, buildArgs);
};

Class.factory = function () {
    var Source = this;
    return function () {
        var instance = this;
        if (instance.build instanceof Function)
            instance.build.apply(instance, arguments);
        if (instance.init instanceof Function)
            instance.init.apply(instance, arguments);
    };
};

Class.extend = function (config, buildArgs) {
    var Source = this;
    if (!config)
        config = {};
    var Subject;
    if ((config.prototype instanceof Object) && config.prototype.constructor !== Object)
        Subject = config.prototype.constructor;
    else if (config.factory instanceof Function)
        Subject = config.factory.call(Source);
    Subject = (Source.clone || Class.clone).call(Source, Subject, buildArgs);
    (Subject.merge || Class.merge).call(Subject, config);
    return Subject;
};

Class.prototype.extend = function (config, buildArgs) {
    var subject = this;
    var instance = (subject.clone || Class.prototype.clone).apply(subject, buildArgs);
    (instance.merge || Class.prototype.merge).call(instance, config);
    return instance;
};

Class.clone = function (Subject, buildArgs) {
    var Source = this;
    if (!(Subject instanceof Function))
        Subject = (Source.factory || Class.factory).call(Source);
    Subject.prototype = (Source.prototype.clone || Class.prototype.clone).apply(Source.prototype, buildArgs || []);
    Subject.prototype.constructor = Subject;
    for (var staticProperty in Source)
        if (staticProperty !== "prototype")
            Subject[staticProperty] = Source[staticProperty];
    return Subject;
};

Class.prototype.clone = function () {
    var subject = this;
    var instance = Object.create(subject);
    if (instance.build instanceof Function)
        instance.build.apply(instance, arguments);
    return instance;
};

Class.merge = function (config) {
    var Subject = this;
    for (var staticProperty in config)
        if (staticProperty !== "prototype")
            Subject[staticProperty] = config[staticProperty];
    if (config.prototype instanceof Object)
        (Subject.prototype.merge || Class.prototype.merge).call(Subject.prototype, config.prototype);
    return Subject;
};

Class.prototype.merge = function (config) {
    var subject = this;
    for (var property in config)
        if (property !== "constructor")
            subject[property] = config[property];
    return subject;
};

Class.absorb = function (config) {
    var Subject = this;
    for (var staticProperty in config)
        if (staticProperty !== "prototype" && (Subject[staticProperty] === undefined || Subject[staticProperty] === Function.prototype[staticProperty]))
            Subject[staticProperty] = config[staticProperty];
    if (config.prototype instanceof Object)
        (Subject.prototype.absorb || Class.prototype.absorb).call(Subject.prototype, config.prototype);
    return Subject;
};

Class.prototype.absorb = function (config) {
    var subject = this;
    for (var property in config)
        if (property !== "constructor" && (subject[property] === undefined || subject[property] === Object.prototype[property]))
            subject[property] = config[property];
    return subject;
};

Class.getAncestor = function () {
    var Source = this;
    if (Source !== Source.prototype.constructor)
        return Source.prototype.constructor;
};

Class.newInstance = function () {
    var Subject = this;
    var instance = Object.create(this.prototype);
    Subject.apply(instance, arguments);
    return instance;
};

module.exports = Class;