import { WhaSnowError } from './base.js';

export class MessageSendError extends WhaSnowError {
  readonly code = 'MESSAGE_SEND_FAILED';

  constructor(message = 'Failed to send message: WhatsApp-s empty reply.') {
    super(message);
  }
}

export class MediaDownloadError extends WhaSnowError {
  readonly code = 'MEDIA_DOWNLOAD_FAILED';

  constructor(message = 'Failed to download message media.', options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class ReplyTimeoutError extends WhaSnowError {
  readonly code = 'REPLY_TIMEOUT';

  constructor(timeoutMs: number) {
    super(`No response received in ${timeoutMs}ms.`);
  }
}

export class WaitForReplyUnavailableError extends WhaSnowError {
  readonly code = 'WAIT_FOR_REPLY_UNAVAILABLE';

  constructor() {
    super(
      'waitForReply() is not available in this Context. Use client.waitForReply() directly, or ensure that the Context came from client.onMessage().',
    );
  }
}

export class InvalidMediaSourceError extends WhaSnowError {
  readonly code = 'INVALID_MEDIA_SOURCE';

  constructor(source: string, options?: { cause?: unknown }) {
    super(`Invalid or inaccessible media source: "${source}".`, options);
  }
}
