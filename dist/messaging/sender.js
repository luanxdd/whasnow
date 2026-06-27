import { Message } from '../entities/message.js';
import { MessageSendError } from '../errors/index.js';
import { fileNameFromPath, mimeTypeFromPath, resolveMedia, } from '../utils/media.js';
export class MessageSender {
    socket;
    chatId;
    quotedMessage;
    rateLimiter;
    constructor(socket, chatId, quotedMessage, rateLimiter) {
        this.socket = socket;
        this.chatId = chatId;
        this.quotedMessage = quotedMessage;
        this.rateLimiter = rateLimiter;
    }
    async audio(source, asVoiceNote = false) {
        const audio = await resolveMedia(source);
        await this.dispatch({
            audio,
            mimetype: 'audio/mp4',
            ptt: asVoiceNote,
        });
    }
    async document(source, fileName, caption) {
        const path = typeof source === 'string'
            ? source
            : '';
        const document = await resolveMedia(source);
        await this.dispatch({
            document,
            fileName: fileName ??
                (path
                    ? fileNameFromPath(path)
                    : 'file'),
            mimetype: path
                ? mimeTypeFromPath(path)
                : 'application/octet-stream',
            caption,
        });
    }
    async image(source, caption) {
        const image = await resolveMedia(source);
        await this.dispatch({
            image,
            caption,
        });
    }
    async sticker(source) {
        const sticker = await resolveMedia(source);
        await this.dispatch({
            sticker,
        });
    }
    async text(body, options) {
        const raw = await this.dispatch({
            text: body,
            mentions: options?.mentions,
        });
        return new Message(this.socket, raw, this.rateLimiter);
    }
    async video(source, caption) {
        const video = await resolveMedia(source);
        await this.dispatch({
            video,
            caption,
        });
    }
    async dispatch(content) {
        const send = async () => {
            const raw = await this.socket.sendMessage(this.chatId, content, this.quotedMessage
                ? {
                    quoted: this.quotedMessage,
                }
                : undefined);
            if (!raw) {
                throw new MessageSendError();
            }
            return raw;
        };
        return this.rateLimiter
            ? this.rateLimiter.schedule(send)
            : send();
    }
}
