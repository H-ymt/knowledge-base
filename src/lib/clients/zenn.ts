/** Zenn RSS クライアント。 */
import type { ZennFeed, ZennFeedItem } from "@/lib/types";
import { getETag, setETag } from "@/lib/adapters/cache";

export interface ZennClientConfig {
  readonly user?: string;
}

export interface ZennClient {
  /** ユーザーの RSS フィードを取得する。 */
  fetchFeed: () => Promise<ZennFeed>;
}

export function createZennClient(config: ZennClientConfig = {}): ZennClient {
  const { user } = config;
  return {
    async fetchFeed() {
      if (!user) throw new Error("ZennClient: user が未設定です");
      const url = new URL(`https://zenn.dev/${encodeURIComponent(user)}/feed`);

      const headers: Record<string, string> = { "User-Agent": "knowledge-base-fetch" };
      const etagKey = `zenn:${user}`;
      const prevEtag = await getETag(etagKey);
      if (prevEtag) headers["If-None-Match"] = prevEtag;

      const res = await fetch(url, { headers });
      if (res.status === 304) {
        return { title: `zenn:${user}`, link: url.toString(), items: [] };
      }
      if (!res.ok) throw new Error(`ZennClient: HTTP ${res.status}`);
      const etag = res.headers.get("etag");
      if (etag) await setETag(etagKey, etag);
      const xml = await res.text();
      return parseZennRss(xml, url.toString());
    },
  };
}

// --- Minimal RSS Parser (items only) ---
function parseTag(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseZennRss(xml: string, link: string): ZennFeed {
  const itemBlocks = parseTag(xml, "item");
  const items: ZennFeedItem[] = itemBlocks.map((block) => {
    const [title] = parseTag(block, "title");
    const [itemLink] = parseTag(block, "link");
    const [description] = parseTag(block, "description");
    const [pubDate] = parseTag(block, "pubDate");
    const [guid] = parseTag(block, "guid");
    return {
      id: guid ?? itemLink,
      title: unescapeHtml(title ?? ""),
      link: (itemLink ?? "").trim(),
      description: description ? unescapeHtml(description) : undefined,
      pubDate: pubDate?.trim(),
    } satisfies ZennFeedItem;
  });
  return { title: "zenn", link, items };
}
