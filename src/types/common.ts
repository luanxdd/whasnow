export type Jid = string;
export type MediaSource = string | Buffer;
export type MessageId = string;
export type PhoneNumber = string;

export interface SendTextOptions {
  mentions?: Jid[];
}

export interface SendPollOptions {
  selectableCount?: number;
  toAnnouncementGroup?: boolean;
}

export interface PollVote {
  voterJid: Jid;
  selectedOptions: string[];
}

export interface MediaSendOptions {
  viewOnce?: boolean;
}

export interface PostStatusOptions {
  statusJidList: Jid[];
  backgroundColor?: string;
  font?: number;
  caption?: string;
}

export type CallStatus =
  | 'offer'
  | 'ringing'
  | 'accept'
  | 'reject'
  | 'timeout';

export interface IncomingCall {
  id: string;
  from: Jid;
  status: CallStatus;
  isVideo: boolean;
  isGroup: boolean;
  timestamp: Date;
}

export interface MuteEntry {
  groupId: Jid;
  userJid: Jid;
  mutedAt: Date;
  expiresAt: Date | null;
}

export interface GroupInfo {
  id: Jid;
  name: string;
  description: string | null;
  owner: Jid | null;
  createdAt: Date | null;
  memberCount: number;
  isLocked: boolean;
  isAnnouncementOnly: boolean;
}

export interface GroupJoinRequest {
  jid: Jid;
  requestMethod: string;
  requestedAt: Date;
}

export interface GroupJoinRequestResult {
  jid: Jid;
  status: string;
}

export interface WaitForReplyContextOptions<TContext = unknown> {
  timeoutMs?: number;
  fromJid?: Jid;
  filter?: (ctx: TContext) => boolean;
}