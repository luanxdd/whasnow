export class RateLimiter {
    minIntervalMs;
    queue = Promise.resolve();
    constructor(minIntervalMs = 250) {
        this.minIntervalMs = minIntervalMs;
    }
    schedule(task) {
        const run = this.queue.then(async () => {
            const result = await task();
            await this.wait(this.minIntervalMs);
            return result;
        });
        this.queue = run.catch(() => undefined);
        return run;
    }
    wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
