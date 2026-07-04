import type { WASocket } from '@whiskeysockets/baileys';

import { ModerationStoreUnavailableError } from '../errors/index.js';

import type { MuteOptions, MuteStore } from '../stores/mute-store.js';

import type { Jid } from '../types/common.js';

export class Member {
  constructor(
    private readonly socket: WASocket,
    private readonly groupId: Jid,

    readonly jid: Jid,

    private readonly muteStore?: MuteStore,
  ) {}

  get phone(): string {
    return this.jid.split('@')[0] ?? '';
  }

  async promote(): Promise<void> {
    await this.socket.groupParticipantsUpdate(
      this.groupId,
      [this.jid],
      'promote',
    );
  }

  async demote(): Promise<void> {
    await this.socket.groupParticipantsUpdate(
      this.groupId,
      [this.jid],
      'demote',
    );
  }

  async remove(): Promise<void> {
    await this.socket.groupParticipantsUpdate(
      this.groupId,
      [this.jid],
      'remove',
    );
  }

  async mute(options: MuteOptions = {}): Promise<void> {
    this.requireMuteStore().mute(this.groupId, this.jid, options);
  }

  async unmute(): Promise<void> {
    this.requireMuteStore().unmute(this.groupId, this.jid);
  }

  isMuted(): boolean {
    return this.muteStore?.isMuted(this.groupId, this.jid) ?? false;
  }

  private requireMuteStore(): MuteStore {
    if (!this.muteStore) {
      throw new ModerationStoreUnavailableError();
    }

    return this.muteStore;
  }
}
