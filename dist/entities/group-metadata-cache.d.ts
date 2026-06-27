import type { GroupMetadata } from '@whiskeysockets/baileys';
import type { Jid } from '../types/common.js';
export declare class GroupMetadataCache {
    private readonly entries;
    get(jid: Jid): GroupMetadata | undefined;
    set(jid: Jid, metadata: GroupMetadata): void;
    invalidate(jid: Jid): void;
    clear(): void;
}
