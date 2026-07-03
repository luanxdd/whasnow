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

export async function injectStickerExif(
  webp: Buffer,
  data: StickerExifData,
): Promise<Buffer> {
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
