import { Boom } from '@hapi/boom';

import {
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys';

import type { EventBus } from '../events/bus.js';

import type { Logger } from '../utils/logger.js';

import type { ReconnectionPolicy } from './reconnection-policy.js';

export class ConnectionManager {
  private socket: WASocket | null = null;

  private reconnectTimer: NodeJS.Timeout | null =
    null;

  private attempt = 0;
  private destroyed = false;

  constructor(
    private readonly bus: EventBus,
    private readonly policy: ReconnectionPolicy,
    private readonly logger: Logger,
    private readonly reconnectFn: () => Promise<void>,
  ) {}

  attach(socket: WASocket): void {
    this.socket = socket;

    socket.ev.on(
      'connection.update',
      (update) =>
        this.handleUpdate(update),
    );
  }

  private handleUpdate(
    update: Parameters<
      Parameters<WASocket['ev']['on']>[1]
    >[0],
  ): void {
    const {
      connection,
      lastDisconnect,
    } = update as any;

    if (connection === 'open') {
      this.attempt = 0;

      this.clearTimer();

      this.bus.emit(
        'ready',
        undefined as void,
      );

      this.logger.info(
        'Connected to WhatsApp',
      );

      return;
    }

    if (connection !== 'close') {
      return;
    }

    const error =
      lastDisconnect?.error as
        | Boom
        | undefined;

    const statusCode =
      error?.output?.statusCode;

    this.logger.warn(
      { statusCode },
      'Connection closed',
    );

    switch (statusCode) {
      case DisconnectReason.loggedOut:
        this.bus.emit(
          'disconnected',
          {
            reason: 'logged_out',
            willReconnect: false,
            attempt: this.attempt,
          },
        );

        return;

      case DisconnectReason.restartRequired:
        this.scheduleReconnect(0);

        return;
    }

    if (
      this.policy.shouldReconnect(
        error,
        this.attempt,
      )
    ) {
      this.scheduleReconnect(
        this.policy.delayFor(
          this.attempt,
        ),
      );

      return;
    }

    this.bus.emit(
      'disconnected',
      {
        reason: String(
          error?.message ??
            'unknown',
        ),
        willReconnect: false,
        attempt: this.attempt,
      },
    );
  }

  private scheduleReconnect(
    delayMs: number,
  ): void {
    if (this.destroyed) {
      return;
    }

    this.clearTimer();

    this.reconnectTimer = setTimeout(
      async () => {
        this.attempt++;

        this.bus.emit(
          'reconnecting',
          {
            attempt: this.attempt,
          },
        );

        this.logger.info(
          {
            attempt: this.attempt,
          },
          'Reconnecting...',
        );

        await this.reconnectFn();
      },
      delayMs,
    );
  }

  private clearTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);

    this.reconnectTimer = null;
  }

  destroy(): void {
    this.destroyed = true;

    this.clearTimer();

    this.socket?.end(undefined);
  }
}