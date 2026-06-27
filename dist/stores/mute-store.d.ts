import type { Jid, MuteEntry } from '../types/common.js';
export interface MuteOptions {
    duration?: number;
}
export declare class MuteStore {
    private readonly db;
    constructor(dbPath: string);
    mute(groupId: Jid, userJid: Jid, options?: MuteOptions): void;
    unmute(groupId: Jid, userJid: Jid): void;
    isMuted(groupId: Jid, userJid: Jid): boolean;
    listMuted(groupId: Jid): MuteEntry[];
    cleanup(): void;
}
