export class WhaSnowError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        const errorCtor = Error;
        errorCtor.captureStackTrace?.(this, this.constructor);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
        };
    }
}
