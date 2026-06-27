import {
  downloadMediaMessage,
  proto,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';

import { MessageSender } from '../messaging/sender.js';

import { MediaDownloadError } from '../errors/index.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import type {
  Jid,
  MediaSource,
  MessageId,
  SendTextOptions,
} from '../types/common.js';

export class Message {
  private readonly sender: MessageSender;

  constructor(
    private readonly socket: WASocket,
    private readonly raw: WAMessage,
    private readonly rateLimiter?: RateLimiter,
  ) {
    this.sender = new MessageSender(
      socket,
      this.chatId,
      raw,
      rateLimiter,
    );
  }

  get id(): MessageId {
    return this.raw.key.id ?? '';
  }

  get chatId(): Jid {
    return this.raw.key.remoteJid ?? '';
  }

  get senderId(): Jid {
    return this.raw.key.participant ?? this.chatId;
  }

  get fromMe(): boolean {
    return this.raw.key.fromMe ?? false;
  }

  get isGroup(): boolean {
    return this.chatId.endsWith('@g.us');
  }

  get text(): string {
    const msg = this.raw.message;

    if (!msg) {
      return '';
    }

    return (
      msg.conversation ??
      msg.extendedTextMessage?.text ??
      msg.imageMessage?.caption ??
      msg.videoMessage?.caption ??
      msg.documentMessage?.caption ??
      ''
    );
  }

  private get activeContextInfo() {
    const msg = this.raw.message;

    if (!msg) {
      return undefined;
    }

    return (
      msg.extendedTextMessage?.contextInfo ??
      msg.imageMessage?.contextInfo ??
      msg.videoMessage?.contextInfo ??
      msg.documentMessage?.contextInfo ??
      msg.audioMessage?.contextInfo ??
      msg.stickerMessage?.contextInfo
    );
  }

  get mentions(): Jid[] {
    return this.activeContextInfo?.mentionedJid ?? [];
  }

  get quoted(): Message | null {
    const context = this.activeContextInfo;
    const quotedMessage = context?.quotedMessage;

    if (!quotedMessage) {
      return null;
    }

    return new Message(
      this.socket,
      {
        key: {
          remoteJid: this.chatId,
          id: context?.stanzaId ?? '',
          participant: context?.participant ?? '',
          fromMe: false,
        },
        message: quotedMessage,
        messageTimestamp:
          this.raw.messageTimestamp,
      } as WAMessage,
      this.rateLimiter,
    );
  }

  get isMedia(): boolean {
    const msg = this.raw.message;

    return Boolean(
      msg?.imageMessage ||
      msg?.videoMessage ||
      msg?.audioMessage ||
      msg?.documentMessage ||
      msg?.stickerMessage,
    );
  }

  get timestamp(): Date {
    const ts = this.raw.messageTimestamp;

    return new Date(
      (
        typeof ts === 'number'
          ? ts
          : Number(ts?.low ?? 0)
      ) * 1000,
    );
  }

  reply(
    text: string,
    options?: SendTextOptions,
  ): Promise<Message> {
    return this.sender.text(text, options);
  }

  replyWithImage(
    source: MediaSource,
    caption?: string,
  ): Promise<void> {
    return this.sender.image(source, caption);
  }

  replyWithVideo(
    source: MediaSource,
    caption?: string,
  ): Promise<void> {
    return this.sender.video(source, caption);
  }

  replyWithAudio(
    source: MediaSource,
    asVoiceNote = false,
  ): Promise<void> {
    return this.sender.audio(
      source,
      asVoiceNote,
    );
  }

  replyWithDocument(
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

  async react(emoji: string): Promise<void> {
    await this.socket.sendMessage(
      this.chatId,
      {
        react: {
          text: emoji,
          key: this.raw.key,
        },
      },
    );
  }

  async edit(newText: string): Promise<void> {
    await this.socket.sendMessage(
      this.chatId,
      {
        text: newText,
        edit: this.raw.key,
      },
    );
  }

  async delete(
    forEveryone = true,
  ): Promise<void> {
    if (forEveryone) {
      await this.socket.sendMessage(
        this.chatId,
        { delete: this.raw.key },
      );

      return;
    }

    await this.socket.chatModify(
      {
        deleteForMe: {
          deleteMedia: true,
          key: this.raw.key,
          timestamp: Date.now(),
        },
      },
      this.chatId,
    );
  }

  async forward(to: Jid): Promise<void> {
    await this.socket.sendMessage(
      to,
      { forward: this.raw },
    );
  }

  async pin(
    duration: 86_400 | 604_800 | 2_592_000 = 86_400,
  ): Promise<void> {
    await this.socket.sendMessage(
      this.chatId,
      {
        pin: this.raw.key,
        type: proto.PinInChat.Type.PIN_FOR_ALL,
        time: duration,
      },
    );
  }

  async unpin(): Promise<void> {
    await this.socket.sendMessage(
      this.chatId,
      {
        pin: this.raw.key,
        type: proto.PinInChat.Type.UNPIN_FOR_ALL,
      },
    );
  }

  async downloadMedia(): Promise<Buffer> {
    try {
      return (await downloadMediaMessage(
        this.raw,
        'buffer',
        {},
        {
          logger: this.socket.logger,
          reuploadRequest:
            this.socket.updateMediaMessage,
        },
      )) as Buffer;
    } catch (err) {
      throw new MediaDownloadError(
        undefined,
        { cause: err },
      );
    }
  }
}