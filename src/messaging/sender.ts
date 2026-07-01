import type {
  AnyMessageContent,
  WAMessage,
  WASocket,
} from '@whiskeysockets/baileys';

import { Message, type PollVoteSource } from '../entities/message.js';

import { MessageSendError } from '../errors/index.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import type {
  Jid,
  MediaSendOptions,
  MediaSource,
  SendPollOptions,
  SendTextOptions,
} from '../types/common.js';

import {
  fileNameFromPath,
  mimeTypeFromPath,
  resolveMedia,
} from '../utils/media.js';

export class MessageSender {
  constructor(
    private readonly socket: WASocket,
    private readonly chatId: Jid,
    private readonly quotedMessage?: WAMessage,
    private readonly rateLimiter?: RateLimiter,
    private readonly pollStore?: PollVoteSource,
  ) {}

  async audio(
    source: MediaSource,
    asVoiceNote = false,
    options?: MediaSendOptions,
  ): Promise<void> {
    const audio = await resolveMedia(
      source,
    );

    await this.dispatch({
      audio,
      mimetype: 'audio/mp4',
      ptt: asVoiceNote,
      viewOnce: options?.viewOnce,
    });
  }

  async document(
    source: MediaSource,
    fileName?: string,
    caption?: string,
  ): Promise<void> {
    const path =
      typeof source === 'string'
        ? source
        : '';

    const document =
      await resolveMedia(source);

    await this.dispatch({
      document,

      fileName:
        fileName ??
        (path
          ? fileNameFromPath(path)
          : 'file'),

      mimetype: path
        ? mimeTypeFromPath(path)
        : 'application/octet-stream',

      caption,
    });
  }

  async image(
    source: MediaSource,
    caption?: string,
    options?: MediaSendOptions,
  ): Promise<void> {
    const image = await resolveMedia(
      source,
    );

    await this.dispatch({
      image,
      caption,
      viewOnce: options?.viewOnce,
    });
  }

  async sticker(
    source: MediaSource,
  ): Promise<void> {
    const sticker =
      await resolveMedia(source);

    await this.dispatch({
      sticker,
    });
  }

  async text(
    body: string,
    options?: SendTextOptions,
  ): Promise<Message> {
    const raw = await this.dispatch({
      text: body,
      mentions: options?.mentions,
    });

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
    );
  }

  async video(
    source: MediaSource,
    caption?: string,
    options?: MediaSendOptions,
  ): Promise<void> {
    const video = await resolveMedia(
      source,
    );

    await this.dispatch({
      video,
      caption,
      viewOnce: options?.viewOnce,
    });
  }

  async poll(
    name: string,
    values: string[],
    options?: SendPollOptions,
  ): Promise<Message> {
    const raw = await this.dispatch({
      poll: {
        name,
        values,
        selectableCount:
          options?.selectableCount ?? 1,
        toAnnouncementGroup:
          options?.toAnnouncementGroup ?? false,
      },
    });

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
    );
  }

  private async dispatch(
    content: AnyMessageContent,
  ): Promise<WAMessage> {
    const send = async (): Promise<WAMessage> => {
      const raw =
        await this.socket.sendMessage(
          this.chatId,
          content,
          this.quotedMessage
            ? {
                quoted:
                  this.quotedMessage,
              }
            : undefined,
        );

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