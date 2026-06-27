import { FileSessionStore } from '../auth/session-store.js';
import { ConnectionManager } from '../connection/connection-manager.js';
import { RateLimiter } from '../connection/rate-limiter.js';
import { ExponentialBackoff } from '../connection/reconnection-policy.js';
import { createSocket } from '../connection/socket-factory.js';
import { Chat } from '../entities/chat.js';
import { Contact } from '../entities/contact.js';
import { Group } from '../entities/group.js';
import { GroupMetadataCache } from '../entities/group-metadata-cache.js';
import { EventBus } from '../events/bus.js';
import { SocketEventAdapter } from '../events/socket-adapter.js';
import { MessageStore } from '../messaging/message-store.js';
import { MuteStore } from '../stores/mute-store.js';
import { defaultConfig } from '../types/config.js';
import { AlreadyStartedError, ConnectionError, NotStartedError, PairingCodeError, ReplyTimeoutError, } from '../errors/index.js';
import { createLogger } from '../utils/logger.js';
import { CommandRouter, } from './command-router.js';
import { Context } from './context.js';
export class Client {
    socket = null;
    config;
    bus;
    logger;
    session;
    connection;
    messageStore = new MessageStore();
    muteStore;
    metadataCache = new GroupMetadataCache();
    rateLimiter;
    handlers = [];
    middlewares = [];
    started = false;
    constructor(config) {
        this.config = {
            ...defaultConfig,
            ...config,
        };
        this.logger = createLogger(this.config.logLevel);
        this.bus = new EventBus();
        this.session = new FileSessionStore(this.config.authDir);
        this.muteStore = new MuteStore(this.config.moderationDbPath);
        this.rateLimiter = new RateLimiter(this.config.sendIntervalMs);
        const policy = new ExponentialBackoff(this.config.maxReconnectAttempts, this.config.reconnectBaseDelayMs);
        this.connection = new ConnectionManager(this.bus, policy, this.logger, () => this.connect());
    }
    on(event, listener) {
        this.bus.on(event, listener);
        return this;
    }
    off(event, listener) {
        this.bus.off(event, listener);
        return this;
    }
    once(event, listener) {
        this.bus.once(event, listener);
        return this;
    }
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    onMessage(handler) {
        this.handlers.push(handler);
        return this;
    }
    offMessage(handler) {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
        }
        return this;
    }
    commands(options) {
        const router = new CommandRouter(options);
        this.onMessage(router.handle);
        return router;
    }
    waitForReply(options = {}) {
        const { timeoutMs = 60_000, fromJid, filter, } = options;
        return new Promise((resolve, reject) => {
            let settled = false;
            const settle = (action) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                this.offMessage(handler);
                action();
            };
            const handler = (ctx) => {
                if (settled) {
                    return;
                }
                if (fromJid && ctx.from.jid !== fromJid) {
                    return;
                }
                if (filter && !filter(ctx)) {
                    return;
                }
                settle(() => resolve(ctx));
            };
            const timer = setTimeout(() => {
                settle(() => reject(new ReplyTimeoutError(timeoutMs)));
            }, timeoutMs);
            this.onMessage(handler);
        });
    }
    async start() {
        if (this.started) {
            throw new AlreadyStartedError();
        }
        this.started = true;
        await this.connect();
    }
    async stop() {
        this.connection.destroy();
        this.started = false;
    }
    waitUntilReady(options = {}) {
        if (this.isConnected) {
            return Promise.resolve();
        }
        const { timeoutMs } = options;
        return new Promise((resolve, reject) => {
            let timer;
            const onReady = () => {
                if (timer) {
                    clearTimeout(timer);
                }
                resolve();
            };
            this.bus.once('ready', onReady);
            if (timeoutMs) {
                timer = setTimeout(() => {
                    this.bus.off('ready', onReady);
                    reject(new ConnectionError(`The connection was not ready in ${timeoutMs}ms.`));
                }, timeoutMs);
            }
        });
    }
    async requestPairingCode(phone) {
        if (!this.socket) {
            throw new NotStartedError('requestPairingCode()');
        }
        const number = (phone ?? this.config.phoneNumber).replace(/\D/g, '');
        const code = await this.socket.requestPairingCode(number);
        this.bus.emit('pairing.code', {
            code,
            phoneNumber: number,
        });
        return code;
    }
    chat(jid) {
        this.assertStarted();
        return new Chat(this.socket, jid, this.rateLimiter);
    }
    group(jid) {
        this.assertStarted();
        return new Group(this.socket, jid, this.muteStore, this.metadataCache);
    }
    contact(jid) {
        this.assertStarted();
        return new Contact(this.socket, jid);
    }
    async groups() {
        this.assertStarted();
        const result = await this.socket.groupFetchAllParticipating();
        return Object.keys(result).map((id) => new Group(this.socket, id, this.muteStore, this.metadataCache));
    }
    async createGroup(name, participants) {
        this.assertStarted();
        const result = await this.socket.groupCreate(name, participants);
        return new Group(this.socket, result.id, this.muteStore, this.metadataCache);
    }
    async joinGroup(inviteCodeOrLink) {
        this.assertStarted();
        const code = inviteCodeOrLink.split('/').pop() ??
            inviteCodeOrLink;
        const result = await this.socket.groupAcceptInvite(code);
        return new Group(this.socket, result, this.muteStore, this.metadataCache);
    }
    get isConnected() {
        return (this.socket?.ws?.readyState ===
            1);
    }
    get userJid() {
        return this.socket?.user?.id;
    }
    async connect() {
        const { state, persist } = await this.session.load();
        this.socket = await createSocket(this.config, state, this.logger, this.messageStore);
        const socket = this.socket;
        socket.ev.on('creds.update', persist);
        this.connection.attach(socket);
        new SocketEventAdapter(socket, this.bus, this.metadataCache).bind();
        let pairingCodePrinted = false;
        let pairingReconnectTimer = null;
        const schedulePairingReconnect = () => {
            if (pairingReconnectTimer) {
                return;
            }
            pairingReconnectTimer = setTimeout(() => {
                pairingReconnectTimer = null;
                void this.connect();
            }, 45_000);
        };
        const tryRequestPairingCode = async () => {
            if (state.creds.registered ||
                pairingCodePrinted) {
                return;
            }
            pairingCodePrinted = true;
            try {
                await this.requestPairingCode();
            }
            catch (err) {
                pairingCodePrinted = false;
                const statusCode = err?.output?.statusCode;
                if (statusCode === 428) {
                    this.logger.warn('The connection was not ready for pairing. Trying again in 45s...');
                    schedulePairingReconnect();
                    return;
                }
                this.logger.error({ err }, 'Failed to request pairing code');
                this.bus.emit('error', new PairingCodeError(err instanceof Error
                    ? err.message
                    : String(err), statusCode, { cause: err }));
            }
        };
        socket.ev.on('connection.update', async ({ connection, qr, }) => {
            if (qr &&
                !state.creds.registered &&
                !pairingCodePrinted) {
                await tryRequestPairingCode();
            }
            if (connection === 'open') {
                pairingCodePrinted = false;
                if (pairingReconnectTimer) {
                    clearTimeout(pairingReconnectTimer);
                    pairingReconnectTimer = null;
                }
            }
        });
        socket.ev.on('messages.upsert', ({ messages }) => {
            for (const raw of messages) {
                if (raw.key.remoteJid &&
                    raw.key.id &&
                    raw.message) {
                    this.messageStore.set(raw.key.remoteJid, raw.key.id, raw.message);
                }
                if (raw.key.fromMe) {
                    continue;
                }
                const isGroup = raw.key.remoteJid?.endsWith('@g.us') ?? false;
                const senderJid = raw.key.participant ??
                    raw.key.remoteJid;
                if (isGroup &&
                    raw.key.remoteJid &&
                    senderJid &&
                    raw.message &&
                    this.muteStore.isMuted(raw.key.remoteJid, senderJid)) {
                    socket
                        .sendMessage(raw.key.remoteJid, {
                        delete: raw.key,
                    })
                        .catch((err) => {
                        this.logger.error({ err }, 'Failed to delete muted user message');
                    });
                    continue;
                }
                const ctx = new Context(socket, raw, {
                    muteStore: this.muteStore,
                    metadataCache: this.metadataCache,
                    rateLimiter: this.rateLimiter,
                    waitForReplyFn: (options) => this.waitForReply(options),
                });
                this.runMiddlewares(ctx).catch((err) => {
                    this.logger.error({ err }, 'Middleware error');
                    this.bus.emit('error', err instanceof Error
                        ? err
                        : new Error(String(err)));
                });
            }
        });
    }
    async runMiddlewares(ctx) {
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index) {
                throw new Error('next() chamado mais de uma vez no mesmo middleware.');
            }
            index = i;
            const middleware = this.middlewares[i];
            if (!middleware) {
                for (const handler of this.handlers) {
                    Promise.resolve(handler(ctx)).catch((err) => {
                        this.logger.error({ err }, 'Handler error');
                        this.bus.emit('error', err instanceof Error
                            ? err
                            : new Error(String(err)));
                    });
                }
                return;
            }
            await middleware(ctx, () => dispatch(i + 1));
        };
        await dispatch(0);
    }
    assertStarted() {
        if (!this.socket) {
            throw new NotStartedError();
        }
    }
}
