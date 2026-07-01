import type {
  proto,
  WAMessage,
} from '@whiskeysockets/baileys';

interface TrackedPoll {
  creationMessage: WAMessage;
  pollUpdates: proto.IPollUpdate[];
}

export class PollStore {
  private readonly polls = new Map<string, TrackedPoll>();

  constructor(private readonly maxSize = 200) {}

  registerCreation(message: WAMessage): void {
    const id = message.key.id;

    if (!id) {
      return;
    }

    const existing = this.polls.get(id);

    if (existing) {
      existing.creationMessage = message;
      existing.creationMessage.pollUpdates = existing.pollUpdates;

      return;
    }

    this.polls.set(id, {
      creationMessage: message,
      pollUpdates: [],
    });

    this.evictIfNeeded();
  }

  getCreationMessage(
    pollMessageId: string,
  ): WAMessage | undefined {
    return this.polls.get(pollMessageId)?.creationMessage;
  }

  addVote(
    pollMessageId: string,
    update: proto.IPollUpdate,
  ): WAMessage | undefined {
    const tracked = this.polls.get(pollMessageId);

    if (!tracked) {
      return undefined;
    }

    tracked.pollUpdates.push(update);
    tracked.creationMessage.pollUpdates =
      tracked.pollUpdates;

    return tracked.creationMessage;
  }

  private evictIfNeeded(): void {
    if (this.polls.size <= this.maxSize) {
      return;
    }

    const oldest = this.polls.keys().next().value;

    if (oldest !== undefined) {
      this.polls.delete(oldest);
    }
  }
}