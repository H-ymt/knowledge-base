/**
 * データ正規化（スタブ）。
 * Task 3 で `KnowledgeEntry` 型を専用モジュールに切り出し、ここから参照する形に移行する。
 */

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

export function normalizeGist(_gists: unknown[]): KnowledgeEntry[] {
  // スタブ: 後で実装
  return [];
}

export function normalizeZenn(_feed: unknown): KnowledgeEntry[] {
  // スタブ: 後で実装
  return [];
}

