# AIエージェント 設定

## プロジェクト概要

このリポジトリは、Gist や Zenn の記事を集約して表示する Astro ベースのナレッジサイトです：

- **フレームワーク**: Astro 5
- **スタイリング**: Tailwind CSS v4
- **データソース**: GitHub Gist API、Zenn RSS フィード
- **自動更新**: GitHub Actions
- **デプロイ**: 静的サイト生成（SSG）

## 設計作業ルール

設計作業を依頼された場合は、以下のルールに従ってファイルを作成すること：

- ファイル名: `YYYYMMDD_HHMM_{日本語の作業内容}.md`
- 保存場所: `docs/` 以下
- フォーマット: Markdown

例: `docs/20250815_1430_検索機能実装設計.md`

## アプリケーション実装ルール

### 基本方針

- このプロジェクトは静的サイト生成（SSG）として構築する
- Astro のファイルベースルーティングを活用する
- データはビルド時に取得し、JSON ファイルとして保存する
- サーバーサイドの処理は Node.js スクリプト（`scripts/` ディレクトリ）で実装する

### データ取得とキャッシング

- ビルド前スクリプト（`scripts/fetch-knowledge.ts`）でデータを取得
- 取得したデータは `src/data/entries.json` に保存
- GitHub Actions による定期自動更新（毎日 JST 6:00）
- 差分取得により不要な API コールを削減（ETag / If-None-Match 利用）

### ディレクトリ構成

```
src/
├── pages/                    # Astro のページファイル
│   ├── index.astro          # トップページ
│   └── knowledge/           # ナレッジページ
│       ├── index.astro      # 一覧ページ
│       └── [slug].astro     # 詳細ページ
├── components/              # Astro コンポーネント
│   ├── KnowledgeCard.astro  # 記事カード
│   ├── Filters.astro        # フィルタコンポーネント
│   └── TagList.astro        # タグリスト
├── layouts/                 # レイアウトコンポーネント
│   └── Layout.astro         # ベースレイアウト
├── lib/                     # ユーティリティ・ロジック
│   ├── clients/             # 外部 API クライアント
│   │   ├── gist.ts          # GitHub Gist API
│   │   └── zenn.ts          # Zenn RSS 取得
│   ├── adapters/            # データ変換・正規化
│   │   ├── normalize.ts     # データ正規化
│   │   └── cache.ts         # キャッシュ管理
│   └── search.ts            # 検索ロジック
├── data/                    # 生成されたデータファイル
│   ├── entries.json         # 記事データ
│   └── tags.json            # タグデータ
└── assets/                  # スタイル・アセット
    └── app.css              # グローバルスタイル
```

### データモデル

```typescript
export type KnowledgeEntry = {
  id: string;
  source: "gist" | "zenn";
  slug: string;
  title: string;
  summary: string;
  url: string;
  tags: { raw: string; norm: string }[];
  publishedAt: string;
  updatedAt?: string;
  contentHtml?: string;
  author?: string;
  image?: string;
};
```

### コンポーネント実装

- Astro コンポーネント（`.astro`）を基本とする
- インタラクティブな要素には必要に応じて Islands アーキテクチャを活用
- プロジェクト共通の UI コンポーネントは `src/components/ui/` に配置する
- Tailwind CSS v4 のカスタムテーマ変数を活用してスタイリングする

### 外部 API 統合

- GitHub Gist API: `GET /users/:username/gists`
- Zenn RSS フィード: `https://zenn.dev/<user>/feed`
- 差分取得による効率的なデータ更新
- エラーハンドリングとリトライ機能の実装

### 検索・フィルタ機能

- 少量データ → Astro 側でのフィルタリング
- 多量データ → Fuse.js + Island Component でのクライアントサイド検索
- URL クエリパラメータによる状態管理（`?q=react&tag=astro`）

### SEO 対応

- OGP タグの適切な設定
- JSON-LD による構造化データ出力
- RSS フィード（`/rss.xml`）
- サイトマップ（`/sitemap.xml`）
- メタタグの最適化

### 型安全性

- TypeScript による型定義の徹底
- データモデルの型安全性確保
- API レスポンスの型定義
- `unknown` や `any` の使用は最小限にし、適切な型を定義する

## GitHub 操作ルール

- ユーザーから PR を出して、と言われたときは、現在の作業のフィーチャーブランチを切りコミットを行ってから PR を出すようにする
- `main` への直接 push は禁止です
- データ取得スクリプトの変更やGitHub Actionsの変更は、ユーザーに許可を取ってから実行してください
- ロジックにまつわる変更をしたあとの Push の前には、以下のコマンドを実行してから Push するようにしてください：
  - `pnpm run format` - Prettier によるコードフォーマット
  - `pnpm build` - Astro のビルドと型チェック
- PR 作成時は `gh pr create` コマンドに `--base` オプションを付けず、デフォルトのベースブランチを使用してください

## 開発コマンド

- `pnpm dev` - 開発サーバーの起動
- `pnpm build` - プロダクションビルド
- `pnpm preview` - ビルド後のプレビュー
- `pnpm format` - Prettier によるコードフォーマット
- `pnpm tsx scripts/fetch-knowledge.ts` - データ取得スクリプトの実行

## 今後の実装予定

以下の機能は、このテンプレートに今後追加される予定です：

- GitHub Gist API との統合
- Zenn RSS フィードの取得
- 検索・フィルタ機能の実装
- RSS フィード・サイトマップの生成
- GitHub Actions による自動更新
- OGP 画像の動的生成
- パフォーマンス最適化

## 拡張可能性

- 他のデータソース（microCMS、Qiita、Note など）の追加
- 全文検索機能の強化
- タグクラウドの実装
- 人気記事ランキング
- 関連記事の表示
- ダークモード対応
