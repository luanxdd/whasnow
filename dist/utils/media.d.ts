import type { MediaSource } from '../types/common.js';
export declare function fileNameFromPath(filePath: string): string;
export declare function mimeTypeFromPath(filePath: string): string;
export declare function resolveMedia(source: MediaSource): Promise<Buffer | {
    url: string;
}>;
