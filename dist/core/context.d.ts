import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { Chat } from '../entities/chat.js';
import { Contact } from '../entities/contact.js';
import { Group } from '../entities/group.js';
import type { GroupMetadataCache } from '../entities/group-metadata-cache.js';
import { Message } from '../entities/message.js';
import type { RateLimiter } from '../connection/rate-limiter.js';
import type { MuteStore } from '../stores/mute-store.js';
import type { Jid, SendTextOptions, WaitForReplyContextOptions } from '../types/common.js';
export interface ContextDeps {
    muteStore?: MuteStore;
    metadataCache?: GroupMetadataCache;
    rateLimiter?: RateLimiter;
    waitForReplyFn?: (options?: WaitForReplyContextOptions<Context>) => Promise<Context>;
}
export declare class Context {
    private readonly socket;
    readonly chat: Chat;
    readonly from: Contact;
    readonly message: Message;
    private readonly deps;
    constructor(socket: WASocket, raw: WAMessage, deps?: ContextDeps);
    get isGroup(): boolean;
    group(): Group | null;
    requireGroup(): Group;
    senderIsAdmin(): Promise<boolean>;
    targets(): Jid[];
    reply(text: string, options?: SendTextOptions): Promise<Message>;
    send(text: string, options?: SendTextOptions): Promise<Message>;
    react(emoji: string): Promise<void>;
    waitForReply(options?: WaitForReplyContextOptions<Context>): Promise<Context>;
}
