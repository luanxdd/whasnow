import { WhaSnowError } from './base.js';

export class CommandLoadError extends WhaSnowError {
  readonly code = 'COMMAND_LOAD_FAILED';
  readonly path: string;

  constructor(path: string, options?: { cause?: unknown }) {
    const reason =
      options?.cause instanceof Error
        ? options.cause.message
        : String(options?.cause ?? 'unknown error');

    super(`Failed to load the command module. "${path}": ${reason}`, options);

    this.path = path;
  }
}

export class CommandDirectoryNotFoundError extends WhaSnowError {
  readonly code = 'COMMAND_DIRECTORY_NOT_FOUND';
  readonly path: string;

  constructor(path: string) {
    super(`Command directory not found: "${path}".`);

    this.path = path;
  }
}
