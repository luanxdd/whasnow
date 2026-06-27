export class ExponentialBackoff {
    maxAttempts;
    baseDelayMs;
    constructor(maxAttempts, baseDelayMs) {
        this.maxAttempts = maxAttempts;
        this.baseDelayMs = baseDelayMs;
    }
    delayFor(attempt) {
        const exponentialDelay = this.baseDelayMs * 2 ** attempt;
        const jitter = Math.random() * 1_000;
        return Math.min(exponentialDelay + jitter, 60_000);
    }
    shouldReconnect(error, attempt) {
        if (attempt >= this.maxAttempts) {
            return false;
        }
        const statusCode = error?.output?.statusCode;
        return (statusCode !== 401 &&
            statusCode !== 403);
    }
}
