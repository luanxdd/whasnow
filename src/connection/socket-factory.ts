import makeWASocket, {
  Browsers,
  makeCacheableSignalKeyStore,
  type AuthenticationState,
  type WASocket,
} from '@whiskeysockets/baileys';

import type { MessageStore } from '../messaging/message-store.js';

import type { WhaSnowConfig } from '../types/config.js';

import type { Logger } from '../utils/logger.js';

export async function createSocket(
  config: Required<WhaSnowConfig>,
  state: AuthenticationState,
  logger: Logger,
  messageStore: MessageStore,
): Promise<WASocket> {
  return makeWASocket({
    logger: logger.child({
      module: 'baileys',
    }),

    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger.child({
          module: 'keys',
        }),
      ),
    },

    browser: Browsers.macOS(config.browserName),

    defaultQueryTimeoutMs: 60_000,

    fireInitQueries: true,

    generateHighQualityLinkPreview: config.generateHighQualityLinkPreview,

    getMessage: async (key) => {
      if (!key.remoteJid || !key.id) {
        return undefined;
      }

      return messageStore.get(key.remoteJid, key.id);
    },

    markOnlineOnConnect: config.markOnlineOnConnect,

    printQRInTerminal: false,

    syncFullHistory: config.syncFullHistory,
  });
}
