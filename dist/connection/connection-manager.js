import { DisconnectReason, } from '@whiskeysockets/baileys';
export class ConnectionManager {
    bus;
    policy;
    logger;
    reconnectFn;
    socket = null;
    reconnectTimer = null;
    attempt = 0;
    destroyed = false;
    constructor(bus, policy, logger, reconnectFn) {
        this.bus = bus;
        this.policy = policy;
        this.logger = logger;
        this.reconnectFn = reconnectFn;
    }
    attach(socket) {
        this.socket = socket;
        socket.ev.on('connection.update', (update) => this.handleUpdate(update));
    }
    handleUpdate(update) {
        const { connection, lastDisconnect, } = update;
        if (connection === 'open') {
            this.attempt = 0;
            this.clearTimer();
            this.bus.emit('ready', undefined);
            this.logger.info('Connected to WhatsApp');
            return;
        }
        if (connection !== 'close') {
            return;
        }
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode;
        this.logger.warn({ statusCode }, 'Connection closed');
        switch (statusCode) {
            case DisconnectReason.loggedOut:
                this.bus.emit('disconnected', {
                    reason: 'logged_out',
                    willReconnect: false,
                    attempt: this.attempt,
                });
                return;
            case DisconnectReason.restartRequired:
                this.scheduleReconnect(0);
                return;
        }
        if (this.policy.shouldReconnect(error, this.attempt)) {
            this.scheduleReconnect(this.policy.delayFor(this.attempt));
            return;
        }
        this.bus.emit('disconnected', {
            reason: String(error?.message ??
                'unknown'),
            willReconnect: false,
            attempt: this.attempt,
        });
    }
    scheduleReconnect(delayMs) {
        if (this.destroyed) {
            return;
        }
        this.clearTimer();
        this.reconnectTimer = setTimeout(async () => {
            this.attempt++;
            this.bus.emit('reconnecting', {
                attempt: this.attempt,
            });
            this.logger.info({
                attempt: this.attempt,
            }, 'Reconnecting...');
            await this.reconnectFn();
        }, delayMs);
    }
    clearTimer() {
        if (!this.reconnectTimer) {
            return;
        }
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }
    destroy() {
        this.destroyed = true;
        this.clearTimer();
        this.socket?.end(undefined);
    }
}
