import webpmux from 'node-webpmux';

const { Image } = webpmux;

import { StickerBuildError } from '../errors/index.js';

export interface StickerExifData {
  packName: string;
  authorName: string;
  categories: string[];
}

const EXIF_HEADER = Buffer.from([
  0x49, 0x49, 0x2a, 0x00,
  0x08, 0x00, 0x00, 0x00,
  0x01, 0x00,
  0x41, 0x57, 0x07, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x16, 0x00, 0x00, 0x00,
]);

function stickerPackId(
  packName: string,
  authorName: string,
): string {
  const raw = `${packName}::${authorName}`;

  let hash = 0;

  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }

  return `whasnow.${hash.toString(16)}`;
}

function buildExifPayload(data: StickerExifData): Buffer {
  const payload = Buffer.from(
    JSON.stringify({
      'sticker-pack-id': stickerPackId(
        data.packName,
        data.authorName,
      ),
      'sticker-pack-name': data.packName,
      'sticker-pack-publisher': data.authorName,
      emojis: data.categories,
    }),
    'utf8',
  );

  const exif = Buffer.concat([EXIF_HEADER, payload]);
  exif.writeUInt32LE(payload.length, 14);

  return exif;
}

export async function injectStickerExif(
  webp: Buffer,
  data: StickerExifData,
): Promise<Buffer> {
  const exif = buildExifPayload(data);

  try {
    const image = new Image();

    await image.load(webp);

    image.exif = exif;

    return (await image.save(null)) as Buffer;
  } catch (err) {
    throw new StickerBuildError(
      'Failed to attach sticker-pack metadata to the generated webp.',
      { cause: err },
    );
  }
}

function buildRiffChunk(fourCC: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);

  header.write(fourCC, 0, 'ascii');
  header.writeUInt32LE(data.length, 4);

  const needsPad = data.length % 2 === 1;

  return Buffer.concat([
    header,
    data,
    needsPad ? Buffer.from([0x00]) : Buffer.alloc(0),
  ]);
}

export async function injectAnimatedStickerExif(
  webp: Buffer,
  data: StickerExifData,
): Promise<Buffer> {
  const exif = buildExifPayload(data);

  if (
    webp.toString('ascii', 0, 4) !== 'RIFF' ||
    webp.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new StickerBuildError(
      'Failed to attach sticker-pack metadata: not a valid RIFF/WEBP buffer.',
    );
  }

  try {
    const chunks: Array<{
      fourCC: string;
      start: number;
      dataStart: number;
      dataEnd: number;
      nextOffset: number;
    }> = [];

    let offset = 12;

    while (offset + 8 <= webp.length) {
      const fourCC = webp.toString('ascii', offset, offset + 4);
      const size = webp.readUInt32LE(offset + 4);
      const dataStart = offset + 8;
      const dataEnd = dataStart + size;

      if (dataEnd > webp.length) {
        throw new Error(
          `Chunk ${fourCC} declares size ${size} but overruns the buffer.`,
        );
      }

      const nextOffset = dataEnd + (size % 2 === 1 ? 1 : 0);

      chunks.push({ fourCC, start: offset, dataStart, dataEnd, nextOffset });
      offset = nextOffset;
    }

    const vp8x = chunks.find((chunk) => chunk.fourCC === 'VP8X');

    if (!vp8x) {
      throw new Error(
        'Expected an extended webp (VP8X chunk); animated webp always has one.',
      );
    }

    const vp8xData = Buffer.from(
      webp.subarray(vp8x.dataStart, vp8x.dataEnd),
    );

    vp8xData[0] = (vp8xData[0] ?? 0) | 0b00001000;

    const passthroughChunks = chunks
      .filter((chunk) => (
        chunk.fourCC !== 'VP8X' &&
        chunk.fourCC !== 'EXIF' &&
        chunk.fourCC !== 'XMP '
      ))
      .map((chunk) => webp.subarray(chunk.start, chunk.nextOffset));

    const xmp = chunks.find((chunk) => chunk.fourCC === 'XMP ');
    const xmpBytes = xmp
      ? webp.subarray(xmp.start, xmp.nextOffset)
      : Buffer.alloc(0);

    const body = Buffer.concat([
      Buffer.from('WEBP', 'ascii'),
      buildRiffChunk('VP8X', vp8xData),
      ...passthroughChunks,
      buildRiffChunk('EXIF', exif),
      xmpBytes,
    ]);

    const riffHeader = Buffer.alloc(8);

    riffHeader.write('RIFF', 0, 'ascii');
    riffHeader.writeUInt32LE(body.length, 4);

    return Buffer.concat([riffHeader, body]);
  } catch (err) {
    throw new StickerBuildError(
      'Failed to attach sticker-pack metadata to the generated animated webp.',
      { cause: err },
    );
  }
}
