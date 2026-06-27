export declare class RateLimiter {
    private readonly minIntervalMs;
    private queue;
    constructor(minIntervalMs?: number);
    schedule<T>(task: () => Promise<T>): Promise<T>;
    private wait;
}
