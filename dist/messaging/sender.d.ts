import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { Message } from '../entities/message.js';
import type { RateLimiter } from '../connection/rate-limiter.js';
import type { Jid, MediaSource, SendTextOptions } from '../types/common.js';
export declare class MessageSender {
    private readonly socket;
    private readonly chatId;
    private readonly quotedMessage?;
    private readonly rateLimiter?;
    constructor(socket: WASocket, chatId: Jid, quotedMessage?: WAMessage | undefined, rateLimiter?: RateLimiter | undefined);
    audio(source: MediaSource, asVoiceNote?: boolean): Promise<void>;
    document(source: MediaSource, fileName?: string, caption?: string): Promise<void>;
    image(source: MediaSource, caption?: string): Promise<void>;
    sticker(source: MediaSource): Promise<void>;
    text(body: string, options?: SendTextOptions): Promise<Message>;
    video(source: MediaSource, caption?: string): Promise<void>;
    private dispatch;
}
