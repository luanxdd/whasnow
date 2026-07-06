import type { WASocket } from '@whiskeysockets/baileys';

import { Message, type PollVoteSource } from '../entities/message.js';
import { MessageSender } from '../messaging/sender.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import type {
  AlbumItem,
  ButtonOption,
  CreateStickerOptions,
  Jid,
  ListSection,
  MediaSource,
  SendAlbumOptions,
  SendAudioOptions,
  SendButtonsOptions,
  SendDocumentOptions,
  SendImageOptions,
  SendListOptions,
  SendPollOptions,
  SendTextOptions,
  SendVideoOptions,
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
    source: MediaSource | null | undefined,
    options?: SendImageOptions,
  ): Promise<void> {
    return this.sender.image(source, options);
  }

  video(
    source: MediaSource | null | undefined,
    options?: SendVideoOptions,
  ): Promise<void> {
    return this.sender.video(source, options);
  }

  audio(
    source: MediaSource | null | undefined,
    options?: SendAudioOptions,
  ): Promise<void> {
    return this.sender.audio(source, options);
  }

  document(
    source: MediaSource | null | undefined,
    options?: SendDocumentOptions,
  ): Promise<void> {
    return this.sender.document(source, options);
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

  buttons(
    text: string,
    buttons: ButtonOption[],
    options?: SendButtonsOptions,
  ): Promise<Message> {
    return this.sender.buttons(text, buttons, options);
  }

  list(
    text: string,
    buttonText: string,
    sections: ListSection[],
    options?: SendListOptions,
  ): Promise<Message> {
    return this.sender.list(text, buttonText, sections, options);
  }

  album(items: AlbumItem[], options?: SendAlbumOptions): Promise<Message> {
    return this.sender.album(items, options);
  }
}