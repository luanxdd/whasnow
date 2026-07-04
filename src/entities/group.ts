import type { GroupMetadata, WASocket } from '@whiskeysockets/baileys';

import { GroupMetadataCache } from './group-metadata-cache.js';
import { Member } from './member.js';

import { resolveMedia } from '../utils/media.js';

import type { MuteStore } from '../stores/mute-store.js';

import type {
  GroupInfo,
  GroupJoinRequest,
  GroupJoinRequestResult,
  Jid,
  MediaSource,
  MuteEntry,
} from '../types/common.js';

export class Group {
  constructor(
    private readonly socket: WASocket,

    readonly id: Jid,

    private readonly muteStore?: MuteStore,
    private readonly metadataCache?: GroupMetadataCache,
  ) {}

  member(jid: Jid): Member {
    return new Member(this.socket, this.id, jid, this.muteStore);
  }

  async members(): Promise<Member[]> {
    const { participants } = await this.metadata();

    return participants.map(({ id }) => this.member(id));
  }

  async admins(): Promise<Member[]> {
    const { participants } = await this.metadata();

    return participants
      .filter(({ admin }) => admin === 'admin' || admin === 'superadmin')
      .map(({ id }) => this.member(id));
  }

  async isAdmin(jid: Jid): Promise<boolean> {
    const { participants } = await this.metadata();

    const participant = participants.find((member) => member.id === jid);

    return (
      participant?.admin === 'admin' || participant?.admin === 'superadmin'
    );
  }

  mutedMembers(): MuteEntry[] {
    return this.muteStore?.listMuted(this.id) ?? [];
  }

  async metadata(): Promise<GroupMetadata> {
    const cached = this.metadataCache?.get(this.id);

    if (cached) {
      return cached;
    }

    return this.refresh();
  }

  async refresh(): Promise<GroupMetadata> {
    const metadata = await this.socket.groupMetadata(this.id);

    this.metadataCache?.set(this.id, metadata);

    return metadata;
  }

  async info(): Promise<GroupInfo> {
    const metadata = await this.metadata();

    return {
      id: metadata.id,
      name: metadata.subject,
      description: metadata.desc ?? null,
      owner: metadata.owner ?? null,

      createdAt: metadata.creation ? new Date(metadata.creation * 1000) : null,

      memberCount: metadata.participants.length,
      isLocked: metadata.restrict ?? false,
      isAnnouncementOnly: metadata.announce ?? false,
    };
  }

  setName(name: string): Promise<void> {
    return this.socket.groupUpdateSubject(this.id, name);
  }

  setDescription(description: string): Promise<void> {
    return this.socket.groupUpdateDescription(this.id, description);
  }

  async setProfilePicture(source: MediaSource): Promise<void> {
    const buffer = await resolveMedia(source);

    await this.socket.updateProfilePicture(this.id, buffer as Buffer);
  }

  removeProfilePicture(): Promise<void> {
    return this.socket.removeProfilePicture(this.id);
  }

  setLocked(locked: boolean): Promise<void> {
    return this.socket.groupSettingUpdate(
      this.id,
      locked ? 'locked' : 'unlocked',
    );
  }

  setAnnouncementOnly(enabled: boolean): Promise<void> {
    return this.socket.groupSettingUpdate(
      this.id,
      enabled ? 'announcement' : 'not_announcement',
    );
  }

  close(): Promise<void> {
    return this.setAnnouncementOnly(true);
  }

  open(): Promise<void> {
    return this.setAnnouncementOnly(false);
  }

  async inviteLink(): Promise<string> {
    const code = await this.socket.groupInviteCode(this.id);

    return code ? `https://chat.whatsapp.com/${code}` : '';
  }

  async revokeInviteLink(): Promise<string> {
    const code = await this.socket.groupRevokeInvite(this.id);

    return code ? `https://chat.whatsapp.com/${code}` : '';
  }

  leave(): Promise<void> {
    return this.socket.groupLeave(this.id);
  }

  async add(participants: Jid[]): Promise<void> {
    await this.socket.groupParticipantsUpdate(this.id, participants, 'add');
  }

  async joinRequests(): Promise<GroupJoinRequest[]> {
    const requests = await this.socket.groupRequestParticipantsList(this.id);

    return requests.map((request) => ({
      jid: request.jid,
      requestMethod: request.request_method,

      requestedAt: new Date(Number(request.request_time) * 1000),
    }));
  }

  approveJoinRequests(jids: Jid[]): Promise<GroupJoinRequestResult[]> {
    return this.manageJoinRequests(jids, 'approve');
  }

  rejectJoinRequests(jids: Jid[]): Promise<GroupJoinRequestResult[]> {
    return this.manageJoinRequests(jids, 'reject');
  }

  private async manageJoinRequests(
    jids: Jid[],
    action: 'approve' | 'reject',
  ): Promise<GroupJoinRequestResult[]> {
    const results = await this.socket.groupRequestParticipantsUpdate(
      this.id,
      jids,
      action,
    );

    return results.map((result) => ({
      jid: result.jid!,
      status: result.status,
    }));
  }
}
