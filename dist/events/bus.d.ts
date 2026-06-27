import { EventEmitter } from 'node:events';
import type { WhaSnowEventMap } from '../types/events.js';
export declare class EventBus extends EventEmitter {
    emit<K extends keyof WhaSnowEventMap>(event: K, payload: WhaSnowEventMap[K]): boolean;
    off<K extends keyof WhaSnowEventMap>(event: K, listener: (payload: WhaSnowEventMap[K]) => void): this;
    on<K extends keyof WhaSnowEventMap>(event: K, listener: (payload: WhaSnowEventMap[K]) => void): this;
    once<K extends keyof WhaSnowEventMap>(event: K, listener: (payload: WhaSnowEventMap[K]) => void): this;
}
