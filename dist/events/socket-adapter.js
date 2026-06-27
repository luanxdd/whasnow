import { proto, } from '@whiskeysockets/baileys';
export class SocketEventAdapter {
    socket;
    bus;
    metadataCache;
    constructor(socket, bus, metadataCache) {
        this.socket = socket;
        this.bus = bus;
        this.metadataCache = metadataCache;
    }
    bind() {
        this.bindGroups();
        this.bindMessages();
        this.bindPresence();
    }
    bindGroups() {
        this.socket.ev.on('group-participants.update', (update) => {
            this.metadataCache.invalidate(update.id);
            this.bus.emit('group.participant', {
                groupId: update.id,
                action: update.action,
                participants: update.participants.map((participant) => typeof participant ===
                    'string'
                    ? participant
                    : participant
                        .id ??
                        participant),
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
    }
    bindMessages() {
        this.socket.ev.on('messages.upsert', ({ messages }) => {
            for (const message of messages) {
                const protocolMessage = message.message
                    ?.protocolMessage;
                if (protocolMessage?.type ===
                    proto.Message
                        .ProtocolMessage.Type
                        .REVOKE &&
                    protocolMessage.key) {
                    this.bus.emit('message.deleted', {
                        chatId: protocolMessage.key
                            .remoteJid ?? '',
                        messageId: protocolMessage.key
                            .id ?? '',
                    });
                    continue;
                }
                if (message.key.fromMe) {
                    continue;
                }
                const chatId = message.key.remoteJid ?? '';
                const senderId = message.key.participant ??
                    chatId;
                const timestamp = Number(message.messageTimestamp ??
                    0) * 1000;
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
                if (!update.update?.message) {
                    continue;
                }
                this.bus.emit('message.edited', {
                    chatId: update.key
                        .remoteJid ?? '',
                    messageId: update.key.id ?? '',
                });
            }
        });
    }
    bindPresence() {
        this.socket.ev.on('presence.update', ({ id, presences }) => {
            for (const [participantId, presenceData,] of Object.entries(presences)) {
                this.bus.emit('presence', {
                    chatId: id,
                    participantId,
                    presence: presenceData.lastKnownPresence ??
                        'unavailable',
                });
            }
        });
    }
}
