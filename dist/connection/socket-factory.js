import makeWASocket, { Browsers, makeCacheableSignalKeyStore, } from '@whiskeysockets/baileys';
export async function createSocket(config, state, logger, messageStore) {
    return makeWASocket({
        logger: logger.child({
            module: 'baileys',
        }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger.child({
                module: 'keys',
            })),
        },
        browser: Browsers.macOS(config.browserName),
        defaultQueryTimeoutMs: 60_000,
        fireInitQueries: true,
        generateHighQualityLinkPreview: config.generateHighQualityLinkPreview,
        getMessage: async (key) => {
            if (!key.remoteJid ||
                !key.id) {
                return undefined;
            }
            return messageStore.get(key.remoteJid, key.id);
        },
        markOnlineOnConnect: config.markOnlineOnConnect,
        printQRInTerminal: false,
        syncFullHistory: config.syncFullHistory,
    });
}
