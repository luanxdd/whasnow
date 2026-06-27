import type { proto } from '@whiskeysockets/baileys';

export class MessageStore {
  private readonly map = new Map<
    string,
    proto.IMessage
  >();

  constructor(
    private readonly maxSize = 1000,
  ) {}

  get(
    remoteJid: string,
    id: string,
  ): proto.IMessage | undefined {
    return this.map.get(
      this.key(remoteJid, id),
    );
  }

  set(
    remoteJid: string,
    id: string,
    message: proto.IMessage,
  ): void {
    const key = this.key(
      remoteJid,
      id,
    );

    this.map.delete(key);
    this.map.set(key, message);

    if (this.map.size > this.maxSize) {
      const oldest =
        this.map.keys().next().value;

      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
  }

  private key(
    remoteJid: string,
    id: string,
  ): string {
    return `${remoteJid}:${id}`;
  }
}