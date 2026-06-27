import type { WASocket } from '@whiskeysockets/baileys';
import type { MuteOptions, MuteStore } from '../stores/mute-store.js';
import type { Jid } from '../types/common.js';
export declare class Member {
    private readonly socket;
    private readonly groupId;
    readonly jid: Jid;
    private readonly muteStore?;
    constructor(socket: WASocket, groupId: Jid, jid: Jid, muteStore?: MuteStore | undefined);
    get phone(): string;
    promote(): Promise<void>;
    demote(): Promise<void>;
    remove(): Promise<void>;
    mute(options?: MuteOptions): void;
    unmute(): void;
    isMuted(): boolean;
    private requireMuteStore;
}
