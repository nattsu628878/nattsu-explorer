#!/usr/bin/env node
// 写真の取り込みスクリプト。
// Google Drive共有フォルダ（nattsu-hub-share/to-agent/nattsu-explorer/）から写真を取得し、
// EXIF位置情報・撮影日時を読み、public/photos/ にwebp化して配置、
// src/content/spots/ にコンテンツエントリを生成する。
// 処理済みの元写真はDrive側のarchive/nattsu-explorer/へ退避する。
//
// 使い方: npm run import-photos
//   ローカルの写真フォルダから直接取り込みたい場合: npm run import-photos -- --input ./some-dir
// 前提: cwebp（libwebp-utils）、rclone（gdrive remote設定済み）がインストール済み。
// HEIC画像は事前に sips/ffmpeg 等で jpg に変換してから入れること。

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import exifr from 'exifr';
const { parse: parseExif, gps: gpsExif } = exifr;

const DRIVE_ROOT = 'gdrive:nattsu-hub-share';
const DRIVE_INBOX = `${DRIVE_ROOT}/to-agent/nattsu-explorer`;
const DRIVE_ARCHIVE = `${DRIVE_ROOT}/archive/nattsu-explorer`;
const CACHE_DIR = './.assets-cache/import-inbox';
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs(argv) {
  const args = { input: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
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
  const { input } = parseArgs(process.argv.slice(2));
  const fromDrive = !input;
  const inputDir = input ?? CACHE_DIR;

  if (fromDrive) {
    console.log(`Fetching photos from ${DRIVE_INBOX}/ ...`);
    mkdirSync(CACHE_DIR, { recursive: true });
    execFileSync('rclone', ['copy', `${DRIVE_INBOX}/`, CACHE_DIR]);
  }

  const photoDir = join('public', 'photos');
  const contentDir = join('src', 'content', 'spots');
  mkdirSync(photoDir, { recursive: true });
  mkdirSync(contentDir, { recursive: true });

  const files = readdirSync(inputDir).filter((f) => SUPPORTED.has(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.log(`No supported images found in ${inputDir}`);
    return;
  }

  let imported = 0;
  let skippedNoGps = 0;

  for (const file of files) {
    const srcPath = join(inputDir, file);
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

    const publicPhotoUrl = `/nattsu-explorer/photos/${slug}.webp`;

    const frontmatter = [
      '---',
      `lat: ${gps.latitude}`,
      `lng: ${gps.longitude}`,
      `date: ${date.toISOString().slice(0, 10)}`,
      `photo: "${publicPhotoUrl}"`,
      '---',
      ''
    ].join('\n');

    writeFileSync(join(contentDir, `${slug}.md`), frontmatter);
    console.log(`Imported: ${file} -> ${slug}`);
    imported++;

    if (fromDrive) {
      execFileSync('rclone', ['moveto', `${DRIVE_INBOX}/${file}`, `${DRIVE_ARCHIVE}/${file}`]);
    }
  }

  if (fromDrive) rmSync(CACHE_DIR, { recursive: true, force: true });

  console.log(`\nDone. Imported: ${imported}, Skipped (no GPS): ${skippedNoGps}`);
  if (imported > 0) console.log('notes を追加したい場合は各 .md を開いて手で埋めてください。');
}

main();
