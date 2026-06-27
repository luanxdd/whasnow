import type { WASocket } from '@whiskeysockets/baileys';
import type { Jid, PhoneNumber } from '../types/common.js';
export declare class Contact {
    private readonly socket;
    readonly jid: Jid;
    constructor(socket: WASocket, jid: Jid);
    get phone(): PhoneNumber;
    name(): Promise<string | undefined>;
    avatar(): Promise<string | undefined>;
    status(): Promise<string | undefined>;
    block(): Promise<void>;
    unblock(): Promise<void>;
    exists(): Promise<boolean>;
}
