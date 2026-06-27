import { WhaSnowError } from './base.js';
export declare class GroupContextError extends WhaSnowError {
    readonly code = "GROUP_CONTEXT_REQUIRED";
    constructor();
}
export declare class ModerationStoreUnavailableError extends WhaSnowError {
    readonly code = "MODERATION_STORE_UNAVAILABLE";
    constructor();
}
