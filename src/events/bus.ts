import { EventEmitter } from 'node:events';

import type { WhaSnowEventMap } from '../types/events.js';

type EmitArgs<T> = T extends void ? [] : [payload: T];

export class EventBus extends EventEmitter {
  emit<K extends keyof WhaSnowEventMap>(
    event: K,
    ...args: EmitArgs<WhaSnowEventMap[K]>
  ): boolean {
    return super.emit(event as string, ...args);
  }

  on<K extends keyof WhaSnowEventMap>(
    event: K,
    listener: (payload: WhaSnowEventMap[K]) => void
  ): this {
    return super.on(event as string, listener);
  }

  once<K extends keyof WhaSnowEventMap>(
    event: K,
    listener: (payload: WhaSnowEventMap[K]) => void
  ): this {
    return super.once(event as string, listener);
  }

  off<K extends keyof WhaSnowEventMap>(
    event: K,
    listener: (payload: WhaSnowEventMap[K]) => void
  ): this {
    return super.off(event as string, listener);
  }
}