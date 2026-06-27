import type { Context } from './context.js';

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
    args: string[],
  ) => void | Promise<void>;
}

export interface CommandRouterOptions {
  caseSensitive?: boolean;

  onBlocked?: (
    ctx: Context,
    reason: UnauthorizedReason,
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
  private readonly onBlocked?: CommandRouterOptions['onBlocked'];
  private readonly prefix: string;

  constructor(
    options: CommandRouterOptions = {},
  ) {
    this.prefix = options.prefix ?? '!';
    this.caseSensitive =
      options.caseSensitive ?? false;
    this.onBlocked = options.onBlocked;
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
      await this.onBlocked?.(
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
      await this.onBlocked?.(
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
        await this.onBlocked?.(
          ctx,
          'cooldown',
          command,
        );

        return;
      }

      this.lastRunAt.set(key, now);
    }

    await command.execute(ctx, args);
  };

  private normalize(
    name: string,
  ): string {
    return this.caseSensitive
      ? name
      : name.toLowerCase();
  }
}