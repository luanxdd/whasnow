import { EventEmitter } from 'node:events';
export class EventBus extends EventEmitter {
    emit(event, payload) {
        return super.emit(event, payload);
    }
    off(event, listener) {
        return super.off(event, listener);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    once(event, listener) {
        return super.once(event, listener);
    }
}
