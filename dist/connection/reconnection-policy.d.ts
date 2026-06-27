export interface ReconnectionPolicy {
    delayFor(attempt: number): number;
    shouldReconnect(error: unknown, attempt: number): boolean;
}
export declare class ExponentialBackoff implements ReconnectionPolicy {
    private readonly maxAttempts;
    private readonly baseDelayMs;
    constructor(maxAttempts: number, baseDelayMs: number);
    delayFor(attempt: number): number;
    shouldReconnect(error: unknown, attempt: number): boolean;
}
