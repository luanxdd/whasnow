import {
  and,
  eq,
  gt,
  isNull,
  lt,
  or,
} from 'drizzle-orm';

import {
  getDb,
  mutedUsers,
} from '../database/db.js';

import type {
  Jid,
  MuteEntry,
} from '../types/common.js';

export interface MuteOptions {
  duration?: number;
}

export class MuteStore {
  private readonly db: ReturnType<typeof getDb>;

  constructor(dbPath: string) {
    this.db = getDb(dbPath);
  }

  mute(
    groupId: Jid,
    userJid: Jid,
    options: MuteOptions = {},
  ): void {
    const now = Date.now();

    const expiresAt =
      options.duration != null
        ? now + options.duration
        : null;

    this.db
      .insert(mutedUsers)
      .values({
        groupId,
        userJid,
        mutedAt: now,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [
          mutedUsers.groupId,
          mutedUsers.userJid,
        ],

        set: {
          mutedAt: now,
          expiresAt,
        },
      })
      .run();
  }

  unmute(
    groupId: Jid,
    userJid: Jid,
  ): void {
    this.db
      .delete(mutedUsers)
      .where(
        and(
          eq(mutedUsers.groupId, groupId),
          eq(mutedUsers.userJid, userJid),
        ),
      )
      .run();
  }

  isMuted(
    groupId: Jid,
    userJid: Jid,
  ): boolean {
    const now = Date.now();

    const row = this.db
      .select()
      .from(mutedUsers)
      .where(
        and(
          eq(mutedUsers.groupId, groupId),
          eq(mutedUsers.userJid, userJid),

          or(
            isNull(mutedUsers.expiresAt),
            gt(mutedUsers.expiresAt, now),
          ),
        ),
      )
      .get();

    return row != null;
  }

  listMuted(groupId: Jid): MuteEntry[] {
    const now = Date.now();

    const rows = this.db
      .select()
      .from(mutedUsers)
      .where(
        and(
          eq(mutedUsers.groupId, groupId),

          or(
            isNull(mutedUsers.expiresAt),
            gt(mutedUsers.expiresAt, now),
          ),
        ),
      )
      .all();

    return rows.map((row) => ({
      groupId: row.groupId,
      userJid: row.userJid,

      mutedAt: new Date(row.mutedAt),

      expiresAt:
        row.expiresAt != null
          ? new Date(row.expiresAt)
          : null,
    }));
  }

  cleanup(): void {
    const now = Date.now();

    this.db
      .delete(mutedUsers)
      .where(
        lt(mutedUsers.expiresAt, now),
      )
      .run();
  }
}