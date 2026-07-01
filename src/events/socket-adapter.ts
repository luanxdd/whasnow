import {
  getAggregateVotesInPollMessage,
  proto,
  type WASocket,
} from '@whiskeysockets/baileys';

import type {
  GroupMetadataCache,
} from '../entities/group-metadata-cache.js';

import type {
  PollStore,
} from '../messaging/poll-store.js';

import type {
  EventBus,
} from './bus.js';

const STATUS_BROADCAST_JID =
  'status@broadcast';

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
  }

  private bindGroups(): void {
    this.socket.ev.on(
      'group-participants.update',
      (update) => {
        this.metadataCache.invalidate(
          update.id,
        );

        this.bus.emit(
          'group.participant',
          {
            groupId: update.id,
            action: update.action as
              | 'add'
              | 'remove'
              | 'promote'
              | 'demote',
            participants:
              update.participants.map(
                (participant) =>
                  typeof participant ===
                  'string'
                    ? participant
                    : (participant as any)
                        .id ??
                      participant,
              ),
          },
        );
      },
    );

    this.socket.ev.on(
      'groups.update',
      (updates) => {
        for (const update of updates) {
          if (update.id) {
            this.metadataCache.invalidate(
              update.id,
            );
          }

          this.bus.emit(
            'group.updated',
            {
              groupId:
                update.id ?? '',
              metadata: update,
            },
          );
        }
      },
    );
  }

  private bindMessages(): void {
    this.socket.ev.on(
      'messages.upsert',
      ({ messages }) => {
        for (const message of messages) {
          const protocolMessage =
            message.message
              ?.protocolMessage;

          if (
            protocolMessage?.type ===
              proto.Message
                .ProtocolMessage.Type
                .REVOKE &&
            protocolMessage.key
          ) {
            this.bus.emit(
              'message.deleted',
              {
                chatId:
                  protocolMessage.key
                    .remoteJid ?? '',
                messageId:
                  protocolMessage.key
                    .id ?? '',
              },
            );

            continue;
          }

          if (
            message.key.remoteJid ===
              STATUS_BROADCAST_JID &&
            !message.key.fromMe
          ) {
            this.bus.emit(
              'status.posted',
              {
                statusId:
                  message.key.id ?? '',
                from:
                  message.key
                    .participant ?? '',
                isMedia: Boolean(
                  message.message
                    ?.imageMessage ||
                    message.message
                      ?.videoMessage,
                ),
              },
            );

            continue;
          }

          if (message.key.fromMe) {
            continue;
          }

          const chatId =
            message.key.remoteJid ?? '';

          const senderId =
            message.key.participant ??
            chatId;

          const timestamp =
            Number(
              message.messageTimestamp ??
                0,
            ) * 1000;

          this.bus.emit('message', {
            chatId,
            senderId,
            timestamp,
            isGroup:
              chatId.endsWith(
                '@g.us',
              ),
          });
        }
      },
    );

    this.socket.ev.on(
      'messages.update',
      (updates) => {
        for (const update of updates) {
          if (
            update.update
              ?.pollUpdates?.length
          ) {
            this.handlePollUpdates(
              update.key,
              update.update.pollUpdates,
            );
          }

          if (
            !update.update?.message
          ) {
            continue;
          }

          this.bus.emit(
            'message.edited',
            {
              chatId:
                update.key
                  .remoteJid ?? '',
              messageId:
                update.key.id ?? '',
            },
          );
        }
      },
    );
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
      const updatedCreation =
        this.pollStore.addVote(
          pollMessageId,
          update,
        );

      const voterJid =
        update.pollUpdateMessageKey
          ?.participant ??
        update.pollUpdateMessageKey
          ?.remoteJid ??
        '';

      if (
        !updatedCreation ||
        !voterJid
      ) {
        continue;
      }

      const aggregated =
        getAggregateVotesInPollMessage(
          {
            message:
              updatedCreation.message,
            pollUpdates:
              updatedCreation.pollUpdates ??
              [],
          },
        );

      const selectedOptions =
        aggregated
          .filter((option) =>
            option.voters.includes(
              voterJid,
            ),
          )
          .map(
            (option) =>
              option.name,
          );

      this.bus.emit(
        'poll.vote',
        {
          chatId:
            key.remoteJid ?? '',
          pollMessageId,
          voterJid,
          selectedOptions,
        },
      );
    }
  }

  private bindCalls(): void {
    this.socket.ev.on(
      'call',
      (calls) => {
        for (const call of calls) {
          this.bus.emit('call', {
            callId: call.id,
            from: call.from,
            status: call.status as
              | 'offer'
              | 'ringing'
              | 'accept'
              | 'reject'
              | 'timeout',
            isVideo:
              call.isVideo ??
              false,
            isGroup:
              call.isGroup ??
              false,
          });
        }
      },
    );
  }

  private bindPresence(): void {
    this.socket.ev.on(
      'presence.update',
      ({ id, presences }) => {
        for (const [
          participantId,
          presenceData,
        ] of Object.entries(
          presences,
        )) {
          this.bus.emit(
            'presence',
            {
              chatId: id,
              participantId,
              presence:
                presenceData.lastKnownPresence ??
                'unavailable',
            },
          );
        }
      },
    );
  }
}