import type {
  WAMessage,
  WASocket,
} from '@whiskeysockets/baileys';

import { Chat } from '../entities/chat.js';
import { Contact } from '../entities/contact.js';
import { Group } from '../entities/group.js';
import type { GroupMetadataCache } from '../entities/group-metadata-cache.js';
import { Message, type PollVoteSource } from '../entities/message.js';

import type { RateLimiter } from '../connection/rate-limiter.js';

import {
  GroupContextError,
  WaitForReplyUnavailableError,
} from '../errors/index.js';

import type { MuteStore } from '../stores/mute-store.js';

import type {
  Jid,
  SendTextOptions,
  StickerDefaults,
  WaitForReplyContextOptions,
} from '../types/common.js';

export interface ContextDeps {
  muteStore?: MuteStore;
  metadataCache?: GroupMetadataCache;
  rateLimiter?: RateLimiter;
  pollStore?: PollVoteSource;
  stickerDefaults?: StickerDefaults;
  waitForReplyFn?: (
    options?: WaitForReplyContextOptions<Context>,
  ) => Promise<Context>;
}

export class Context {
  readonly chat: Chat;
  readonly from: Contact;
  readonly message: Message;

  private readonly deps: ContextDeps;

  constructor(
    private readonly socket: WASocket,
    raw: WAMessage,
    deps: ContextDeps = {},
  ) {
    this.deps = deps;

    this.message = new Message(
      socket,
      raw,
      deps.rateLimiter,
      deps.pollStore,
      deps.stickerDefaults,
    );
    this.chat = new Chat(
      socket,
      this.message.chatId,
      deps.rateLimiter,
      deps.pollStore,
      deps.stickerDefaults,
    );
    this.from = new Contact(
      socket,
      this.message.senderId,
      this.message.pushName,
    );
  }

  get isGroup(): boolean {
    return this.message.isGroup;
  }

  group(): Group | null {
    return this.isGroup
      ? new Group(
          this.socket,
          this.message.chatId,
          this.deps.muteStore,
          this.deps.metadataCache,
        )
      : null;
  }

  requireGroup(): Group {
    const group = this.group();

    if (!group) {
      throw new GroupContextError();
    }

    return group;
  }

  async senderIsAdmin(): Promise<boolean> {
    const group = this.group();

    return group
      ? group.isAdmin(this.from.jid)
      : false;
  }

  targets(): Jid[] {
    const mentioned =
      this.message.mentions;

    const quotedSender =
      this.message.quoted?.senderId;

    return [
      ...new Set([
        ...mentioned,
        ...(quotedSender
          ? [quotedSender]
          : []),
      ]),
    ];
  }

  reply(
    text: string,
    options?: SendTextOptions,
  ): Promise<Message> {
    return this.message.reply(
      text,
      options,
    );
  }

  send(
    text: string,
    options?: SendTextOptions,
  ): Promise<Message> {
    return this.chat.send.text(
      text,
      options,
    );
  }

  react(
    emoji: string,
  ): Promise<void> {
    return this.message.react(emoji);
  }

  waitForReply(
    options: WaitForReplyContextOptions<Context> = {},
  ): Promise<Context> {
    if (!this.deps.waitForReplyFn) {
      throw new WaitForReplyUnavailableError();
    }

    return this.deps.waitForReplyFn({
      fromJid: this.from.jid,
      ...options,
    });
  }
}