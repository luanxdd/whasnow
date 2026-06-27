import { WhaSnowError } from './base.js';
export declare class MessageSendError extends WhaSnowError {
    readonly code = "MESSAGE_SEND_FAILED";
    constructor(message?: string);
}
export declare class MediaDownloadError extends WhaSnowError {
    readonly code = "MEDIA_DOWNLOAD_FAILED";
    constructor(message?: string, options?: {
        cause?: unknown;
    });
}
export declare class ReplyTimeoutError extends WhaSnowError {
    readonly code = "REPLY_TIMEOUT";
    constructor(timeoutMs: number);
}
export declare class WaitForReplyUnavailableError extends WhaSnowError {
    readonly code = "WAIT_FOR_REPLY_UNAVAILABLE";
    constructor();
}
export declare class InvalidMediaSourceError extends WhaSnowError {
    readonly code = "INVALID_MEDIA_SOURCE";
    constructor(source: string, options?: {
        cause?: unknown;
    });
}
