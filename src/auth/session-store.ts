import { existsSync } from 'node:fs';

import { mkdir, rm } from 'node:fs/promises';

import {
  useMultiFileAuthState,
  type AuthenticationState,
} from '@whiskeysockets/baileys';

export interface SessionStore {
  destroy(): Promise<void>;

  load(): Promise<{
    state: AuthenticationState;
    persist: () => Promise<void>;
  }>;
}

export class FileSessionStore implements SessionStore {
  constructor(private readonly dir: string) {}

  async destroy(): Promise<void> {
    if (!existsSync(this.dir)) {
      return;
    }

    await rm(this.dir, {
      recursive: true,
      force: true,
    });
  }

  async load(): Promise<{
    state: AuthenticationState;
    persist: () => Promise<void>;
  }> {
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, {
        recursive: true,
      });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.dir);

    return {
      state,
      persist: saveCreds,
    };
  }
}
