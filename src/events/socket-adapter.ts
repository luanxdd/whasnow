import {
  getAggregateVotesInPollMessage,
  proto,
  type GroupParticipant,
  type WASocket,
} from '@whiskeysockets/baileys';

import type { GroupMetadataCache } from '../entities/group-metadata-cache.js';

import type { PollStore } from '../messaging/poll-store.js';

import type { EventBus } from './bus.js';

const STATUS_BROADCAST_JID = 'status@broadcast';

export class SocketEventAdapter {
  constructor(
    private readonly socket: WASocket,
    private readonly bus: EventBus,
    private readonly metadataCache: GroupMetadataCache,
    private readonly pollStore: PollStore,
  ) {}

  bind(): void {
    this.bindGroups();
    this.bindMessages();
    this.bindPresence();
    this.bindCalls();
    this.bindChats();
    this.bindContacts();
    this.bindBlocklist();
  }

  private bindGroups(): void {
    this.socket.ev.on('group-participants.update', (update) => {
      this.metadataCache.invalidate(update.id);

      this.bus.emit('group.participant', {
        groupId: update.id,
        action: update.action as 'add' | 'remove' | 'promote' | 'demote',
        actorId: update.author ?? '',
        participants: update.participants.map(
          (participant: GroupParticipant | string) =>
            typeof participant === 'string'
              ? participant
              : (participant.id ?? participant),
        ),
      });
    });

    this.socket.ev.on('groups.update', (updates) => {
      for (const update of updates) {
        if (update.id) {
          this.metadataCache.invalidate(update.id);
        }

        this.bus.emit('group.updated', {
          groupId: update.id ?? '',
          metadata: update,
        });
      }
    });

    this.socket.ev.on('group.join-request', (request) => {
      this.bus.emit('group.joinRequest', {
        groupId: request.id,
        participantId: request.participant,
        action: request.action,
        method: request.method ?? '',
      });
    });
  }

