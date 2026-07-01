import { fileURLToPath } from 'node:url';

import { ArgsParser } from './args.js';

import type { Context } from './context.js';

import {
  loadCommandsFromDirectory,
  type LoadCommandsOptions,
  type LoadCommandsResult,
} from './command-loader.js';

export type UnauthorizedReason =
  | 'group'
  | 'admin'
  | 'cooldown';

export interface CommandDefinition {
  aliases?: string[];
  cooldownMs?: number;
  description?: string;

  name: string;

  onlyAdmin?: boolean;
  onlyGroup?: boolean;

  execute: (
    ctx: Context,
    args: ArgsParser,
  ) => void | Promise<void>;
}

export type CommandMapEntry =
  | CommandDefinition['execute']
  | Omit<CommandDefinition, 'name'>;

export type CommandMap = Record<
  string,
  CommandMapEntry
>;

export interface CommandRouterOptions {
  caseSensitive?: boolean;

  notifyBlocked?: boolean;

  onBlocked?: (
    ctx: Context,
    reason: UnauthorizedReason,
    command: CommandDefinition,
  ) => void | Promise<void>;

  onError?: (
    err: unknown,
    ctx: Context,
    command: CommandDefinition,
  ) => void | Promise<void>;

  prefix?: string;
}

export class CommandRouter {
  private readonly byName = new Map<
    string,
    CommandDefinition
  >();

  private readonly lastRunAt = new Map<
    string,
    number
  >();

  private readonly caseSensitive: boolean;
  private readonly notifyBlocked: boolean;
  private readonly onBlocked?: CommandRouterOptions['onBlocked'];
  private readonly onError?: CommandRouterOptions['onError'];
  private readonly prefix: string;

  constructor(
    options: CommandRouterOptions = {},
  ) {
    this.prefix = options.prefix ?? '!';
    this.caseSensitive =
      options.caseSensitive ?? false;
    this.notifyBlocked =
      options.notifyBlocked ?? true;
    this.onBlocked = options.onBlocked;
    this.onError = options.onError;
  }

  register(
    command: CommandDefinition,
  ): this {
    this.byName.set(
      this.normalize(command.name),
      command,
    );

    for (const alias of command.aliases ?? []) {
      this.byName.set(
        this.normalize(alias),
        command,
      );
    }

    return this;
  }

  registerMany(
    commands: CommandDefinition[],
  ): this {
    for (const command of commands) {
      this.register(command);
    }

    return this;
  }

  registerMap(
    commands: CommandMap,
  ): this {
    for (const [name, value] of Object.entries(
      commands,
    )) {
      if (typeof value === 'function') {
        this.register({
          name,
          execute: value,
        });

        continue;
      }

      this.register({
        ...value,
        name,
      });
    }

    return this;
  }

  async loadCommands(
    dir: string | URL,
    options?: LoadCommandsOptions,
  ): Promise<LoadCommandsResult> {
    const path =
      dir instanceof URL ? fileURLToPath(dir) : dir;

    const result = await loadCommandsFromDirectory(
      path,
      options,
    );

    this.registerMany(result.commands);

    return result;
  }

  find(
    name: string,
  ): CommandDefinition | undefined {
    return this.byName.get(
      this.normalize(name),
    );
  }

  list(): CommandDefinition[] {
    return [
      ...new Set(this.byName.values()),
    ];
  }

  handle = async (
    ctx: Context,
  ): Promise<void> => {
    const text = ctx.message.text.trim();

    if (!text.startsWith(this.prefix)) {
      return;
    }

    const [rawName, ...args] = text
      .slice(this.prefix.length)
      .trim()
      .split(/\s+/);

    if (!rawName) {
      return;
    }

    const command = this.find(rawName);

    if (!command) {
      return;
    }

    if (
      command.onlyGroup &&
      !ctx.isGroup
    ) {
      await this.notifyBlockedReason(
        ctx,
        'group',
        command,
      );

      return;
    }

    if (
      command.onlyAdmin &&
      !(await ctx.senderIsAdmin())
    ) {
      await this.notifyBlockedReason(
        ctx,
        'admin',
        command,
      );

      return;
    }

    if (command.cooldownMs) {
      const key = `${this.normalize(command.name)}:${ctx.from.jid}`;

      const last =
        this.lastRunAt.get(key) ?? 0;

      const now = Date.now();

      if (
        now - last <
        command.cooldownMs
      ) {
        await this.notifyBlockedReason(
          ctx,
          'cooldown',
          command,
        );

        return;
      }

      this.lastRunAt.set(key, now);
    }

    try {
      await command.execute(
        ctx,
        new ArgsParser(args),
      );
    } catch (err) {
      if (!this.onError) {
        throw err;
      }

      await this.onError(
        err,
        ctx,
        command,
      );
    }
  };

  private async notifyBlockedReason(
    ctx: Context,
    reason: UnauthorizedReason,
    command: CommandDefinition,
  ): Promise<void> {
    if (this.onBlocked) {
      await this.onBlocked(
        ctx,
        reason,
        command,
      );

      return;
    }

    if (!this.notifyBlocked) {
      return;
    }

    await ctx.reply(
      this.defaultBlockedMessage(reason),
    );
  }

  private defaultBlockedMessage(
    reason: UnauthorizedReason,
  ): string {
    switch (reason) {
      case 'group':
        return 'Este comando só pode ser usado em grupos.';

      case 'admin':
        return 'Apenas administradores podem usar este comando.';

      case 'cooldown':
        return 'Aguarde um pouco antes de usar este comando novamente.';
    }
  }

  private normalize(
    name: string,
  ): string {
    return this.caseSensitive
      ? name
      : name.toLowerCase();
  }
}