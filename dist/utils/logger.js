import pino from 'pino';
export function createLogger(level = 'warn') {
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
