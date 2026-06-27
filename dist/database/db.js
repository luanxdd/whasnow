import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable, text, } from 'drizzle-orm/sqlite-core';
export const mutedUsers = sqliteTable('muted_users', {
    id: integer('id')
        .primaryKey({ autoIncrement: true }),
    groupId: text('group_id')
        .notNull(),
    userJid: text('user_jid')
        .notNull(),
    expiresAt: integer('expires_at'),
    mutedAt: integer('muted_at')
        .notNull(),
});
let instance = null;
export function getDb(dbPath) {
    if (instance) {
        return instance;
    }
    const sqlite = new Database(dbPath);
    sqlite.exec(`
    CREATE TABLE IF NOT EXISTS muted_users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id   TEXT    NOT NULL,
      user_jid   TEXT    NOT NULL,
      expires_at INTEGER,
      muted_at   INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS
      idx_muted_users_group_user
    ON muted_users (group_id, user_jid);
  `);
    instance = drizzle(sqlite);
    return instance;
}
