export class MessageStore {
    maxSize;
    map = new Map();
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
    }
    get(remoteJid, id) {
        return this.map.get(this.key(remoteJid, id));
    }
    set(remoteJid, id, message) {
        const key = this.key(remoteJid, id);
        this.map.delete(key);
        this.map.set(key, message);
        if (this.map.size > this.maxSize) {
            const oldest = this.map.keys().next().value;
            if (oldest !== undefined) {
                this.map.delete(oldest);
            }
        }
    }
    key(remoteJid, id) {
        return `${remoteJid}:${id}`;
    }
}
