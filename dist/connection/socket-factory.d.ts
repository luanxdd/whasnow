import { type AuthenticationState, type WASocket } from '@whiskeysockets/baileys';
import type { MessageStore } from '../messaging/message-store.js';
import type { WhaSnowConfig } from '../types/config.js';
import type { Logger } from '../utils/logger.js';
export declare function createSocket(config: Required<WhaSnowConfig>, state: AuthenticationState, logger: Logger, messageStore: MessageStore): Promise<WASocket>;
