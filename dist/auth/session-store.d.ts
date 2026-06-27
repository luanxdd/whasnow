import { type AuthenticationState } from '@whiskeysockets/baileys';
export interface SessionStore {
    destroy(): Promise<void>;
    load(): Promise<{
        state: AuthenticationState;
        persist: () => Promise<void>;
    }>;
}
export declare class FileSessionStore implements SessionStore {
    private readonly dir;
    constructor(dir: string);
    destroy(): Promise<void>;
    load(): Promise<{
        state: AuthenticationState;
        persist: () => Promise<void>;
    }>;
}
