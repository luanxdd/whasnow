export interface ReconnectionPolicy {
  delayFor(attempt: number): number;

  shouldReconnect(error: unknown, attempt: number): boolean;
}

interface StatusCodeError {
  output?: {
    statusCode?: number;
  };
}

export class ExponentialBackoff implements ReconnectionPolicy {
  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs: number,
  ) {}

  delayFor(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * 2 ** attempt;

    const jitter = Math.random() * 1_000;

    return Math.min(exponentialDelay + jitter, 60_000);
  }

  shouldReconnect(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }

    const statusCode = (error as StatusCodeError | undefined)?.output
      ?.statusCode;

    return statusCode !== 401 && statusCode !== 403;
  }
}
