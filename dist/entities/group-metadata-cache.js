export class GroupMetadataCache {
    entries = new Map();
    get(jid) {
        return this.entries.get(jid);
    }
    set(jid, metadata) {
        this.entries.set(jid, metadata);
    }
    invalidate(jid) {
        this.entries.delete(jid);
    }
    clear() {
        this.entries.clear();
    }
}
