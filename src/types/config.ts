import type { StickerDefaults } from './common.js';

export interface WhaSnowConfig {
  phoneNumber: string;

  authDir?: string;
  browserName?: string;

  markOnlineOnConnect?: boolean;
  generateHighQualityLinkPreview?: boolean;
  syncFullHistory?: boolean;

  maxReconnectAttempts?: number;
  reconnectBaseDelayMs?: number;

  sendIntervalMs?: number;

  logLevel?:
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent';

  moderationDbPath?: string;

  stickerDefaults?: StickerDefaults;
}

export const defaultConfig: Required<WhaSnowConfig> = {
  phoneNumber: '',

  authDir: './whasnow-session',
  browserName: 'Safari',

  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,

  maxReconnectAttempts: 5,
  reconnectBaseDelayMs: 3_000,

  sendIntervalMs: 250,

  logLevel: 'warn',

  moderationDbPath: './whasnow-moderation.db',

  stickerDefaults: {},
};