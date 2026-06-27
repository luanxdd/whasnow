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
    logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
    moderationDbPath?: string;
}
export declare const defaultConfig: Required<WhaSnowConfig>;
