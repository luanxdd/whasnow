export function mention(jid) {
    return `@${jid.split('@')[0]}`;
}
