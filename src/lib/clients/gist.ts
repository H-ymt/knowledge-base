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
  /** ユーザーの Gists を取得（ETag 差分・ページネーション・リトライ）。 */
  fetchUserGists: (options?: { readonly since?: string; readonly limit?: number; readonly force?: boolean }) => Promise<GistApiItem[]>;
}

export function createGistClient(config: GistClientConfig = {}): GistClient {
  const { username, token } = config;
  void token; // 未使用抑制（実装時に利用）

  function parseLinkHeader(link: string | null): Record<string, string> {
    if (!link) return {};
    const out: Record<string, string> = {};
    for (const part of link.split(",")) {
      const m = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (m) out[m[2]] = m[1];
    }
    return out;
  }

  async function fetchWithRetry(input: URL, headers: Record<string, string>, maxAttempts = 3): Promise<Response> {
    let attempt = 0;
    while (true) {
      attempt++;
      const res = await fetch(input, { headers });
      if (res.ok || res.status === 304) return res;
      if (attempt >= maxAttempts || (res.status < 500 && res.status !== 429)) return res;
      const reset = res.headers.get("x-ratelimit-reset");
      const now = Math.floor(Date.now() / 1000);
      const waitMs = res.status === 429 && reset ? Math.max(0, (parseInt(reset, 10) - now) * 1000) : 300 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs + Math.floor(Math.random() * 100)));
    }
  }

  return {
    async fetchUserGists(options) {
      if (!username) throw new Error("GistClient: username が未設定です");
      const limit = Math.max(0, options?.limit ?? 0);
      const headers: Record<string, string> = { "User-Agent": "knowledge-base-fetch" };
      const etagKey = `gist:${username}`;
      const prevEtag = options?.force ? undefined : await getETag(etagKey);
      if (prevEtag) headers["If-None-Match"] = prevEtag;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const collected: GistApiItem[] = [];
      let page = 1;
      let nextUrl: URL | null = new URL(`https://api.github.com/users/${encodeURIComponent(username)}/gists`);
      nextUrl.searchParams.set("per_page", "100");

      while (nextUrl) {
        nextUrl.searchParams.set("page", String(page));
        const res = await fetchWithRetry(nextUrl, headers);
        if (res.status === 304) break;
        if (!res.ok) throw new Error(`GistClient: HTTP ${res.status}`);
        const etag = res.headers.get("etag");
        if (etag) await setETag(etagKey, etag);
        const data = (await res.json()) as unknown;
        const items = Array.isArray(data) ? (data as GistApiItem[]) : [];
        collected.push(...items);
        if (limit && collected.length >= limit) {
          return collected.slice(0, limit);
        }
        const links = parseLinkHeader(res.headers.get("link"));
        if (links.next) {
          nextUrl = new URL(links.next);
          page += 1;
        } else {
          nextUrl = null;
        }
      }
      return collected;
    },
  };
}
