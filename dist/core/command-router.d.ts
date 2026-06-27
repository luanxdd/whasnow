import type { Context } from './context.js';
export type UnauthorizedReason = 'group' | 'admin' | 'cooldown';
export interface CommandDefinition {
    aliases?: string[];
    cooldownMs?: number;
    description?: string;
    name: string;
    onlyAdmin?: boolean;
    onlyGroup?: boolean;
    execute: (ctx: Context, args: string[]) => void | Promise<void>;
}
export interface CommandRouterOptions {
    caseSensitive?: boolean;
    onBlocked?: (ctx: Context, reason: UnauthorizedReason, command: CommandDefinition) => void | Promise<void>;
    prefix?: string;
}
export declare class CommandRouter {
    private readonly byName;
    private readonly lastRunAt;
    private readonly caseSensitive;
    private readonly onBlocked?;
    private readonly prefix;
    constructor(options?: CommandRouterOptions);
    register(command: CommandDefinition): this;
    registerMany(commands: CommandDefinition[]): this;
    find(name: string): CommandDefinition | undefined;
    list(): CommandDefinition[];
    handle: (ctx: Context) => Promise<void>;
    private normalize;
}
