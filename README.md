# nattsu-explorer

都市巡りの記録アプリ（MVP）。訪れた場所を地図上のピンで振り返る。都市ごとにセレクタで切り替える単一アプリ。

Live site（デプロイ後）: https://nattsu628878.github.io/nattsu-explorer

## スタック
- Astro + Svelte（`@astrojs/svelte`）— 静的サイト、adapterなし
- 地図: MapLibre GL JS + OpenFreeMap（APIキー不要のベクタタイル）
- コンテンツ: Astro Content Collections（`src/content/spots/<city>/*.md`）
- 配色: `dev/tools/web-tools/tpl/tool-box-tpl.css` のパレットを`src/styles/tokens.css`に踏襲（nattsu-gallery / music-visualizerと共通）

## 開発

```bash
npm install
npm run dev
```

## コンテンツの追加

`src/content/spots/<city>/<slug>.md` にfrontmatterで追加:

```yaml
---
city: tokyo
name: 訪れた場所の名前
lat: 35.0000
lng: 139.0000
date: 2026-07-16
photos: ["/nattsu-explorer/photos/tokyo/xxx.webp"]
notes: "メモ"
---
```

新しい都市を追加する場合は `src/content/spots/<city>/` ディレクトリを作るだけでよい（都市セレクタは自動的に増える）。

## 写真の取り込み（旅行後、家で実行）

1. 撮った写真を `import-inbox/`（git管理外）に集める。HEICは事前に `sips`/`ffmpeg` 等でjpgに変換しておく。
2. 実行:

```bash
npm run import-photos -- --city tokyo
```

EXIFのGPS・撮影日時を読み、`cwebp`（要インストール: `brew install webp`）でwebp化して`public/photos/<city>/`に配置、`src/content/spots/<city>/`にエントリを生成する。GPSが無い写真はスキップされる。`name`と`notes`は生成後に手で埋める。

3. 確認して commit/push。

## デプロイ
- `main`へのpush（または`workflow_dispatch`）でGitHub Actionsが静的ビルドし、GitHub Pagesへ自動デプロイ。

## 既知の未確定事項
- OpenFreeMapの利用規約・可用性は継続的に確認すること（比較的新しいサービスのため）。
- 配色トーンをnattsu-galleryとどこまで共有するか（現状は`tokens.css`への手動コピーのみ）。
