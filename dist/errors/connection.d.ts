import { WhaSnowError } from './base.js';
export declare class AlreadyStartedError extends WhaSnowError {
    readonly code = "CLIENT_ALREADY_STARTED";
    constructor();
}
export declare class NotStartedError extends WhaSnowError {
    readonly code = "CLIENT_NOT_STARTED";
    constructor(action?: string);
}
export declare class PairingCodeError extends WhaSnowError {
    readonly code = "PAIRING_CODE_FAILED";
    readonly statusCode?: number;
    constructor(message: string, statusCode?: number, options?: {
        cause?: unknown;
    });
}
export declare class ConnectionError extends WhaSnowError {
    readonly code = "CONNECTION_FAILED";
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
