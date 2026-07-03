import { readFile } from 'node:fs/promises';

import {
  basename,
  extname,
} from 'node:path';

import type { MediaSource } from '../types/common.js';

import { InvalidMediaSourceError } from '../errors/index.js';

const MIME_TYPES: Record<
  string,
  string
> = {
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

export function fileNameFromPath(
  filePath: string,
): string {
  return basename(filePath);
}

export function mimeTypeFromPath(
  filePath: string,
): string {
  return (
    MIME_TYPES[
      extname(filePath).toLowerCase()
    ] ??
    'application/octet-stream'
  );
}

export async function resolveMedia(
  source: MediaSource,
): Promise<
  Buffer | { url: string }
> {
  if (Buffer.isBuffer(source)) {
    return source;
  }

  if (
    source.startsWith('http://') ||
    source.startsWith('https://')
  ) {
    return {
      url: source,
    };
  }

  try {
    return await readFile(source);
  } catch (err) {
    throw new InvalidMediaSourceError(source, {
      cause: err,
    });
  }
}

const MAX_REMOTE_MEDIA_BYTES = 50 * 1024 * 1024;
const REMOTE_FETCH_TIMEOUT_MS = 20_000;


export async function resolveMediaBuffer(
  source: MediaSource,
): Promise<Buffer> {
  if (Buffer.isBuffer(source)) {
    return source;
  }

  if (
    source.startsWith('http://') ||
    source.startsWith('https://')
  ) {
    try {
      const response = await fetch(source, {
        signal: AbortSignal.timeout(
          REMOTE_FETCH_TIMEOUT_MS,
        ),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed with status ${response.status}`,
        );
      }

      const contentLength = response.headers.get(
        'content-length',
      );

      if (
        contentLength &&
        Number(contentLength) > MAX_REMOTE_MEDIA_BYTES
      ) {
        throw new Error(
          `Remote media is ${Math.round(Number(contentLength) / 1_000_000)}MB, ` +
          `above the ${Math.round(MAX_REMOTE_MEDIA_BYTES / 1_000_000)}MB limit.`,
        );
      }

      const buffer = Buffer.from(
        await response.arrayBuffer(),
      );

      if (buffer.length > MAX_REMOTE_MEDIA_BYTES) {
        throw new Error(
          `Remote media is ${Math.round(buffer.length / 1_000_000)}MB, ` +
          `above the ${Math.round(MAX_REMOTE_MEDIA_BYTES / 1_000_000)}MB limit.`,
        );
      }

      return buffer;
    } catch (err) {
      throw new InvalidMediaSourceError(source, {
        cause: err,
      });
    }
  }

  try {
    return await readFile(source);
  } catch (err) {
    throw new InvalidMediaSourceError(source, {
      cause: err,
    });
  }
}