import { existsSync } from 'node:fs';
import { mkdir, rm, } from 'node:fs/promises';
import { useMultiFileAuthState, } from '@whiskeysockets/baileys';
export class FileSessionStore {
    dir;
    constructor(dir) {
        this.dir = dir;
    }
    async destroy() {
        if (!existsSync(this.dir)) {
            return;
        }
        await rm(this.dir, {
            recursive: true,
            force: true,
        });
    }
    async load() {
        if (!existsSync(this.dir)) {
            await mkdir(this.dir, {
                recursive: true,
            });
        }
        const { state, saveCreds, } = await useMultiFileAuthState(this.dir);
        return {
            state,
            persist: saveCreds,
        };
    }
}
