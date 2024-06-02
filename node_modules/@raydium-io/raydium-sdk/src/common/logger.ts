import { PublicKey } from '@solana/web3.js'

import { version } from '../version'

let _permanentCensorErrors = false
let _censorErrors = false

const LogLevels: { [name: string]: number } = { debug: 1, default: 2, info: 2, warning: 3, error: 4, off: 5 }
const _moduleLogLevel: { [name: string]: number } = {}

let _globalLogger: Logger

function _checkNormalize(): string {
  try {
    const missing: Array<string> = []

    // Make sure all forms of normalization are supported
    ;['NFD', 'NFC', 'NFKD', 'NFKC'].forEach((form) => {
      try {
        if ('test'.normalize(form) !== 'test') {
          throw new Error('bad normalize')
        }
      } catch (error) {
        missing.push(form)
      }
    })

    if (missing.length) {
      throw new Error('missing ' + missing.join(', '))
    }

    if (String.fromCharCode(0xe9).normalize('NFD') !== String.fromCharCode(0x65, 0x0301)) {
      throw new Error('broken implementation')
    }
  } catch (error) {
    if (error instanceof Error) {
      return error.message
    }
  }

  return ''
}

const _normalizeError = _checkNormalize()

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  OFF = 'OFF',
}

export enum ErrorCode {
  ///////////////////
  // Generic Errors

  // Unknown Error
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // Not Implemented
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',

  // Unsupported Operation
  //   - operation
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',

  // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
  //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Some sort of bad response from the server
  RPC_ERROR = 'RPC_ERROR',

  // Timeout
  TIMEOUT = 'TIMEOUT',

  ///////////////////
  // Operational  Errors

  // Buffer Overrun
  BUFFER_OVERRUN = 'BUFFER_OVERRUN',

  // Numeric Fault
  //   - operation: the operation being executed
  //   - fault: the reason this faulted
  NUMERIC_FAULT = 'NUMERIC_FAULT',

  ///////////////////
  // Argument Errors

  // Missing new operator to an object
  //  - name: The name of the class
  MISSING_NEW = 'MISSING_NEW',

  // Invalid argument (e.g. value is incompatible with type) to a function:
  //   - argument: The argument name that was invalid
  //   - value: The value of the argument
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',

  // Missing argument to a function:
  //   - count: The number of arguments received
  //   - expectedCount: The number of arguments expected
  MISSING_ARGUMENT = 'MISSING_ARGUMENT',

  // Too many arguments
  //   - count: The number of arguments received
  //   - expectedCount: The number of arguments expected
  UNEXPECTED_ARGUMENT = 'UNEXPECTED_ARGUMENT',

  ///////////////////
  // Blockchain Errors

  // Insufficien funds (< value + gasLimit * gasPrice)
  //   - transaction: the transaction attempted
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
}

const HEX = '0123456789abcdef'

function perfectDisplay(value: any, deeping = false) {
  let _value = value

  try {
    if (value instanceof Uint8Array) {
      let hex = ''
      for (let i = 0; i < value.length; i++) {
        hex += HEX[value[i] >> 4]
        hex += HEX[value[i] & 0x0f]
      }
      _value = `Uint8Array(0x${hex})`
    } else if (value instanceof PublicKey) {
      _value = `PublicKey(${value.toBase58()})`
    } else if (value instanceof Object && !deeping) {
      const obj: { [key: string]: string } = {}
      Object.entries(value).forEach(([k, v]) => {
        obj[k] = perfectDisplay(v, true)
      })
      _value = JSON.stringify(obj)
    } else if (!deeping) {
      _value = JSON.stringify(value)
    }
  } catch (error) {
    _value = JSON.stringify(value.toString())
  }

  return _value
}

export class Logger {
  readonly version: string = version
  readonly moduleName: string

  static errors = ErrorCode

  static levels = LogLevel

  constructor(moduleName: string) {
    this.moduleName = moduleName
  }

  _log(logLevel: LogLevel, args: Array<any>): void {
    const level = logLevel.toLowerCase()
    if (LogLevels[level] == null) {
      this.throwArgumentError('invalid log level name', 'logLevel', logLevel)
    }
    const _logLevel = _moduleLogLevel[this.moduleName] || LogLevels['default']
    if (_logLevel > LogLevels[level]) {
      return
    }
    console.log(...args)
  }

  debug(...args: Array<any>): void {
    this._log(Logger.levels.DEBUG, ['[DEBUG]', ...args])
  }

  info(...args: Array<any>): void {
    this._log(Logger.levels.INFO, ['[INFO]', ...args])
  }

  warn(...args: Array<any>): void {
    this._log(Logger.levels.WARNING, ['[WARN]', ...args])
  }

