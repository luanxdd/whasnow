export abstract class WhaSnowError extends Error {

  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);

    this.name = this.constructor.name;

    const errorCtor = Error as unknown as {
      captureStackTrace?: (target: object, ctor: unknown) => void;
    };

    errorCtor.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): { name: string; code: string; message: string } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
