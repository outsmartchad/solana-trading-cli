import type { Program } from '../Program';
import { UmiError } from './UmiError';

/** @category Errors */
export type UnderlyingProgramError = Error & { code?: number; logs?: string[] };

/** @category Errors */
export class ProgramError extends UmiError {
  readonly name: string = 'ProgramError';

  readonly program: Program;

  readonly logs?: string[];

  constructor(
    message: string,
    program: Program,
    cause?: UnderlyingProgramError
  ) {
    super(message, 'program', `${program.name} [${program.publicKey}]`, cause);
    this.program = program;
    this.logs = cause?.logs;
    if (this.logs) {
      this.message += `\nProgram Logs:\n${this.logs
        .map((log) => `| ${log}`)
        .join('\n')}\n`;
    }
  }
}
