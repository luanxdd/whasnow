export class CommandRouter {
    byName = new Map();
    lastRunAt = new Map();
    caseSensitive;
    onBlocked;
    prefix;
    constructor(options = {}) {
        this.prefix = options.prefix ?? '!';
        this.caseSensitive =
            options.caseSensitive ?? false;
        this.onBlocked = options.onBlocked;
    }
    register(command) {
        this.byName.set(this.normalize(command.name), command);
        for (const alias of command.aliases ?? []) {
            this.byName.set(this.normalize(alias), command);
        }
        return this;
    }
    registerMany(commands) {
        for (const command of commands) {
            this.register(command);
        }
        return this;
    }
    find(name) {
        return this.byName.get(this.normalize(name));
    }
    list() {
        return [
            ...new Set(this.byName.values()),
        ];
    }
    handle = async (ctx) => {
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
        if (command.onlyGroup &&
            !ctx.isGroup) {
            await this.onBlocked?.(ctx, 'group', command);
            return;
        }
        if (command.onlyAdmin &&
            !(await ctx.senderIsAdmin())) {
            await this.onBlocked?.(ctx, 'admin', command);
            return;
        }
        if (command.cooldownMs) {
            const key = `${this.normalize(command.name)}:${ctx.from.jid}`;
            const last = this.lastRunAt.get(key) ?? 0;
            const now = Date.now();
            if (now - last <
                command.cooldownMs) {
                await this.onBlocked?.(ctx, 'cooldown', command);
                return;
            }
            this.lastRunAt.set(key, now);
        }
        await command.execute(ctx, args);
    };
    normalize(name) {
        return this.caseSensitive
            ? name
            : name.toLowerCase();
    }
}
