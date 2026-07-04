import { WhaSnowError } from './base.js';

export class CommandLoadError extends WhaSnowError {
  readonly code = 'COMMAND_LOAD_FAILED';

  readonly path: string;

  constructor(
    path: string,
    options?: {
      cause?: unknown;
    },
  ) {
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

export class MissingArgumentError extends WhaSnowError {
  readonly code = 'MISSING_ARGUMENT';

  readonly argument: string;

  constructor(argument: string) {
    super(`Missing required argument: "${argument}".`);

    this.argument = argument;
  }
}

export class InvalidArgumentError extends WhaSnowError {
  readonly code = 'INVALID_ARGUMENT';

  readonly argument: string;
  readonly value: string;

  constructor(argument: string, value: string, expectedType: string) {
    super(
      `Invalid value for argument "${argument}": expected ${expectedType}, got "${value}".`,
    );

    this.argument = argument;

    this.value = value;
  }
}
