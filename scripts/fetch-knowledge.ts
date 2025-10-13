import "dotenv/config";

/**
 * データ取得メインスクリプト（雛形）。
 * - 目的: ビルド前に外部データを取得し、`src/data/*.json` に保存する。
 * - 現状: 依存モジュールのスタブと実行フローの骨組みのみ。実データ取得は未実装。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { normalizeGist, normalizeZenn } from "@/lib/adapters/normalize";
import { createGistClient } from "@/lib/clients/gist";
import { createZennClient } from "@/lib/clients/zenn";
import type { KnowledgeEntry } from "@/lib/types";
import { isISODateString } from "@/lib/types";

interface Env {
  readonly GITHUB_USERNAME?: string;
  readonly GITHUB_TOKEN?: string;
  readonly ZENN_USER?: string;
  readonly SITE_URL?: string;
}

interface OutputPaths {
  readonly entriesJson: string;
}

function readEnv(): Env {
  return {
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    ZENN_USER: process.env.ZENN_USER,
    SITE_URL: process.env.SITE_URL,
  } satisfies Env;
}

function getOutputPaths(cwd: string): OutputPaths {
  return {
    entriesJson: resolve(cwd, "src/data/entries.json"),
  } as const;
}

async function ensureFile(filePath: string, emptyJson: string = "[]"): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf-8");
  } catch {
    await writeFile(filePath, emptyJson + "\n", "utf-8");
  }
}

async function main(): Promise<void> {
  const env = readEnv();
  const out = getOutputPaths(process.cwd());
  const args = parseArgs(process.argv.slice(2));

  // 雛形フェーズ: 出力先の存在だけ整える（空配列を確保）。
  await ensureFile(out.entriesJson);

  log({ event: "start", source: args.source, force: args.force, limit: args.limit, since: args.since, out });
  if (!env.GITHUB_USERNAME && (args.source === "all" || args.source === "gist")) {
    console.warn("[fetch-knowledge] warn: GITHUB_USERNAME 未設定のため gist をスキップ");
  }
  if (!env.ZENN_USER && (args.source === "all" || args.source === "zenn")) {
    console.warn("[fetch-knowledge] warn: ZENN_USER 未設定のため zenn をスキップ");
  }

  const tasks: Promise<KnowledgeEntry[]>[] = [];
  // Gist
  if (env.GITHUB_USERNAME && (args.source === "all" || args.source === "gist")) {
    const gist = createGistClient({ username: env.GITHUB_USERNAME, token: env.GITHUB_TOKEN });
    tasks.push(
      timeIt("gist", () => gist.fetchUserGists({ limit: args.limit ?? undefined, force: args.force }))
        .then((items) => normalizeGist(items))
        .catch((e) => {
          console.warn("[fetch-knowledge] gist skipped: %s", String(e));
          return [] as KnowledgeEntry[];
        }),
    );
  }
  // Zenn
  if (env.ZENN_USER && (args.source === "all" || args.source === "zenn")) {
    const zenn = createZennClient({ user: env.ZENN_USER, includeScraps: true });
    tasks.push(
      timeIt("zenn", () => zenn.fetchFeed({ force: args.force }))
        .then((feed) => normalizeZenn(feed))
        .catch((e) => {
          console.warn("[fetch-knowledge] zenn skipped: %s", String(e));
          return [] as KnowledgeEntry[];
        }),
    );
  }

  const lists = await Promise.all(tasks);
  let entries = lists.flat();

  // すべて空（304や404の結果）なら、既存 entries.json を保持して上書きしない
  if (entries.length === 0) {
    try {
      const prevRaw = await readFile(out.entriesJson, "utf-8");
      const prev: unknown = JSON.parse(prevRaw);
      if (Array.isArray(prev) && prev.length > 0) {
        entries = prev as KnowledgeEntry[];
      }
    } catch {
      // 既存が無ければそのまま空で進む
    }
  }

  // since フィルタ
  if (args.since) {
    const sinceIso = toSinceIso(args.since);
    if (sinceIso) entries = entries.filter((e) => e.publishedAt >= sinceIso);
  }

  // slug 重複解消
  entries = ensureUniqueSlugs(entries);

  // entries の決定的ソート（publishedAt desc, id asc）
  entries.sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : a.publishedAt < b.publishedAt ? 1 : a.id.localeCompare(b.id)));

  // 出力
  await writeFile(out.entriesJson, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  log({ event: "done", entries: entries.length });
}

void main().catch((err) => {
  console.error("[fetch-knowledge] failed:", err);
  process.exitCode = 1;
});

// ---- helpers ----

function log(obj: Record<string, unknown>): void {
  console.info("[fetch-knowledge] %s", JSON.stringify(obj));
}

function parseArgs(argv: string[]): { source: "all" | "gist" | "zenn"; force: boolean; limit: number | null; since: string | null } {
  let source: "all" | "gist" | "zenn" = "all";
  let force = false;
  let limit: number | null = null;
  let since: string | null = null;
  for (const a of argv) {
    if (a.startsWith("--source=")) {
      const v = a.split("=")[1];
      if (v === "gist" || v === "zenn" || v === "all") source = v;
    } else if (a === "--force") {
      force = true;
    } else if (a.startsWith("--limit=")) {
      const n = Number(a.split("=")[1]);
      if (Number.isFinite(n) && n > 0) limit = Math.floor(n);
    } else if (a.startsWith("--since=")) {
      since = a.split("=")[1];
    }
  }
  return { source, force, limit, since };
}

function toSinceIso(value: string): string | null {
  if (isISODateString(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + "T00:00:00Z").toISOString();
  const t = Date.parse(value);
  if (Number.isFinite(t)) return new Date(t).toISOString();
  return null;
}

function ensureUniqueSlugs(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  const counter = new Map<string, number>();
  return entries.map((e) => {
    const s = e.slug as unknown as string;
    const n = counter.get(s) ?? 0;
    counter.set(s, n + 1);
    if (n === 0) return e;
    const newSlug = (s + "-" + n) as typeof e.slug;
    return { ...e, slug: newSlug };
  });
}

async function timeIt<T>(source: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    const ms = Date.now() - t0;
    log({ event: "source", source, status: "ok", ms });
    return r;
  } catch (e) {
    const ms = Date.now() - t0;
    log({ event: "source", source, status: "error", ms, message: String(e) });
    throw e;
  }
}
