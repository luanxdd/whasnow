import type { GroupMetadata } from '@whiskeysockets/baileys';

import type { CallStatus } from './common.js';

export interface MessageReceivedPayload {
  chatId: string;
  senderId: string;
  timestamp: number;
  isGroup: boolean;
}

export interface ConnectionClosePayload {
  reason: string;
  willReconnect: boolean;
  attempt: number;
}

export interface GroupParticipantPayload {
  groupId: string;
  action: 'add' | 'remove' | 'promote' | 'demote';
  actorId: string;
  participants: string[];
}

export interface GroupUpdatePayload {
  groupId: string;
  metadata: Partial<GroupMetadata>;
}

export interface PairingCodePayload {
  code: string;
  phoneNumber: string;
}

export interface PresencePayload {
  chatId: string;
  participantId: string;
  presence:
    | 'available'
    | 'unavailable'
    | 'composing'
    | 'recording'
    | 'paused';
}

export interface ReconnectingPayload {
  attempt: number;
}

export interface MessageEditedPayload {
  chatId: string;
  messageId: string;
}

export interface MessageDeletedPayload {
  chatId: string;
  messageId: string;
}

export interface CallPayload {
  callId: string;
  from: string;
  status: CallStatus;
  isVideo: boolean;
  isGroup: boolean;
}

export interface PollVotePayload {
  chatId: string;
  pollMessageId: string;
  voterJid: string;
  selectedOptions: string[];
}

export interface StatusPostedPayload {
  statusId: string;
  from: string;
  isMedia: boolean;
}

export interface MessageReactionPayload {
  chatId: string;
  messageId: string;
  senderId: string;
  emoji: string | null;
  removed: boolean;
}

export interface MessageReceiptPayload {
  chatId: string;
  messageId: string;
  participantId: string;
  status: 'delivered' | 'read' | 'played';
  timestamp: Date;
}

export interface GroupJoinRequestPayload {
  groupId: string;
  participantId: string;
  action: 'created' | 'revoked' | 'rejected';
  method: string;
}

export interface ChatUpsertedPayload {
  chatId: string;
  name?: string;
  unreadCount?: number;
}

export interface ChatUpdatedPayload {
  chatId: string;
}

export interface ChatDeletedPayload {
  chatId: string;
}

export interface ContactUpsertedPayload {
  jid: string;
  name?: string;
}

export interface ContactUpdatedPayload {
  jid: string;
}

export interface BlocklistUpdatedPayload {
  blocklist: string[];
  type: 'set' | 'add' | 'remove';
}

export interface WhaSnowEventMap {
  ready: void;

  disconnected: ConnectionClosePayload;
  reconnecting: ReconnectingPayload;

  'pairing.code': PairingCodePayload;

  message: MessageReceivedPayload;
  'message.edited': MessageEditedPayload;
  'message.deleted': MessageDeletedPayload;

  'group.participant': GroupParticipantPayload;
  'group.updated': GroupUpdatePayload;

  presence: PresencePayload;

  call: CallPayload;
  'poll.vote': PollVotePayload;
  'status.posted': StatusPostedPayload;

  'message.reaction': MessageReactionPayload;
  'message.receipt': MessageReceiptPayload;

  'group.joinRequest': GroupJoinRequestPayload;

  'chat.upserted': ChatUpsertedPayload;
  'chat.updated': ChatUpdatedPayload;
  'chat.deleted': ChatDeletedPayload;

  'contact.upserted': ContactUpsertedPayload;
  'contact.updated': ContactUpdatedPayload;

  'blocklist.updated': BlocklistUpdatedPayload;

  error: Error;
}