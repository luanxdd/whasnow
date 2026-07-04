import type { WASocket } from '@whiskeysockets/baileys';

import { MessageSendError } from '../errors/index.js';

import type { MediaSource, PostStatusOptions } from '../types/common.js';

import { resolveMedia } from '../utils/media.js';

const STATUS_BROADCAST_JID = 'status@broadcast';

export class StatusManager {
  constructor(private readonly socket: WASocket) {}

  async text(body: string, options: PostStatusOptions): Promise<void> {
    const raw = await this.socket.sendMessage(
      STATUS_BROADCAST_JID,
      { text: body },
      {
        backgroundColor: options.backgroundColor,
        font: options.font,
        statusJidList: options.statusJidList,
        broadcast: true,
      } as Parameters<WASocket['sendMessage']>[2],
    );

    if (!raw) {
      throw new MessageSendError();
    }
  }

  async image(source: MediaSource, options: PostStatusOptions): Promise<void> {
    const image = await resolveMedia(source);

    const raw = await this.socket.sendMessage(
      STATUS_BROADCAST_JID,
      { image, caption: options.caption },
      {
        backgroundColor: options.backgroundColor,
        statusJidList: options.statusJidList,
        broadcast: true,
      } as Parameters<WASocket['sendMessage']>[2],
    );

    if (!raw) {
      throw new MessageSendError();
    }
  }

  async video(source: MediaSource, options: PostStatusOptions): Promise<void> {
    const video = await resolveMedia(source);

    const raw = await this.socket.sendMessage(
      STATUS_BROADCAST_JID,
      { video, caption: options.caption },
      {
        statusJidList: options.statusJidList,
        broadcast: true,
      } as Parameters<WASocket['sendMessage']>[2],
    );

    if (!raw) {
      throw new MessageSendError();
    }
  }
}
