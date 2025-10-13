/**
 * データ取得メインスクリプト（雛形）。
 * - 目的: ビルド前に外部データを取得し、`src/data/*.json` に保存する。
 * - 現状: 依存モジュールのスタブと実行フローの骨組みのみ。実データ取得は未実装。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createGistClient } from "@/lib/clients/gist";
import { createZennClient } from "@/lib/clients/zenn";
import { normalizeGist, normalizeZenn } from "@/lib/adapters/normalize";
import type { KnowledgeEntry } from "@/lib/types";

type Env = {
  readonly GITHUB_USERNAME?: string;
  readonly GITHUB_TOKEN?: string;
  readonly ZENN_USER?: string;
  readonly SITE_URL?: string;
};

type OutputPaths = {
  readonly entriesJson: string;
  readonly tagsJson: string;
};

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
    tagsJson: resolve(cwd, "src/data/tags.json"),
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

  // 雛形フェーズ: 出力先の存在だけ整える（空配列を確保）。
  await Promise.all([ensureFile(out.entriesJson), ensureFile(out.tagsJson)]);

  console.info("[fetch-knowledge] start");
  console.info("env.GITHUB_USERNAME=%s, env.ZENN_USER=%s", env.GITHUB_USERNAME ?? "-", env.ZENN_USER ?? "-");
  console.info("output=%o", out);

  const tasks: Promise<KnowledgeEntry[]>[] = [];
  // Gist
  if (env.GITHUB_USERNAME) {
    const gist = createGistClient({ username: env.GITHUB_USERNAME, token: env.GITHUB_TOKEN });
    tasks.push(
      gist
        .fetchUserGists()
        .then((items) => normalizeGist(items))
        .catch((e) => {
          console.warn("[fetch-knowledge] gist skipped: %s", String(e));
          return [] as KnowledgeEntry[];
        })
    );
  }
  // Zenn
  if (env.ZENN_USER) {
    const zenn = createZennClient({ user: env.ZENN_USER });
    tasks.push(
      zenn
        .fetchFeed()
        .then((feed) => normalizeZenn(feed))
        .catch((e) => {
          console.warn("[fetch-knowledge] zenn skipped: %s", String(e));
          return [] as KnowledgeEntry[];
        })
    );
  }

  const lists = await Promise.all(tasks);
  const entries = lists.flat();
  // タグ集計
  const tagSet = new Map<string, { raw: string; norm: string; count: number }>();
  for (const e of entries) {
    for (const t of e.tags) {
      const cur = tagSet.get(t.norm);
      if (cur) cur.count += 1;
      else tagSet.set(t.norm, { raw: t.raw, norm: t.norm, count: 1 });
    }
  }
  const tags = Array.from(tagSet.values())
    .sort((a, b) => b.count - a.count)
    .map(({ raw, norm }) => ({ raw, norm }));

  // 出力
  await writeFile(out.entriesJson, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  await writeFile(out.tagsJson, JSON.stringify(tags, null, 2) + "\n", "utf-8");
  console.info("[fetch-knowledge] done: entries=%d, tags=%d", entries.length, tags.length);
}

void main().catch((err) => {
  console.error("[fetch-knowledge] failed:", err);
  process.exitCode = 1;
});
