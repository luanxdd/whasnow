import { Member } from './member.js';
import { resolveMedia } from '../utils/media.js';
export class Group {
    socket;
    id;
    muteStore;
    metadataCache;
    constructor(socket, id, muteStore, metadataCache) {
        this.socket = socket;
        this.id = id;
        this.muteStore = muteStore;
        this.metadataCache = metadataCache;
    }
    member(jid) {
        return new Member(this.socket, this.id, jid, this.muteStore);
    }
    async members() {
        const { participants } = await this.metadata();
        return participants.map(({ id }) => this.member(id));
    }
    async admins() {
        const { participants } = await this.metadata();
        return participants
            .filter(({ admin }) => admin === 'admin' ||
            admin === 'superadmin')
            .map(({ id }) => this.member(id));
    }
    async isAdmin(jid) {
        const { participants } = await this.metadata();
        const participant = participants.find((member) => member.id === jid);
        return (participant?.admin === 'admin' ||
            participant?.admin === 'superadmin');
    }
    mutedMembers() {
        return this.muteStore?.listMuted(this.id) ?? [];
    }
    async metadata() {
        const cached = this.metadataCache?.get(this.id);
        if (cached) {
            return cached;
        }
        return this.refresh();
    }
    async refresh() {
        const metadata = await this.socket.groupMetadata(this.id);
        this.metadataCache?.set(this.id, metadata);
        return metadata;
    }
    setName(name) {
        return this.socket.groupUpdateSubject(this.id, name);
    }
    setDescription(description) {
        return this.socket.groupUpdateDescription(this.id, description);
    }
    async setProfilePicture(source) {
        const buffer = await resolveMedia(source);
        await this.socket.updateProfilePicture(this.id, buffer);
    }
    removeProfilePicture() {
        return this.socket.removeProfilePicture(this.id);
    }
    setLocked(locked) {
        return this.socket.groupSettingUpdate(this.id, locked ? 'locked' : 'unlocked');
    }
    setAnnouncementOnly(enabled) {
        return this.socket.groupSettingUpdate(this.id, enabled
            ? 'announcement'
            : 'not_announcement');
    }
    close() {
        return this.setAnnouncementOnly(true);
    }
    open() {
        return this.setAnnouncementOnly(false);
    }
    async inviteLink() {
        const code = await this.socket.groupInviteCode(this.id);
        return code
            ? `https://chat.whatsapp.com/${code}`
            : '';
    }
    async revokeInviteLink() {
        const code = await this.socket.groupRevokeInvite(this.id);
        return code
            ? `https://chat.whatsapp.com/${code}`
            : '';
    }
    leave() {
        return this.socket.groupLeave(this.id);
    }
    async add(participants) {
        await this.socket.groupParticipantsUpdate(this.id, participants, 'add');
    }
}
