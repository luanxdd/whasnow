import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(level: string = 'warn'): Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  return pino({
    level,
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true },
        },
  });
}
