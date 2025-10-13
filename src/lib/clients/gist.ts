/**
 * GitHub Gist API クライアント（スタブ）。
 * TODO: API 呼び出し実装と ETag 差分取得。
 */
import type { GistApiItem } from "@/lib/types";
import { getETag, setETag } from "@/lib/adapters/cache";

export interface GistClientConfig {
  readonly username?: string;
  readonly token?: string;
}

export interface GistClient {
  /** ユーザーの Gists を取得（ETag 差分）。 */
  fetchUserGists: (options?: { readonly since?: string }) => Promise<GistApiItem[]>;
}

export function createGistClient(config: GistClientConfig = {}): GistClient {
  const { username, token } = config;
  void token; // 未使用抑制（実装時に利用）

  return {
    async fetchUserGists() {
      if (!username) throw new Error("GistClient: username が未設定です");

      const url = new URL(`https://api.github.com/users/${encodeURIComponent(username)}/gists`);
      url.searchParams.set("per_page", "100");

      const headers: Record<string, string> = { "User-Agent": "knowledge-base-fetch" };
      const etagKey = `gist:${username}`;
      const prevEtag = await getETag(etagKey);
      if (prevEtag) headers["If-None-Match"] = prevEtag;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (res.status === 304) {
        return [];
      }
      if (!res.ok) {
        throw new Error(`GistClient: HTTP ${res.status}`);
      }
      const etag = res.headers.get("etag");
      if (etag) await setETag(etagKey, etag);
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? (data as GistApiItem[]) : [];
    },
  };
}
