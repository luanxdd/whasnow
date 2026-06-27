import { readFile } from 'node:fs/promises';
import { basename, extname, } from 'node:path';
import { InvalidMediaSourceError } from '../errors/index.js';
const MIME_TYPES = {
    '.avi': 'video/x-msvideo',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.m4a': 'audio/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/opus',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
};
export function fileNameFromPath(filePath) {
    return basename(filePath);
}
export function mimeTypeFromPath(filePath) {
    return (MIME_TYPES[extname(filePath).toLowerCase()] ??
        'application/octet-stream');
}
export async function resolveMedia(source) {
    if (Buffer.isBuffer(source)) {
        return source;
    }
    if (source.startsWith('http://') ||
        source.startsWith('https://')) {
        return {
            url: source,
        };
    }
    try {
        return await readFile(source);
    }
    catch (err) {
        throw new InvalidMediaSourceError(source, {
            cause: err,
        });
    }
}
