import { randomUUID } from 'node:crypto';
import {
  rm,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createRequire } from 'node:module';

import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';

import { StickerBuildError } from '../errors/index.js';

import type {
  CreateStickerOptions,
  MediaSource,
} from '../types/common.js';

import { resolveMediaBuffer } from '../utils/media.js';

import { injectStickerExif } from './sticker-exif.js';
import { sniffMedia } from './sniff.js';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static') as string | null;

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const STICKER_SIZE = 512;

const MAX_STATIC_BYTES = 1_000_000;
const MAX_ANIMATED_BYTES = 500_000;

const ANIMATED_MAX_SECONDS = 6;
const ANIMATED_FPS = 10;

const ANIMATED_QUALITY_LEVELS: ReadonlyArray<{
  quality: number;
  fps: number;
}> = [
  { quality: 50, fps: ANIMATED_FPS },
  { quality: 35, fps: ANIMATED_FPS },
  { quality: 35, fps: 8 },
  { quality: 25, fps: 6 },
];

export async function buildSticker(
  source: MediaSource,
  options: CreateStickerOptions = {},
): Promise<Buffer> {
  const input = await resolveMediaBuffer(source);
  const sniff = sniffMedia(input);

  const wantsMetadata = Boolean(
    options.packName ||
    options.authorName ||
    options.categories?.length,
  );

  const canTryFastPath =
    sniff.mimeType === 'image/webp' &&
    !sniff.isAnimated &&
    !wantsMetadata &&
    input.length <= MAX_STATIC_BYTES;

  if (
    canTryFastPath &&
    (await isCompliantStickerCanvas(input))
  ) {
    return input;
  }

  const webp =
    sniff.mimeType === 'image/gif' ||
    sniff.mimeType.startsWith('video/')
      ? await renderAnimatedWebp(input, options)
      : await renderStaticWebp(input, options);

  if (!wantsMetadata) {
    return webp;
  }

  return injectStickerExif(webp, {
    packName: options.packName ?? 'WhaSnow',
    authorName: options.authorName ?? '',
    categories:
      options.categories?.length
        ? options.categories
        : ['🏹'],
  });
}

async function isCompliantStickerCanvas(
  input: Buffer,
): Promise<boolean> {
  try {
    const { width, height } = await sharp(input).metadata();

    return (
      width === STICKER_SIZE &&
      height === STICKER_SIZE
    );
  } catch {
  
    return false;
  }
}

async function renderStaticWebp(
  input: Buffer,
  options: CreateStickerOptions,
): Promise<Buffer> {
  const fit =
    options.crop === 'cover'
      ? 'cover'
      : 'contain';

  const background =
    options.backgroundColor ?? 'rgba(0,0,0,0)';

  try {
    const pipeline = sharp(input).resize(
      STICKER_SIZE,
      STICKER_SIZE,
      { fit, background },
    );

    let quality = 90;
    let output: Buffer;

    do {
      output = await pipeline
        .clone()
        .webp({ quality })
        .toBuffer();

      quality -= 15;
    } while (
      output.length > MAX_STATIC_BYTES &&
      quality >= 30
    );

    if (output.length > MAX_STATIC_BYTES) {
      throw new StickerBuildError(
        `The generated sticker is ${Math.round(output.length / 1024)}KB, ` +
        `above WhatsApp's ~${Math.round(MAX_STATIC_BYTES / 1024)}KB limit ` +
        'even at the lowest quality setting. Try a simpler image.',
      );
    }

    return output;
  } catch (err) {
    if (err instanceof StickerBuildError) {
      throw err;
    }

    throw new StickerBuildError(
      'Failed to build a static sticker from the provided image.',
      { cause: err },
    );
  }
}

async function renderAnimatedWebp(
  input: Buffer,
  options: CreateStickerOptions,
): Promise<Buffer> {
  const inputPath = join(
    tmpdir(),
    `whasnow-sticker-${randomUUID()}.input`,
  );

  await writeFile(inputPath, input);

  const fit: 'contain' | 'cover' =
    options.crop === 'cover' ? 'cover' : 'contain';

  try {
    const background = await resolveFfmpegColor(
      options.backgroundColor ?? 'rgba(0,0,0,0)',
    );

    let lastSize = 0;

    for (const level of ANIMATED_QUALITY_LEVELS) {
      const outputPath = join(
        tmpdir(),
        `whasnow-sticker-${randomUUID()}.webp`,
      );

      try {
        await encodeAnimatedWebp(inputPath, outputPath, {
          fps: level.fps,
          quality: level.quality,
          fit,
          background,
        });

        const output = await readFile(outputPath);
        lastSize = output.length;

        if (output.length <= MAX_ANIMATED_BYTES) {
          return output;
        }
      } finally {
        await rm(outputPath, { force: true });
      }
    }

    throw new StickerBuildError(
      `The generated animated sticker is still ${Math.round(lastSize / 1024)}KB ` +
      `after reducing quality and frame rate, above WhatsApp's ` +
      `~${Math.round(MAX_ANIMATED_BYTES / 1024)}KB limit. Try a shorter or lower-motion clip.`,
    );
  } catch (err) {
    if (err instanceof StickerBuildError) {
      throw err;
    }

    throw new StickerBuildError(
      'Failed to build an animated sticker. Make sure ffmpeg is available (bundled via ffmpeg-static).',
      { cause: err },
    );
  } finally {
    await rm(inputPath, { force: true });
  }
}

function encodeAnimatedWebp(
  inputPath: string,
  outputPath: string,
  settings: {
    fps: number;
    quality: number;
    fit: 'contain' | 'cover';
    background: string;
  },
): Promise<void> {

  const scaleAndFit =
    settings.fit === 'cover'
      ? [
          `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=increase`,
          `crop=${STICKER_SIZE}:${STICKER_SIZE}`,
        ]
      : [
          `scale=${STICKER_SIZE}:${STICKER_SIZE}:force_original_aspect_ratio=decrease`,
          `pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=${settings.background}`,
        ];

  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf',
        [
          `fps=${settings.fps}`,
          ...scaleAndFit,
        ].join(','),
        '-loop', '0',
        '-quality', String(settings.quality),
        '-compression_level', '6',
        '-an',
        '-vsync', '0',
        '-t', String(ANIMATED_MAX_SECONDS),
      ])
      .toFormat('webp')
      .on('error', reject)
      .on('end', () => resolve())
      .save(outputPath);
  });
}

async function resolveFfmpegColor(
  css: string,
): Promise<string> {
  try {
    const { data } = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: css,
      },
    })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const [r, g, b, a] = data;
    const hex = (n: number) => n.toString(16).padStart(2, '0');

    return `0x${hex(r!)}${hex(g!)}${hex(b!)}@${(a! / 255).toFixed(3)}`;
  } catch (err) {
    throw new StickerBuildError(
      `Invalid backgroundColor: "${css}".`,
      { cause: err },
    );
  }
}
