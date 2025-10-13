/** Zenn RSS クライアント。 */
import { getETag, setETag } from "@/lib/adapters/cache";
import type { ZennFeed, ZennFeedItem } from "@/lib/types";

export interface ZennClientConfig {
  readonly user?: string;
  /** 記事に加えてスクラップも取得する */
  readonly includeScraps?: boolean;
}

export interface ZennClient {
  /** ユーザーの RSS/Atom フィードを取得する（includeScraps=true ならスクラップも結合）。 */
  fetchFeed: (options?: { readonly force?: boolean }) => Promise<ZennFeed>;
}

export function createZennClient(config: ZennClientConfig = {}): ZennClient {
  const { user, includeScraps = false } = config;
  return {
    async fetchFeed(options) {
      if (!user) throw new Error("ZennClient: user が未設定です");

      async function fetchOne(kind: "articles" | "scraps"): Promise<ZennFeed> {
        const path = kind === "articles" ? "feed" : "scraps/feed";
        const url = new URL(`https://zenn.dev/${encodeURIComponent(user)}/${path}`);
        const headers: Record<string, string> = { "User-Agent": "knowledge-base-fetch" };
        const etagKey = `zenn:${user}:${kind}`;
        const prevEtag = options?.force ? undefined : await getETag(etagKey);
        if (prevEtag) headers["If-None-Match"] = prevEtag;

        const res = await fetch(url, { headers });
        if (res.status === 304) {
          return { title: `zenn:${user}:${kind}`, link: url.toString(), items: [] };
        }
        if (!res.ok) {
          // スクラップ未利用ユーザーは 404 の可能性があるため、空配列で継続
          if (res.status === 404 && kind === "scraps") {
            return { title: `zenn:${user}:${kind}`, link: url.toString(), items: [] };
          }
          throw new Error(`ZennClient: HTTP ${res.status} (${kind})`);
        }
        const etag = res.headers.get("etag");
        if (etag) await setETag(etagKey, etag);
        const xml = await res.text();
        return parseZennXml(xml, url.toString());
      }

      const articles = await fetchOne("articles");
      const scraps = includeScraps ? await fetchOne("scraps") : { title: "", link: "", items: [] };
      return { title: `zenn:${user}`, link: articles.link, items: [...articles.items, ...scraps.items] };
    },
  };
}

// --- Minimal RSS/Atom Parser (items/entries only) ---
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

function parseLinkHref(xml: string): string | undefined {
  const m = xml.match(/<link[^>]*?href=["']([^"']+)["'][^>]*?/i);
  return m?.[1]?.trim();
}

function parseZennXml(xml: string, link: string): ZennFeed {
  const rssItems = parseTag(xml, "item");
  const atomEntries = rssItems.length === 0 ? parseTag(xml, "entry") : [];
  const blocks = rssItems.length > 0 ? rssItems : atomEntries;

  const items: ZennFeedItem[] = blocks.map((block) => {
    const [title] = parseTag(block, "title");
    const [rssLink] = parseTag(block, "link");
    const linkHref = parseLinkHref(block);
    const [description] = parseTag(block, "description");
    const [summary] = parseTag(block, "summary");
    const [pubDate] = parseTag(block, "pubDate");
    const [updated] = parseTag(block, "updated");
    const [published] = parseTag(block, "published");
    const [guid] = parseTag(block, "guid");
    const [id] = parseTag(block, "id");

    const linkVal = (rssLink || linkHref || "").trim();
    const when = (pubDate || published || updated || "").trim();
    const desc = description || summary;

    return {
      id: (guid || id || linkVal) ?? undefined,
      title: unescapeHtml(title ?? ""),
      link: linkVal,
      description: desc ? unescapeHtml(desc) : undefined,
      pubDate: when || undefined,
    } satisfies ZennFeedItem;
  });
  return { title: "zenn", link, items };
}
