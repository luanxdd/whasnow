import type { Jid } from '../types/common.js';

export function mention(jid: Jid): string {
  return `@${jid.split('@')[0]}`;
}
