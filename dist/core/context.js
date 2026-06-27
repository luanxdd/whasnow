import { Chat } from '../entities/chat.js';
import { Contact } from '../entities/contact.js';
import { Group } from '../entities/group.js';
import { Message } from '../entities/message.js';
import { GroupContextError, WaitForReplyUnavailableError, } from '../errors/index.js';
export class Context {
    socket;
    chat;
    from;
    message;
    deps;
    constructor(socket, raw, deps = {}) {
        this.socket = socket;
        this.deps = deps;
        this.message = new Message(socket, raw, deps.rateLimiter);
        this.chat = new Chat(socket, this.message.chatId, deps.rateLimiter);
        this.from = new Contact(socket, this.message.senderId);
    }
    get isGroup() {
        return this.message.isGroup;
    }
    group() {
        return this.isGroup
            ? new Group(this.socket, this.message.chatId, this.deps.muteStore, this.deps.metadataCache)
            : null;
    }
    requireGroup() {
        const group = this.group();
        if (!group) {
            throw new GroupContextError();
        }
        return group;
    }
    async senderIsAdmin() {
        const group = this.group();
        return group
            ? group.isAdmin(this.from.jid)
            : false;
    }
    targets() {
        const mentioned = this.message.mentions;
        const quotedSender = this.message.quoted?.senderId;
        return [
            ...new Set([
                ...mentioned,
                ...(quotedSender
                    ? [quotedSender]
                    : []),
            ]),
        ];
    }
    reply(text, options) {
        return this.message.reply(text, options);
    }
    send(text, options) {
        return this.chat.send.text(text, options);
    }
    react(emoji) {
        return this.message.react(emoji);
    }
    waitForReply(options = {}) {
        if (!this.deps.waitForReplyFn) {
            throw new WaitForReplyUnavailableError();
        }
        return this.deps.waitForReplyFn({
            fromJid: this.from.jid,
            ...options,
        });
    }
}
