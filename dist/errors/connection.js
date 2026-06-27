import { WhaSnowError } from './base.js';
export class AlreadyStartedError extends WhaSnowError {
    code = 'CLIENT_ALREADY_STARTED';
    constructor() {
        super('The client has already been started. Call stop() before starting it again.');
    }
}
export class NotStartedError extends WhaSnowError {
    code = 'CLIENT_NOT_STARTED';
    constructor(action = 'this operation') {
        super(`Client not started. Call start() before using ${action}.`);
    }
}
export class PairingCodeError extends WhaSnowError {
    code = 'PAIRING_CODE_FAILED';
    statusCode;
    constructor(message, statusCode, options) {
        super(message, options);
        this.statusCode = statusCode;
    }
}
export class ConnectionError extends WhaSnowError {
    code = 'CONNECTION_FAILED';
    constructor(message, options) {
        super(message, options);
    }
}
