import { WhaSnowError } from './base.js';
export class MessageSendError extends WhaSnowError {
    code = 'MESSAGE_SEND_FAILED';
    constructor(message = 'Failed to send message: WhatsApp-s empty reply.') {
        super(message);
    }
}
export class MediaDownloadError extends WhaSnowError {
    code = 'MEDIA_DOWNLOAD_FAILED';
    constructor(message = 'Failed to download message media.', options) {
        super(message, options);
    }
}
export class ReplyTimeoutError extends WhaSnowError {
    code = 'REPLY_TIMEOUT';
    constructor(timeoutMs) {
        super(`No response received in ${timeoutMs}ms.`);
    }
}
export class WaitForReplyUnavailableError extends WhaSnowError {
    code = 'WAIT_FOR_REPLY_UNAVAILABLE';
    constructor() {
        super('waitForReply() is not available in this Context. Use client.waitForReply() directly, or ensure that the Context came from client.onMessage().');
    }
}
export class InvalidMediaSourceError extends WhaSnowError {
    code = 'INVALID_MEDIA_SOURCE';
    constructor(source, options) {
        super(`Invalid or inaccessible media source: "${source}".`, options);
    }
}
