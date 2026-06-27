export declare abstract class WhaSnowError extends Error {
    abstract readonly code: string;
    constructor(message: string, options?: {
        cause?: unknown;
    });
    toJSON(): {
        name: string;
        code: string;
        message: string;
    };
}
