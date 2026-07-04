export type SniffedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/webm'
  | 'unknown';

export interface SniffResult {
  mimeType: SniffedMimeType;
  isAnimated: boolean;
}

const WEBP_ANIMATION_FLAG = 0x02;

function isAnimatedWebp(buffer: Buffer): boolean {
  if (buffer.length < 21) {
    return false;
  }

  const chunkId = buffer.toString('ascii', 12, 16);

  if (chunkId !== 'VP8X') {
    return false;
  }

  return (buffer[20]! & WEBP_ANIMATION_FLAG) !== 0;
}

export function sniffMedia(buffer: Buffer): SniffResult {
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return {
      mimeType: 'image/webp',
      isAnimated: isAnimatedWebp(buffer),
    };
  }

  if (
    buffer.length >= 6 &&
    (buffer.toString('ascii', 0, 6) === 'GIF87a' ||
      buffer.toString('ascii', 0, 6) === 'GIF89a')
  ) {
    return {
      mimeType: 'image/gif',
      isAnimated: true,
    };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      mimeType: 'image/png',
      isAnimated: false,
    };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mimeType: 'image/jpeg',
      isAnimated: false,
    };
  }

  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);

    return {
      mimeType: brand.startsWith('qt') ? 'video/quicktime' : 'video/mp4',
      isAnimated: true,
    };
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return {
      mimeType: 'video/webm',
      isAnimated: true,
    };
  }

  return {
    mimeType: 'unknown',
    isAnimated: false,
  };
}
