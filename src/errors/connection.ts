import { WhaSnowError } from './base.js';

export class AlreadyStartedError extends WhaSnowError {
  readonly code = 'CLIENT_ALREADY_STARTED';

  constructor() {
    super(
      'The client has already been started. Call stop() before starting it again.',
    );
  }
}

export class NotStartedError extends WhaSnowError {
  readonly code = 'CLIENT_NOT_STARTED';

  constructor(action = 'this operation') {
    super(`Client not started. Call start() before using ${action}.`);
  }
}

export class PairingCodeError extends WhaSnowError {
  readonly code = 'PAIRING_CODE_FAILED';

  readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    options?: {
      cause?: unknown;
    },
  ) {
    super(message, options);

    this.statusCode = statusCode;
  }
}

export class ConnectionError extends WhaSnowError {
  readonly code = 'CONNECTION_FAILED';

  constructor(
    message: string,
    options?: {
      cause?: unknown;
    },
  ) {
    super(message, options);
  }
}
