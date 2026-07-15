# nattsu-explorer

地図上の写真ビューワー。GPS付き写真を放り込むと、撮影地点にピンとして配置される。都市や旅行単位の区切りは無く、日本全体を1枚の地図で管理する。

Live site（デプロイ後）: https://nattsu628878.github.io/nattsu-explorer

## スタック
- Astro + Svelte（`@astrojs/svelte`）— 静的サイト、adapterなし
- 地図: MapLibre GL JS + OpenFreeMap（APIキー不要のベクタタイル）
- コンテンツ: Astro Content Collections（`src/content/spots/*.md`、フラット構造）
- 配色: `dev/tools/web-tools/tpl/tool-box-tpl.css` のパレットを`src/styles/tokens.css`に踏襲（nattsu-gallery / music-visualizerと共通）。ヘッダー右上のボタンでライト/ダーク切り替え可（localStorageに保存）

## 開発

```bash
npm install
npm run dev
```

## コンテンツの形式

`src/content/spots/<slug>.md`（1写真＝1ファイル）:

```yaml
---
lat: 35.0000
lng: 139.0000
date: 2026-07-16
photo: "/nattsu-explorer/photos/xxx.webp"
notes: "メモ（任意）"
---
```

通常は手で書かず、下記の取り込みスクリプトが生成する。

## 写真の取り込み

写真はGoogle Driveの共有フォルダ（`nattsu-hub-share/to-agent/`）経由で渡す。

1. GPS付き写真（HEICは事前に `sips`/`ffmpeg` 等でjpgに変換）を Google Drive の `nattsu-hub-share/to-agent/` に置く。
2. 実行:

```bash
npm run import-photos
```

`rclone`で`to-agent/`から取得 →EXIFのGPS・撮影日時を読み取り→`cwebp`（要インストール: Macは`brew install webp`、Archは`pacman -S libwebp-utils`）でwebp化して`public/photos/`に配置→`src/content/spots/`にエントリを生成、という流れを自動で行う。GPSが無い写真はスキップされ、Drive上のファイルもそのまま残る。取り込みに成功した写真の元ファイルはDrive側の`archive/`へ自動で退避される。

ローカルのフォルダから直接取り込みたい場合は `npm run import-photos -- --input ./some-dir` でも可。

3. 確認して commit/push。

## デプロイ
- `main`へのpush（または`workflow_dispatch`）でGitHub Actionsが静的ビルドし、GitHub Pagesへ自動デプロイ。

## 既知の未確定事項
- OpenFreeMapの利用規約・可用性は継続的に確認すること（比較的新しいサービスのため）。
- 配色トーンをnattsu-galleryとどこまで共有するか（現状は`tokens.css`への手動コピーのみ）。
