/**
 * データ取得メインスクリプト（雛形）。
 * - 目的: ビルド前に外部データを取得し、`src/data/*.json` に保存する。
 * - 現状: 依存モジュールのスタブと実行フローの骨組みのみ。実データ取得は未実装。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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

  // 次段の実装方針を表示（ログとして記録）。
  console.info("[fetch-knowledge] start");
  console.info("env.GITHUB_USERNAME=%s, env.ZENN_USER=%s", env.GITHUB_USERNAME ?? "-", env.ZENN_USER ?? "-");
  console.info("output=%o", out);
  console.info("[fetch-knowledge] TODO: gist/zenn 取得 → 正規化 → JSON 書き出し");
}

void main().catch((err) => {
  console.error("[fetch-knowledge] failed:", err);
  process.exitCode = 1;
});

