import {
  generateWAMessageFromContent,
  proto,
  type AnyMessageContent,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';

import { Message, type PollVoteSource } from '../entities/message.js';

import { MessageSendError } from '../errors/index.js';

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

import {
  fileNameFromPath,
  mimeTypeFromPath,
  resolveMedia,
} from '../utils/media.js';

import { buildSticker } from '../media/sticker-builder.js';

import {
  buildButtonsNodes,
  buildListNodes,
  type InteractiveBinaryNode,
} from './interactive-nodes.js';

export class MessageSender {
  constructor(
    private readonly socket: WASocket,
    private readonly chatId: Jid,
    private readonly quotedMessage?: WAMessage,
    private readonly rateLimiter?: RateLimiter,
    private readonly pollStore?: PollVoteSource,
    private readonly stickerDefaults?: StickerDefaults,
  ) {}

  async audio(
    source: MediaSource | null | undefined,
    options: SendAudioOptions = {},
  ): Promise<void> {
    if (source == null) {
      return;
    }

    const audio = await resolveMedia(source);

    await this.dispatch({
      audio,
      mimetype: 'audio/mp4',
      ptt: options.voice ?? false,
      viewOnce: options.viewOnce,
    });
  }

  async document(
    source: MediaSource | null | undefined,
    options: SendDocumentOptions = {},
  ): Promise<void> {
    if (source == null) {
      return;
    }

    const path = typeof source === 'string' ? source : '';

    const document = await resolveMedia(source);

    await this.dispatch({
      document,

      fileName: options.fileName ?? (path ? fileNameFromPath(path) : 'file'),

      mimetype: path ? mimeTypeFromPath(path) : 'application/octet-stream',

      caption: options.caption,

      contextInfo: options.mentions
        ? { mentionedJid: options.mentions }
        : undefined,
    });
  }

  async image(
    source: MediaSource | null | undefined,
    options: SendImageOptions = {},
  ): Promise<void> {
    if (source == null) {
      return;
    }

    const image = await resolveMedia(source);

    await this.dispatch({
      image,
      caption: options.caption,
      viewOnce: options.viewOnce,
      mentions: options.mentions,
    });
  }

  async sticker(
    source: MediaSource,
    options?: CreateStickerOptions,
  ): Promise<void> {
    const sticker = await buildSticker(source, {
      ...this.stickerDefaults,
      ...options,
    });

    await this.dispatch({
      sticker,
    });
  }

  async text(body: string, options?: SendTextOptions): Promise<Message> {
    const raw = await this.dispatch({
      text: body,
      mentions: options?.mentions,
    });

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
      this.stickerDefaults,
    );
  }

  async video(
    source: MediaSource | null | undefined,
    options: SendVideoOptions = {},
  ): Promise<void> {
    if (source == null) {
      return;
    }

    const video = await resolveMedia(source);

    await this.dispatch({
      video,
      caption: options.caption,
      viewOnce: options.viewOnce,
      mentions: options.mentions,
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
        selectableCount: options?.selectableCount ?? 1,
        toAnnouncementGroup: options?.toAnnouncementGroup ?? false,
      },
    });

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
      this.stickerDefaults,
    );
  }

  async buttons(
    text: string,
    buttons: ButtonOption[],
    options: SendButtonsOptions = {},
  ): Promise<Message> {
    const raw = await this.dispatchRaw(
      {
        buttonsMessage: {
          contentText: text,
          footerText: options.footer,
          headerType: proto.Message.ButtonsMessage.HeaderType.EMPTY,
          buttons: buttons.map((button) => ({
            buttonId: button.id,
            buttonText: { displayText: button.text },
            type: proto.Message.ButtonsMessage.Button.Type.RESPONSE,
          })),
          contextInfo: options.mentions
            ? { mentionedJid: options.mentions }
            : undefined,
        },
      },
      buildButtonsNodes(this.isGroupChat),
    );

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
      this.stickerDefaults,
    );
  }

  async list(
    text: string,
    buttonText: string,
    sections: ListSection[],
    options: SendListOptions = {},
  ): Promise<Message> {
    const raw = await this.dispatchRaw(
      {
        listMessage: {
          title: options.title,
          description: text,
          buttonText,
          footerText: options.footer,
          listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
          sections: sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              rowId: row.id,
              title: row.title,
              description: row.description,
            })),
          })),
          contextInfo: options.mentions
            ? { mentionedJid: options.mentions }
            : undefined,
        },
      },
      buildListNodes(this.isGroupChat),
    );

    return new Message(
      this.socket,
      raw,
      this.rateLimiter,
      this.pollStore,
      this.stickerDefaults,
    );
  }

  async album(
    items: AlbumItem[],
    options: SendAlbumOptions = {},
  ): Promise<Message> {
    const expectedImageCount = items.filter((item) => 'image' in item).length;
    const expectedVideoCount = items.filter((item) => 'video' in item).length;

    const parent = await this.dispatch({
      album: { expectedImageCount, expectedVideoCount },
      mentions: options.mentions,
    });

    for (const item of items) {
      if ('image' in item) {
        const image = await resolveMedia(item.image);

        await this.dispatch({
          image,
          caption: item.caption,
          albumParentKey: parent.key,
        });
      } else {
        const video = await resolveMedia(item.video);

        await this.dispatch({
          video,
          caption: item.caption,
          albumParentKey: parent.key,
        });
      }
    }

    return new Message(
      this.socket,
      parent,
      this.rateLimiter,
      this.pollStore,
      this.stickerDefaults,
    );
  }

  private async dispatch(content: AnyMessageContent): Promise<WAMessage> {
    const send = async (): Promise<WAMessage> => {
      const raw = await this.socket.sendMessage(
        this.chatId,
        content,
        this.quotedMessage
          ? {
              quoted: this.quotedMessage,
            }
          : undefined,
      );

      if (!raw) {
        throw new MessageSendError();
      }

      return raw;
    };

    return this.rateLimiter ? this.rateLimiter.schedule(send) : send();
  }

  private get isGroupChat(): boolean {
    return this.chatId.endsWith('@g.us');
  }

  private async dispatchRaw(
    content: proto.IMessage,
    additionalNodes?: InteractiveBinaryNode[],
  ): Promise<WAMessage> {
    const send = async (): Promise<WAMessage> => {
      const fullMessage = generateWAMessageFromContent(this.chatId, content, {
        userJid: this.socket.user?.id ?? '',
        quoted: this.quotedMessage,
      });

      await withTimeout(
        this.socket.relayMessage(this.chatId, fullMessage.message!, {
          messageId: fullMessage.key.id ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          additionalNodes: additionalNodes as any,
        }),
        15_000,
        'envio de mensagem interativa (buttons/list)',
      );

      return fullMessage;
    };

    return this.rateLimiter ? this.rateLimiter.schedule(send) : send();
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new MessageSendError(
          `Timeout de ${ms}ms ao aguardar confirmação de envio: ${label}. ` +
            'O WhatsApp pode não ter renderizado a mensagem interativa ' +
            '(recurso não-oficial, sujeito a mudanças no protocolo).',
        ),
      );
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}