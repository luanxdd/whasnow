import { MessageSender } from '../messaging/sender.js';
export class Chat {
    socket;
    id;
    send;
    constructor(socket, id, rateLimiter) {
        this.socket = socket;
        this.id = id;
        this.send = new ChatSend(socket, id, rateLimiter);
    }
    typing() {
        return this.socket.sendPresenceUpdate('composing', this.id);
    }
    recording() {
        return this.socket.sendPresenceUpdate('recording', this.id);
    }
    stopTyping() {
        return this.socket.sendPresenceUpdate('paused', this.id);
    }
    markRead() {
        return this.socket.readMessages([
            {
                remoteJid: this.id,
                id: '',
            },
        ]);
    }
    archive() {
        return this.socket.chatModify({ archive: true, lastMessages: [] }, this.id);
    }
    unarchive() {
        return this.socket.chatModify({ archive: false, lastMessages: [] }, this.id);
    }
    clear() {
        return this.socket.chatModify({ clear: true, lastMessages: [] }, this.id);
    }
}
export class ChatSend {
    sender;
    constructor(socket, chatId, rateLimiter) {
        this.sender = new MessageSender(socket, chatId, undefined, rateLimiter);
    }
    text(body, options) {
        return this.sender.text(body, options);
    }
    image(source, caption) {
        return this.sender.image(source, caption);
    }
    video(source, caption) {
        return this.sender.video(source, caption);
    }
    audio(source, asVoiceNote = false) {
        return this.sender.audio(source, asVoiceNote);
    }
    document(source, fileName, caption) {
        return this.sender.document(source, fileName, caption);
    }
    sticker(source) {
        return this.sender.sticker(source);
    }
}
