import type { WASocket } from '@whiskeysockets/baileys';

import type {
  Jid,
  PhoneNumber,
} from '../types/common.js';

export class Contact {
  constructor(
    private readonly socket: WASocket,
    readonly jid: Jid,
    readonly pushName?: string,
  ) {}

  get phone(): PhoneNumber {
    return this.jid.split('@')[0] ?? '';
  }

  async name(): Promise<string | undefined> {
    try {
      const results = await this.socket.onWhatsApp(this.phone);
      const info = results?.[0];

      return (info as any)?.notify;
    } catch {
      return undefined;
    }
  }

  async avatar(): Promise<string | undefined> {
    try {
      return await this.socket.profilePictureUrl(
        this.jid,
        'image',
      );
    } catch {
      return undefined;
    }
  }

  async status(): Promise<string | undefined> {
    try {
      const result = await this.socket.fetchStatus(
        this.jid,
      ) as any;

      return result?.status;
    } catch {
      return undefined;
    }
  }

  block(): Promise<void> {
    return this.socket.updateBlockStatus(
      this.jid,
      'block',
    );
  }

  unblock(): Promise<void> {
    return this.socket.updateBlockStatus(
      this.jid,
      'unblock',
    );
  }

  async exists(): Promise<boolean> {
    try {
      const results = await this.socket.onWhatsApp(this.phone);
      const info = results?.[0];

      return Boolean(info?.exists);
    } catch {
      return false;
    }
  }
}