import type { GroupMetadata } from '@whiskeysockets/baileys';

import type { Jid } from '../types/common.js';

export class GroupMetadataCache {
  private readonly entries = new Map<Jid, GroupMetadata>();

  get(jid: Jid): GroupMetadata | undefined {
    return this.entries.get(jid);
  }

  set(jid: Jid, metadata: GroupMetadata): void {
    this.entries.set(jid, metadata);
  }

  invalidate(jid: Jid): void {
    this.entries.delete(jid);
  }

  clear(): void {
    this.entries.clear();
  }
}
