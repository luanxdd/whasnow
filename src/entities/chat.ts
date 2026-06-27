import type { WASocket } from '@whiskeysockets/baileys';

import { Message } from '../entities/message.js';
import { MessageSender } from '../messaging/sender.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import type {
  Jid,
  MediaSource,
  SendTextOptions,
} from '../types/common.js';

export class Chat {
  readonly send: ChatSend;

  constructor(
    private readonly socket: WASocket,
    readonly id: Jid,
    rateLimiter?: RateLimiter,
  ) {
    this.send = new ChatSend(socket, id, rateLimiter);
  }

  typing(): Promise<void> {
    return this.socket.sendPresenceUpdate(
      'composing',
      this.id,
    );
  }

  recording(): Promise<void> {
    return this.socket.sendPresenceUpdate(
      'recording',
      this.id,
    );
  }

  stopTyping(): Promise<void> {
    return this.socket.sendPresenceUpdate(
      'paused',
      this.id,
    );
  }

  markRead(): Promise<void> {
    return this.socket.readMessages([
      {
        remoteJid: this.id,
        id: '',
      },
    ]);
  }

  archive(): Promise<void> {
    return this.socket.chatModify(
      { archive: true, lastMessages: [] },
      this.id,
    );
  }

  unarchive(): Promise<void> {
    return this.socket.chatModify(
      { archive: false, lastMessages: [] },
      this.id,
    );
  }

  clear(): Promise<void> {
    return this.socket.chatModify(
      { clear: true, lastMessages: [] },
      this.id,
    );
  }
}

export class ChatSend {
  private readonly sender: MessageSender;

  constructor(
    socket: WASocket,
    chatId: Jid,
    rateLimiter?: RateLimiter,
  ) {
    this.sender = new MessageSender(
      socket,
      chatId,
      undefined,
      rateLimiter,
    );
  }

  text(
    body: string,
    options?: SendTextOptions,
  ): Promise<Message> {
    return this.sender.text(body, options);
  }

  image(
    source: MediaSource,
    caption?: string,
  ): Promise<void> {
    return this.sender.image(source, caption);
  }

  video(
    source: MediaSource,
    caption?: string,
  ): Promise<void> {
    return this.sender.video(source, caption);
  }

  audio(
    source: MediaSource,
    asVoiceNote = false,
  ): Promise<void> {
    return this.sender.audio(source, asVoiceNote);
  }

  document(
    source: MediaSource,
    fileName?: string,
    caption?: string,
  ): Promise<void> {
    return this.sender.document(
      source,
      fileName,
      caption,
    );
  }

  sticker(source: MediaSource): Promise<void> {
    return this.sender.sticker(source);
  }
}