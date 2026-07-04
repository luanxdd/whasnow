export class RateLimiter {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly minIntervalMs = 250) {}

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const result = await task();

      await this.wait(this.minIntervalMs);

      return result;
    });

    this.queue = run.catch(() => undefined);

    return run;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
