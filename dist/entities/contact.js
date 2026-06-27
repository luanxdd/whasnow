export class Contact {
    socket;
    jid;
    constructor(socket, jid) {
        this.socket = socket;
        this.jid = jid;
    }
    get phone() {
        return this.jid.split('@')[0] ?? '';
    }
    async name() {
        try {
            const results = await this.socket.onWhatsApp(this.phone);
            const info = results?.[0];
            return info?.notify;
        }
        catch {
            return undefined;
        }
    }
    async avatar() {
        try {
            return await this.socket.profilePictureUrl(this.jid, 'image');
        }
        catch {
            return undefined;
        }
    }
    async status() {
        try {
            const result = await this.socket.fetchStatus(this.jid);
            return result?.status;
        }
        catch {
            return undefined;
        }
    }
    block() {
        return this.socket.updateBlockStatus(this.jid, 'block');
    }
    unblock() {
        return this.socket.updateBlockStatus(this.jid, 'unblock');
    }
    async exists() {
        try {
            const results = await this.socket.onWhatsApp(this.phone);
            const info = results?.[0];
            return Boolean(info?.exists);
        }
        catch {
            return false;
        }
    }
}
