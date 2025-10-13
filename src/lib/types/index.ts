/**
 * 型定義モジュール
 * - 型安全を最優先: すべての公開型をここに集約
 * - ランタイム依存なし（純型）
 */

export type Source = "gist" | "zenn";

export interface Tag {
  readonly raw: string;
  readonly norm: string;
}

export interface KnowledgeEntry {
  readonly id: string;
  readonly source: Source;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly tags: ReadonlyArray<Tag>;
  readonly publishedAt: string; // ISO8601
  readonly updatedAt?: string; // ISO8601
  readonly contentHtml?: string;
  readonly author?: string;
  readonly image?: string;
}

// ---- External API response shapes (最小限の型) ----

// GitHub Gist API (list items)
// https://docs.github.com/en/rest/gists/gists?apiVersion=2022-11-28#list-gists-for-a-user
export interface GistApiFileInfo {
  readonly filename: string | null;
  readonly language: string | null;
  readonly raw_url: string;
  readonly size: number;
  readonly type: string | null;
}

export interface GistApiItem {
  readonly id: string;
  readonly html_url: string;
  readonly description: string | null;
  readonly public: boolean;
  readonly created_at: string; // ISO8601
  readonly updated_at: string; // ISO8601
  readonly files: Record<string, GistApiFileInfo>;
  readonly owner?: { readonly login: string } | null;
}

// Zenn RSS (最小構造)
export interface ZennFeedItem {
  readonly id?: string;
  readonly title: string;
  readonly link: string;
  readonly description?: string;
  readonly pubDate?: string; // RFC822 or ISO-like
}

export interface ZennFeed {
  readonly title?: string;
  readonly link?: string;
  readonly items: ReadonlyArray<ZennFeedItem>;
}

