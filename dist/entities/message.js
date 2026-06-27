import { downloadMediaMessage, proto, } from '@whiskeysockets/baileys';
import { MessageSender } from '../messaging/sender.js';
import { MediaDownloadError } from '../errors/index.js';
export class Message {
    socket;
    raw;
    rateLimiter;
    sender;
    constructor(socket, raw, rateLimiter) {
        this.socket = socket;
        this.raw = raw;
        this.rateLimiter = rateLimiter;
        this.sender = new MessageSender(socket, this.chatId, raw, rateLimiter);
    }
    get id() {
        return this.raw.key.id ?? '';
    }
    get chatId() {
        return this.raw.key.remoteJid ?? '';
    }
    get senderId() {
        return this.raw.key.participant ?? this.chatId;
    }
    get fromMe() {
        return this.raw.key.fromMe ?? false;
    }
    get isGroup() {
        return this.chatId.endsWith('@g.us');
    }
    get text() {
        const msg = this.raw.message;
        if (!msg) {
            return '';
        }
        return (msg.conversation ??
            msg.extendedTextMessage?.text ??
            msg.imageMessage?.caption ??
            msg.videoMessage?.caption ??
            msg.documentMessage?.caption ??
            '');
    }
    get activeContextInfo() {
        const msg = this.raw.message;
        if (!msg) {
            return undefined;
        }
        return (msg.extendedTextMessage?.contextInfo ??
            msg.imageMessage?.contextInfo ??
            msg.videoMessage?.contextInfo ??
            msg.documentMessage?.contextInfo ??
            msg.audioMessage?.contextInfo ??
            msg.stickerMessage?.contextInfo);
    }
    get mentions() {
        return this.activeContextInfo?.mentionedJid ?? [];
    }
    get quoted() {
        const context = this.activeContextInfo;
        const quotedMessage = context?.quotedMessage;
        if (!quotedMessage) {
            return null;
        }
        return new Message(this.socket, {
            key: {
                remoteJid: this.chatId,
                id: context?.stanzaId ?? '',
                participant: context?.participant ?? '',
                fromMe: false,
            },
            message: quotedMessage,
            messageTimestamp: this.raw.messageTimestamp,
        }, this.rateLimiter);
    }
    get isMedia() {
        const msg = this.raw.message;
        return Boolean(msg?.imageMessage ||
            msg?.videoMessage ||
            msg?.audioMessage ||
            msg?.documentMessage ||
            msg?.stickerMessage);
    }
    get timestamp() {
        const ts = this.raw.messageTimestamp;
        return new Date((typeof ts === 'number'
            ? ts
            : Number(ts?.low ?? 0)) * 1000);
    }
    reply(text, options) {
        return this.sender.text(text, options);
    }
    replyWithImage(source, caption) {
        return this.sender.image(source, caption);
    }
    replyWithVideo(source, caption) {
        return this.sender.video(source, caption);
    }
    replyWithAudio(source, asVoiceNote = false) {
        return this.sender.audio(source, asVoiceNote);
    }
    replyWithDocument(source, fileName, caption) {
        return this.sender.document(source, fileName, caption);
    }
    async react(emoji) {
        await this.socket.sendMessage(this.chatId, {
            react: {
                text: emoji,
                key: this.raw.key,
            },
        });
    }
    async edit(newText) {
        await this.socket.sendMessage(this.chatId, {
            text: newText,
            edit: this.raw.key,
        });
    }
    async delete(forEveryone = true) {
        if (forEveryone) {
            await this.socket.sendMessage(this.chatId, { delete: this.raw.key });
            return;
        }
        await this.socket.chatModify({
            deleteForMe: {
                deleteMedia: true,
                key: this.raw.key,
                timestamp: Date.now(),
            },
        }, this.chatId);
    }
    async forward(to) {
        await this.socket.sendMessage(to, { forward: this.raw });
    }
    async pin(duration = 86_400) {
        await this.socket.sendMessage(this.chatId, {
            pin: this.raw.key,
            type: proto.PinInChat.Type.PIN_FOR_ALL,
            time: duration,
        });
    }
    async unpin() {
        await this.socket.sendMessage(this.chatId, {
            pin: this.raw.key,
            type: proto.PinInChat.Type.UNPIN_FOR_ALL,
        });
    }
    async downloadMedia() {
        try {
            return (await downloadMediaMessage(this.raw, 'buffer', {}, {
                logger: this.socket.logger,
                reuploadRequest: this.socket.updateMediaMessage,
            }));
        }
        catch (err) {
            throw new MediaDownloadError(undefined, { cause: err });
        }
    }
}
