import { ModerationStoreUnavailableError } from '../errors/index.js';
export class Member {
    socket;
    groupId;
    jid;
    muteStore;
    constructor(socket, groupId, jid, muteStore) {
        this.socket = socket;
        this.groupId = groupId;
        this.jid = jid;
        this.muteStore = muteStore;
    }
    get phone() {
        return this.jid.split('@')[0] ?? '';
    }
    async promote() {
        await this.socket.groupParticipantsUpdate(this.groupId, [this.jid], 'promote');
    }
    async demote() {
        await this.socket.groupParticipantsUpdate(this.groupId, [this.jid], 'demote');
    }
    async remove() {
        await this.socket.groupParticipantsUpdate(this.groupId, [this.jid], 'remove');
    }
    mute(options = {}) {
        this.requireMuteStore().mute(this.groupId, this.jid, options);
    }
    unmute() {
        this.requireMuteStore().unmute(this.groupId, this.jid);
    }
    isMuted() {
        return this.muteStore?.isMuted(this.groupId, this.jid) ?? false;
    }
    requireMuteStore() {
        if (!this.muteStore) {
            throw new ModerationStoreUnavailableError();
        }
        return this.muteStore;
    }
}