  makeError(message: string, code?: ErrorCode, params?: any): Error {
    // Errors are being censored
    if (_censorErrors) {
      return this.makeError('censored error', code, {})
    }

    if (!code) {
      code = Logger.errors.UNKNOWN_ERROR
    }
    if (!params) {
      params = {}
    }

    const messageDetails: Array<string> = []
    Object.entries(params).forEach(([key, value]) => {
      messageDetails.push(`${key}=${perfectDisplay(value)})`)
    })
    messageDetails.push(`code=${code}`)
    messageDetails.push(`module=${this.moduleName}`)
    messageDetails.push(`version=${this.version}`)

    const reason = message
    if (messageDetails.length) {
      message += ' (' + messageDetails.join(', ') + ')'
    }

    // @TODO: Any??
    const error: any = new Error(message)
    error.reason = reason
    error.code = code

    Object.entries(params).forEach(([key, value]) => {
      error[key] = value
    })

    return error
  }

  throwError(message: string, code?: ErrorCode, params?: any): never {
    throw this.makeError(message, code, params)
  }

  throwArgumentError(message: string, name: string, value: any): never {
    return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
      argument: name,
      value,
    })
  }

  assert(condition: any, message: string, code?: ErrorCode, params?: any): void {
    if (condition) {
      return
    }
    this.throwError(message, code, params)
  }

  assertArgument(condition: any, message: string, name: string, value: any): void {
    if (condition) {
      return
    }
    this.throwArgumentError(message, name, value)
  }

  checkNormalize(message?: string): void {
    if (message == null) {
      message = 'platform missing String.prototype.normalize'
    }
    if (_normalizeError) {
      this.throwError('platform missing String.prototype.normalize', Logger.errors.UNSUPPORTED_OPERATION, {
        operation: 'String.prototype.normalize',
        form: _normalizeError,
      })
    }
  }

  checkSafeUint53(value: number, message?: string): void {
    if (typeof value !== 'number') {
      return
    }

    if (message == null) {
      message = 'value not safe'
    }

    if (value < 0 || value >= 0x1fffffffffffff) {
      this.throwError(message, Logger.errors.NUMERIC_FAULT, {
        operation: 'checkSafeInteger',
        fault: 'out-of-safe-range',
        value,
      })
    }

    if (value % 1) {
      this.throwError(message, Logger.errors.NUMERIC_FAULT, {
        operation: 'checkSafeInteger',
        fault: 'non-integer',
        value,
      })
    }
  }

  checkArgumentCount(count: number, expectedCount: number, message?: string): void {
    if (message) {
      message = ': ' + message
    } else {
      message = ''
    }

    if (count < expectedCount) {
      this.throwError('missing argument' + message, Logger.errors.MISSING_ARGUMENT, {
        count,
        expectedCount,
      })
    }

    if (count > expectedCount) {
      this.throwError('too many arguments' + message, Logger.errors.UNEXPECTED_ARGUMENT, {
        count,
        expectedCount,
      })
    }
  }

  checkNew(target: any, kind: any): void {
    if (target === Object || target == null) {
      this.throwError('missing new', Logger.errors.MISSING_NEW, { name: kind.name })
    }
  }

  checkAbstract(target: any, kind: any): void {
    if (target === kind) {
      this.throwError(
        'cannot instantiate abstract class ' + JSON.stringify(kind.name) + ' directly; use a sub-class',
        Logger.errors.UNSUPPORTED_OPERATION,
        { name: target.name, operation: 'new' },
      )
    } else if (target === Object || target == null) {
      this.throwError('missing new', Logger.errors.MISSING_NEW, { name: kind.name })
    }
  }

  static globalLogger(): Logger {
    if (!_globalLogger) {
      _globalLogger = new Logger(version)
    }
    return _globalLogger
  }

  static setCensorship(censorship: boolean, permanent?: boolean): void {
    if (!censorship && permanent) {
      this.globalLogger().throwError('cannot permanently disable censorship', Logger.errors.UNSUPPORTED_OPERATION, {
        operation: 'setCensorship',
      })
    }

    if (_permanentCensorErrors) {
      if (!censorship) {
        return
      }
      this.globalLogger().throwError('error censorship permanent', Logger.errors.UNSUPPORTED_OPERATION, {
        operation: 'setCensorship',
      })
    }

    _censorErrors = !!censorship
    _permanentCensorErrors = !!permanent
  }

  static setLogLevel(moduleName: string, logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'OFF'): void {
    const level = LogLevels[logLevel.toLowerCase()]
    if (level == null) {
      Logger.globalLogger().warn('invalid log level - ' + logLevel)
      return
    }
    _moduleLogLevel[moduleName] = level
  }

  static from(version: string): Logger {
    return new Logger(version)
  }
}
