import type { proto } from '@whiskeysockets/baileys';
export declare class MessageStore {
    private readonly maxSize;
    private readonly map;
    constructor(maxSize?: number);
    get(remoteJid: string, id: string): proto.IMessage | undefined;
    set(remoteJid: string, id: string, message: proto.IMessage): void;
    private key;
}
