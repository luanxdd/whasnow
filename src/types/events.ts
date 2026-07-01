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

  action:
    | 'add'
    | 'remove'
    | 'promote'
    | 'demote';

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

  error: Error;
}