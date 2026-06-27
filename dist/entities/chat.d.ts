import type { WASocket } from '@whiskeysockets/baileys';
import { Message } from '../entities/message.js';
import type { RateLimiter } from '../connection/rate-limiter.js';
import type { Jid, MediaSource, SendTextOptions } from '../types/common.js';
export declare class Chat {
    private readonly socket;
    readonly id: Jid;
    readonly send: ChatSend;
    constructor(socket: WASocket, id: Jid, rateLimiter?: RateLimiter);
    typing(): Promise<void>;
    recording(): Promise<void>;
    stopTyping(): Promise<void>;
    markRead(): Promise<void>;
    archive(): Promise<void>;
    unarchive(): Promise<void>;
    clear(): Promise<void>;
}
export declare class ChatSend {
    private readonly sender;
    constructor(socket: WASocket, chatId: Jid, rateLimiter?: RateLimiter);
    text(body: string, options?: SendTextOptions): Promise<Message>;
    image(source: MediaSource, caption?: string): Promise<void>;
    video(source: MediaSource, caption?: string): Promise<void>;
    audio(source: MediaSource, asVoiceNote?: boolean): Promise<void>;
    document(source: MediaSource, fileName?: string, caption?: string): Promise<void>;
    sticker(source: MediaSource): Promise<void>;
}
