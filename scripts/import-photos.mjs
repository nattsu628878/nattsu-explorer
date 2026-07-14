#!/usr/bin/env node
// 旅行後、家のMacで実行する取り込みスクリプト。
// import-inbox/ の写真からEXIF位置情報・撮影日時を読み、
// public/photos/<city>/ にwebp化してコピーし、
// src/content/spots/<city>/ にコンテンツエントリを生成する。
//
// 使い方: npm run import-photos -- --city tokyo [--input ./import-inbox]
// 前提: cwebp がインストール済み（brew install webp）。
// HEIC画像は事前に sips/ffmpeg 等で jpg に変換してから入れること。

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, basename, join } from 'node:path';
import { parse as parseExif, gps as gpsExif } from 'exifr';

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs(argv) {
  const args = { input: './import-inbox' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--city') args.city = argv[++i];
    if (argv[i] === '--input') args.input = argv[++i];
  }
  if (!args.city) {
    console.error('Error: --city <name> is required (e.g. --city tokyo)');
    process.exit(1);
  }
  return args;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const { city, input } = parseArgs(process.argv.slice(2));

  const photoDir = join('public', 'photos', city);
  const contentDir = join('src', 'content', 'spots', city);
  mkdirSync(photoDir, { recursive: true });
  mkdirSync(contentDir, { recursive: true });

  const files = readdirSync(input).filter((f) => SUPPORTED.has(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.log(`No supported images found in ${input}`);
    return;
  }

  let imported = 0;
  let skippedNoGps = 0;

  for (const file of files) {
    const srcPath = join(input, file);
    const gps = await gpsExif(srcPath).catch(() => null);
    if (!gps) {
      console.warn(`Skipped (no GPS data): ${file}`);
      skippedNoGps++;
      continue;
    }

    const meta = await parseExif(srcPath, ['DateTimeOriginal']).catch(() => null);
    const date = meta?.DateTimeOriginal ?? new Date();

    const slug = slugify(file);
    const webpPath = join(photoDir, `${slug}.webp`);
    execFileSync('cwebp', ['-quiet', srcPath, '-o', webpPath]);

    const publicPhotoUrl = `/nattsu-explorer/photos/${city}/${slug}.webp`;

    const frontmatter = [
      '---',
      `city: ${city}`,
      `name: ${slug}`,
      `lat: ${gps.latitude}`,
      `lng: ${gps.longitude}`,
      `date: ${date.toISOString().slice(0, 10)}`,
      `photos: ["${publicPhotoUrl}"]`,
      `notes: ""`,
      '---',
      ''
    ].join('\n');

    writeFileSync(join(contentDir, `${slug}.md`), frontmatter);
    console.log(`Imported: ${file} -> ${city}/${slug}`);
    imported++;
  }

  console.log(`\nDone. Imported: ${imported}, Skipped (no GPS): ${skippedNoGps}`);
  console.log('name / notes は各 .md を開いて手で埋めてください。');
}

main();
