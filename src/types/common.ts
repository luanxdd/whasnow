export type Jid = string;
export type MediaSource = string | Buffer;
export type MessageId = string;
export type PhoneNumber = string;

export type Awaitable<T> = T | Promise<T>;

export type CallStatus =
  | 'offer'
  | 'ringing'
  | 'accept'
  | 'reject'
  | 'timeout';

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

export interface SendImageOptions {
  caption?: string;
  viewOnce?: boolean;
  mentions?: Jid[];
}

export interface SendVideoOptions {
  caption?: string;
  viewOnce?: boolean;
  mentions?: Jid[];
}

export interface SendAudioOptions {
  voice?: boolean;
  viewOnce?: boolean;
}

export interface SendDocumentOptions {
  fileName?: string;
  caption?: string;
  mentions?: Jid[];
}

export interface StickerDefaults {
  packName?: string;
  authorName?: string;
}

export interface CreateStickerOptions extends StickerDefaults {
  categories?: string[];
  crop?: 'contain' | 'cover';
  backgroundColor?: string;
}

export interface AlbumImageItem {
  image: MediaSource;
  caption?: string;
}

export interface AlbumVideoItem {
  video: MediaSource;
  caption?: string;
}

export type AlbumItem = AlbumImageItem | AlbumVideoItem;

export interface SendAlbumOptions {
  mentions?: Jid[];
}

export interface ButtonOption {
  id: string;
  text: string;
}

export interface SendButtonsOptions {
  footer?: string;
  mentions?: Jid[];
}

export interface ButtonReply {
  id: string;
  displayText: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title?: string;
  rows: ListRow[];
}

export interface SendListOptions {
  title?: string;
  footer?: string;
  mentions?: Jid[];
}

export interface ListReply {
  id: string;
  title: string;
  description?: string;
}

export interface PostStatusOptions {
  statusJidList: Jid[];
  backgroundColor?: string;
  font?: number;
  caption?: string;
}

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