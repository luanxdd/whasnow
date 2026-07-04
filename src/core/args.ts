import { InvalidArgumentError, MissingArgumentError } from '../errors/index.js';

export interface ArgOptions<T> {
  default?: T;
  optional?: boolean;
}

const TRUTHY = ['sim', 's', 'true', '1'];

const FALSY = ['nao', 'não', 'n', 'false', '0'];

export class ArgsParser {
  private cursor = 0;

  constructor(private readonly tokens: string[]) {}

  string(name: string, options: ArgOptions<string> = {}): string {
    const value = this.tokens[this.cursor];

    this.cursor++;

    if (value !== undefined) {
      return value;
    }

    return this.resolveMissing(name, options);
  }

  number(name: string, options: ArgOptions<number> = {}): number {
    const raw = this.tokens[this.cursor];

    this.cursor++;

    if (raw === undefined) {
      return this.resolveMissing(name, options);
    }

    const value = Number(raw);

    if (Number.isNaN(value)) {
      throw new InvalidArgumentError(name, raw, 'number');
    }

    return value;
  }

  boolean(name: string, options: ArgOptions<boolean> = {}): boolean {
    const raw = this.tokens[this.cursor];

    this.cursor++;

    if (raw === undefined) {
      return this.resolveMissing(name, options);
    }

    const normalized = raw.toLowerCase();

    if (TRUTHY.includes(normalized)) {
      return true;
    }

    if (FALSY.includes(normalized)) {
      return false;
    }

    throw new InvalidArgumentError(name, raw, 'boolean');
  }

  rest(name: string, options: ArgOptions<string> = {}): string {
    const value = this.tokens.slice(this.cursor).join(' ');

    this.cursor = this.tokens.length;

    if (value) {
      return value;
    }

    return this.resolveMissing(name, options);
  }

  remaining(): string[] {
    return this.tokens.slice(this.cursor);
  }

  get raw(): string[] {
    return this.tokens;
  }

  private resolveMissing<T>(name: string, options: ArgOptions<T>): T {
    if (options.default !== undefined) {
      return options.default;
    }

    if (options.optional) {
      return undefined as T;
    }

    throw new MissingArgumentError(name);
  }
}