  private bindMessages(): void {
    this.socket.ev.on('messages.upsert', ({ messages }) => {
      for (const message of messages) {
        const protocolMessage = message.message?.protocolMessage;

        if (
          protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE &&
          protocolMessage.key
        ) {
          this.bus.emit('message.deleted', {
            chatId: protocolMessage.key.remoteJid ?? '',
            messageId: protocolMessage.key.id ?? '',
          });

          continue;
        }

        if (
          message.key.remoteJid === STATUS_BROADCAST_JID &&
          !message.key.fromMe
        ) {
          this.bus.emit('status.posted', {
            statusId: message.key.id ?? '',
            from: message.key.participant ?? '',
            isMedia: Boolean(
              message.message?.imageMessage || message.message?.videoMessage,
            ),
          });

          continue;
        }

        if (message.key.fromMe) {
          continue;
        }

        const chatId = message.key.remoteJid ?? '';

        const senderId = message.key.participant ?? chatId;

        const timestamp = Number(message.messageTimestamp ?? 0) * 1000;

        this.bus.emit('message', {
          chatId,
          senderId,
          timestamp,
          isGroup: chatId.endsWith('@g.us'),
        });
      }
    });

    this.socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (update.update?.pollUpdates?.length) {
          this.handlePollUpdates(update.key, update.update.pollUpdates);
        }

        if (!update.update?.message) {
          continue;
        }

        this.bus.emit('message.edited', {
          chatId: update.key.remoteJid ?? '',
          messageId: update.key.id ?? '',
        });
      }
    });

    this.socket.ev.on('messages.delete', (event) => {
      if ('all' in event) {
        this.bus.emit('message.deleted', {
          chatId: event.jid,
          messageId: '',
        });

        return;
      }

      for (const key of event.keys) {
        this.bus.emit('message.deleted', {
          chatId: key.remoteJid ?? '',
          messageId: key.id ?? '',
        });
      }
    });

    this.socket.ev.on('messages.reaction', (reactions) => {
      for (const { key, reaction } of reactions) {
        const emoji = reaction.text || null;

        this.bus.emit('message.reaction', {
          chatId: key.remoteJid ?? '',
          messageId: key.id ?? '',
          senderId: reaction.key?.participant ?? key.remoteJid ?? '',
          emoji,
          removed: !emoji,
        });
      }
    });

    this.socket.ev.on('message-receipt.update', (updates) => {
      for (const { key, receipt } of updates) {
        const timestampSeconds =
          receipt.playedTimestamp ?? receipt.readTimestamp ?? receipt.receiptTimestamp;

        if (!timestampSeconds) {
          continue;
        }

        const status = receipt.playedTimestamp
          ? 'played'
          : receipt.readTimestamp
            ? 'read'
            : 'delivered';

        this.bus.emit('message.receipt', {
          chatId: key.remoteJid ?? '',
          messageId: key.id ?? '',
          participantId: receipt.userJid ?? key.participant ?? key.remoteJid ?? '',
          status,
          timestamp: new Date(Number(timestampSeconds) * 1000),
        });
      }
    });
  }

  private handlePollUpdates(
    key: proto.IMessageKey,
    pollUpdates: proto.IPollUpdate[],
  ): void {
    const pollMessageId = key.id;

    if (!pollMessageId) {
      return;
    }

    for (const update of pollUpdates) {
      const updatedCreation = this.pollStore.addVote(pollMessageId, update);

      const voterJid =
        update.pollUpdateMessageKey?.participant ??
        update.pollUpdateMessageKey?.remoteJid ??
        '';

      if (!updatedCreation || !voterJid) {
        continue;
      }

      const aggregated = getAggregateVotesInPollMessage({
        message: updatedCreation.message,
        pollUpdates: updatedCreation.pollUpdates ?? [],
      });

      const selectedOptions = aggregated
        .filter((option) => option.voters.includes(voterJid))
        .map((option) => option.name);

      this.bus.emit('poll.vote', {
        chatId: key.remoteJid ?? '',
        pollMessageId,
        voterJid,
        selectedOptions,
      });
    }
  }

  private bindCalls(): void {
    this.socket.ev.on('call', (calls) => {
      for (const call of calls) {
        this.bus.emit('call', {
          callId: call.id,
          from: call.from,
          status: call.status as
            'offer' | 'ringing' | 'accept' | 'reject' | 'timeout',
          isVideo: call.isVideo ?? false,
          isGroup: call.isGroup ?? false,
        });
      }
    });
  }

  private bindPresence(): void {
    this.socket.ev.on('presence.update', ({ id, presences }) => {
      for (const [participantId, presenceData] of Object.entries(presences)) {
        this.bus.emit('presence', {
          chatId: id,
          participantId,
          presence: presenceData.lastKnownPresence ?? 'unavailable',
        });
      }
    });
  }

  private bindChats(): void {
    this.socket.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        if (!chat.id) {
          continue;
        }

        this.bus.emit('chat.upserted', {
          chatId: chat.id,
          name: chat.name ?? undefined,
          unreadCount: chat.unreadCount ?? undefined,
        });
      }
    });

    this.socket.ev.on('chats.update', (updates) => {
      for (const update of updates) {
        if (!update.id) {
          continue;
        }

        this.bus.emit('chat.updated', { chatId: update.id });
      }
    });

    this.socket.ev.on('chats.delete', (chatIds) => {
      for (const chatId of chatIds) {
        this.bus.emit('chat.deleted', { chatId });
      }
    });
  }

  private bindContacts(): void {
    this.socket.ev.on('contacts.upsert', (contacts) => {
      for (const contact of contacts) {
        this.bus.emit('contact.upserted', {
          jid: contact.id,
          name: contact.name ?? contact.notify ?? undefined,
        });
      }
    });

    this.socket.ev.on('contacts.update', (updates) => {
      for (const update of updates) {
        if (!update.id) {
          continue;
        }

        this.bus.emit('contact.updated', { jid: update.id });
      }
    });
  }

  private bindBlocklist(): void {
    this.socket.ev.on('blocklist.set', ({ blocklist }) => {
      this.bus.emit('blocklist.updated', { blocklist, type: 'set' });
    });

    this.socket.ev.on('blocklist.update', ({ blocklist, type }) => {
      this.bus.emit('blocklist.updated', { blocklist, type });
    });
  }
}
