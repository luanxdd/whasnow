import { type WASocket } from '@whiskeysockets/baileys';
import type { EventBus } from '../events/bus.js';
import type { Logger } from '../utils/logger.js';
import type { ReconnectionPolicy } from './reconnection-policy.js';
export declare class ConnectionManager {
    private readonly bus;
    private readonly policy;
    private readonly logger;
    private readonly reconnectFn;
    private socket;
    private reconnectTimer;
    private attempt;
    private destroyed;
    constructor(bus: EventBus, policy: ReconnectionPolicy, logger: Logger, reconnectFn: () => Promise<void>);
    attach(socket: WASocket): void;
    private handleUpdate;
    private scheduleReconnect;
    private clearTimer;
    destroy(): void;
}
