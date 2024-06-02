/** @group Errors */
export class MetaplexError extends Error {
  readonly name: string = 'MetaplexError';
  readonly source: MetaplexErrorSource;
  readonly sourceDetails?: string;
  readonly cause?: Error;

  constructor(
    message: string,
    source: MetaplexErrorSource,
    sourceDetails?: string,
    cause?: Error
  ) {
    super(message);
    this.source = source;
    this.sourceDetails = sourceDetails;
    this.cause = cause;
    this.message =
      this.message +
      `\n\nSource: ${this.getFullSource()}` +
      (this.cause ? `\n\nCaused By: ${this.cause}` : '') +
      '\n';
  }

  getCapitalizedSource(): string {
    if (this.source === 'sdk' || this.source === 'rpc') {
      return this.source.toUpperCase();
    }

    return this.source[0].toUpperCase() + this.source.slice(1);
  }

  getFullSource(): string {
    const capitalizedSource = this.getCapitalizedSource();
    const sourceDetails = this.sourceDetails ? ` > ${this.sourceDetails}` : '';

    return capitalizedSource + sourceDetails;
  }

  toString() {
    return `[${this.name}] ${this.message}`;
  }
}

/** @group Errors */
export type MetaplexErrorSource =
  | 'sdk'
  | 'network'
  | 'rpc'
  | 'plugin'
  | 'program';
