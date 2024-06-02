"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.ErrorCode = exports.LogLevel = void 0;
const web3_js_1 = require("@solana/web3.js");
const version_1 = require("../version");
let _permanentCensorErrors = false;
let _censorErrors = false;
const LogLevels = { debug: 1, default: 2, info: 2, warning: 3, error: 4, off: 5 };
const _moduleLogLevel = {};
let _globalLogger;
function _checkNormalize() {
    try {
        const missing = [];
        ['NFD', 'NFC', 'NFKD', 'NFKC'].forEach((form) => {
            try {
                if ('test'.normalize(form) !== 'test') {
                    throw new Error('bad normalize');
                }
            }
            catch (error) {
                missing.push(form);
            }
        });
        if (missing.length) {
            throw new Error('missing ' + missing.join(', '));
        }
        if (String.fromCharCode(0xe9).normalize('NFD') !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error('broken implementation');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return error.message;
        }
    }
    return '';
}
const _normalizeError = _checkNormalize();
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["OFF"] = "OFF";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var ErrorCode;
(function (ErrorCode) {
    ///////////////////
    // Generic Errors
    // Unknown Error
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    // Not Implemented
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    // Unsupported Operation
    //   - operation
    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Some sort of bad response from the server
    ErrorCode["RPC_ERROR"] = "RPC_ERROR";
    // Timeout
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ///////////////////
    // Operational  Errors
    // Buffer Overrun
    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
    // Numeric Fault
    //   - operation: the operation being executed
    //   - fault: the reason this faulted
    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
    ///////////////////
    // Argument Errors
    // Missing new operator to an object
    //  - name: The name of the class
    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
    // Invalid argument (e.g. value is incompatible with type) to a function:
    //   - argument: The argument name that was invalid
    //   - value: The value of the argument
    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    // Missing argument to a function:
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
    // Too many arguments
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
    ///////////////////
    // Blockchain Errors
    // Insufficien funds (< value + gasLimit * gasPrice)
    //   - transaction: the transaction attempted
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
const HEX = '0123456789abcdef';
function perfectDisplay(value, deeping = false) {
    let _value = value;
    try {
        if (value instanceof Uint8Array) {
            let hex = '';
            for (let i = 0; i < value.length; i++) {
                hex += HEX[value[i] >> 4];
                hex += HEX[value[i] & 0x0f];
            }
            _value = `Uint8Array(0x${hex})`;
        }
        else if (value instanceof web3_js_1.PublicKey) {
            _value = `PublicKey(${value.toBase58()})`;
        }
        else if (value instanceof Object && !deeping) {
            const obj = {};
            Object.entries(value).forEach(([k, v]) => {
                obj[k] = perfectDisplay(v, true);
            });
            _value = JSON.stringify(obj);
        }
        else if (!deeping) {
            _value = JSON.stringify(value);
        }
    }
    catch (error) {
        _value = JSON.stringify(value.toString());
    }
    return _value;
}
class Logger {
    constructor(moduleName) {
        this.version = version_1.version;
        this.moduleName = moduleName;
    }
    _log(logLevel, args) {
        const level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
            this.throwArgumentError('invalid log level name', 'logLevel', logLevel);
        }
        const _logLevel = _moduleLogLevel[this.moduleName] || LogLevels['default'];
        if (_logLevel > LogLevels[level]) {
            return;
        }
        console.log(...args);
    }
    debug(...args) {
        this._log(Logger.levels.DEBUG, ['[DEBUG]', ...args]);
    }
    info(...args) {
        this._log(Logger.levels.INFO, ['[INFO]', ...args]);
    }
    warn(...args) {
        this._log(Logger.levels.WARNING, ['[WARN]', ...args]);
    }
    makeError(message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
            return this.makeError('censored error', code, {});
        }
        if (!code) {
            code = Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
            params = {};
        }
        const messageDetails = [];
        Object.entries(params).forEach(([key, value]) => {
            messageDetails.push(`${key}=${perfectDisplay(value)})`);
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`module=${this.moduleName}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        if (messageDetails.length) {
            message += ' (' + messageDetails.join(', ') + ')';
        }
        // @TODO: Any??
        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.entries(params).forEach(([key, value]) => {
            error[key] = value;
        });
        return error;
    }
    throwError(message, code, params) {
        throw this.makeError(message, code, params);
    }
    throwArgumentError(message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
            argument: name,
            value,
        });
    }
    assert(condition, message, code, params) {
        if (condition) {
            return;
        }
        this.throwError(message, code, params);
    }
    assertArgument(condition, message, name, value) {
        if (condition) {
            return;
        }
        this.throwArgumentError(message, name, value);
    }
    checkNormalize(message) {
        if (message == null) {
            message = 'platform missing String.prototype.normalize';
        }
        if (_normalizeError) {
            this.throwError('platform missing String.prototype.normalize', Logger.errors.UNSUPPORTED_OPERATION, {
                operation: 'String.prototype.normalize',
                form: _normalizeError,
            });
        }
    }
    checkSafeUint53(value, message) {
        if (typeof value !== 'number') {
            return;
        }
        if (message == null) {
            message = 'value not safe';
        }
        if (value < 0 || value >= 0x1fffffffffffff) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: 'checkSafeInteger',
                fault: 'out-of-safe-range',
                value,
            });
        }
        if (value % 1) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: 'checkSafeInteger',
                fault: 'non-integer',
                value,
            });
        }
    }
    checkArgumentCount(count, expectedCount, message) {
        if (message) {
            message = ': ' + message;
        }
        else {
            message = '';
        }
        if (count < expectedCount) {
            this.throwError('missing argument' + message, Logger.errors.MISSING_ARGUMENT, {
                count,
                expectedCount,
            });
        }
        if (count > expectedCount) {
            this.throwError('too many arguments' + message, Logger.errors.UNEXPECTED_ARGUMENT, {
                count,
                expectedCount,
            });
        }
    }
    checkNew(target, kind) {
        if (target === Object || target == null) {
            this.throwError('missing new', Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    checkAbstract(target, kind) {
        if (target === kind) {
            this.throwError('cannot instantiate abstract class ' + JSON.stringify(kind.name) + ' directly; use a sub-class', Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: 'new' });
        }
        else if (target === Object || target == null) {
            this.throwError('missing new', Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    static globalLogger() {
        if (!_globalLogger) {
            _globalLogger = new Logger(version_1.version);
        }
        return _globalLogger;
    }
    static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
            this.globalLogger().throwError('cannot permanently disable censorship', Logger.errors.UNSUPPORTED_OPERATION, {
                operation: 'setCensorship',
            });
        }
        if (_permanentCensorErrors) {
            if (!censorship) {
                return;
            }
            this.globalLogger().throwError('error censorship permanent', Logger.errors.UNSUPPORTED_OPERATION, {
                operation: 'setCensorship',
            });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
    }
    static setLogLevel(moduleName, logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
            Logger.globalLogger().warn('invalid log level - ' + logLevel);
            return;
        }
        _moduleLogLevel[moduleName] = level;
    }
    static from(version) {
        return new Logger(version);
    }
}
exports.Logger = Logger;
Logger.errors = ErrorCode;
Logger.levels = LogLevel;
//# sourceMappingURL=logger.js.map