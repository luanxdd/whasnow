import type { WASocket } from '@whiskeysockets/baileys';

import { Message, type PollVoteSource } from '../entities/message.js';
import { MessageSender } from '../messaging/sender.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import type {
  CreateStickerOptions,
  Jid,
  MediaSendOptions,
  MediaSource,
  SendPollOptions,
  SendTextOptions,
  StickerDefaults,
} from '../types/common.js';

export class Chat {
  readonly send: ChatSend;

  constructor(
    private readonly socket: WASocket,
    readonly id: Jid,
    rateLimiter?: RateLimiter,
    pollStore?: PollVoteSource,
    stickerDefaults?: StickerDefaults,
  ) {
    this.send = new ChatSend(
      socket,
      id,
      rateLimiter,
      pollStore,
      stickerDefaults,
    );
  }

  typing(): Promise<void> {
    return this.socket.sendPresenceUpdate('composing', this.id);
  }

  recording(): Promise<void> {
    return this.socket.sendPresenceUpdate('recording', this.id);
  }

  stopTyping(): Promise<void> {
    return this.socket.sendPresenceUpdate('paused', this.id);
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
    return this.socket.chatModify({ archive: true, lastMessages: [] }, this.id);
  }

  unarchive(): Promise<void> {
    return this.socket.chatModify(
      { archive: false, lastMessages: [] },
      this.id,
    );
  }

  clear(): Promise<void> {
    return this.socket.chatModify({ clear: true, lastMessages: [] }, this.id);
  }
}

export class ChatSend {
  private readonly sender: MessageSender;

  constructor(
    socket: WASocket,
    chatId: Jid,
    rateLimiter?: RateLimiter,
    pollStore?: PollVoteSource,
    stickerDefaults?: StickerDefaults,
  ) {
    this.sender = new MessageSender(
      socket,
      chatId,
      undefined,
      rateLimiter,
      pollStore,
      stickerDefaults,
    );
  }

  text(body: string, options?: SendTextOptions): Promise<Message> {
    return this.sender.text(body, options);
  }

  image(
    source: MediaSource,
    caption?: string,
    options?: MediaSendOptions,
  ): Promise<void> {
    return this.sender.image(source, caption, options);
  }

  video(
    source: MediaSource,
    caption?: string,
    options?: MediaSendOptions,
  ): Promise<void> {
    return this.sender.video(source, caption, options);
  }

  audio(
    source: MediaSource,
    asVoiceNote = false,
    options?: MediaSendOptions,
  ): Promise<void> {
    return this.sender.audio(source, asVoiceNote, options);
  }

  document(
    source: MediaSource,
    fileName?: string,
    caption?: string,
  ): Promise<void> {
    return this.sender.document(source, fileName, caption);
  }

  sticker(source: MediaSource, options?: CreateStickerOptions): Promise<void> {
    return this.sender.sticker(source, options);
  }

  poll(
    name: string,
    values: string[],
    options?: SendPollOptions,
  ): Promise<Message> {
    return this.sender.poll(name, values, options);
  }
}
