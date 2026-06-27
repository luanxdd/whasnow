import { type WASocket } from '@whiskeysockets/baileys';
import type { GroupMetadataCache } from '../entities/group-metadata-cache.js';
import type { EventBus } from './bus.js';
export declare class SocketEventAdapter {
    private readonly socket;
    private readonly bus;
    private readonly metadataCache;
    constructor(socket: WASocket, bus: EventBus, metadataCache: GroupMetadataCache);
    bind(): void;
    private bindGroups;
    private bindMessages;
    private bindPresence;
}
