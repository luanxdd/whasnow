export type Jid = string;
export type MediaSource =
  | string
  | Buffer;
export type MessageId = string;
export type PhoneNumber = string;

export interface SendTextOptions {
  mentions?: Jid[];
}

export interface MuteEntry {
  groupId: Jid;
  userJid: Jid;
  mutedAt: Date;
  expiresAt: Date | null;
}

export interface WaitForReplyContextOptions<TContext = unknown> {
  timeoutMs?: number;
  fromJid?: Jid;
  filter?: (ctx: TContext) => boolean;
}