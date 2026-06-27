import { WhaSnowError } from './base.js';

export class GroupContextError extends WhaSnowError {
  readonly code = 'GROUP_CONTEXT_REQUIRED';

  constructor() {
    super('This action can only be performed within a group.');
  }
}

export class ModerationStoreUnavailableError extends WhaSnowError {
  readonly code = 'MODERATION_STORE_UNAVAILABLE';

  constructor() {
    super(
      'The native mute function is not available. Configure "moderationDbPath" when creating the Client to enable it.',
    );
  }
}
